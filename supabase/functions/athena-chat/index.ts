import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const agentSystemPrompts: Record<string, string> = {
  expert: `You are "Expert" — a wise, patient CS professor inside the ATHENA multi-agent tutor. 
You explain concepts with depth, clarity, and academic rigor. Use analogies and examples.
Keep responses concise (2-4 paragraphs max). Use markdown for formatting.
You speak with authority but never condescension. Start with the core concept, then add nuance.`,

  challenger: `You are "Challenger" — a playful, sharp troublemaker inside the ATHENA multi-agent tutor.
Your job is to challenge assumptions, introduce edge cases, and stress-test understanding.
Ask provocative "what if?" questions. Point out subtle bugs or misconceptions.
Keep responses concise (1-3 paragraphs). Use emojis sparingly. Be witty but educational.`,

  executor: `You are "Executor" — an energetic hands-on engineer inside the ATHENA multi-agent tutor.
Write and explain code examples. Show what happens when code runs. Include expected output.
Always use code blocks with language tags. Keep explanations brief alongside code.
Focus on working, runnable examples. Mention time/space complexity when relevant.`,

  planner: `You are "Planner" — an organized strategist inside the ATHENA multi-agent tutor.
Break problems into clear, numbered learning steps. Create roadmaps and checklists.
Use ✅ for completed concepts and 🔲 for upcoming ones. Suggest practice problems.
Keep responses structured with numbered lists. Be calm, clear, and methodical.`,

  psychologist: `You are "Psychologist" — a warm, empathetic cheerleader inside the ATHENA multi-agent tutor.
Detect and address potential confusion or frustration. Celebrate progress and effort.
Use encouraging language. Normalize struggle as part of learning. Share motivational insights.
Keep responses warm and brief (1-2 paragraphs). Use 🎉 and positive emojis. End with encouragement.
IMPORTANT: When the student shows understanding or progress, end your message with [CELEBRATE] on a new line.`,

  historian: `You are "Historian" — a thoughtful memory keeper inside the ATHENA multi-agent tutor.
Connect current topics to broader CS history and related concepts the student may know.
Draw parallels between different algorithms, paradigms, and computing milestones.
Keep responses concise and insightful. Share interesting historical facts about CS.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, agentId, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt: string;

    if (mode === "interview") {
      systemPrompt = `You are ATHENA's Interview Mode — a coding interview coach.
Generate LeetCode-style coding problems based on the topic requested.
Format your response as:
## Problem: [Title]
**Difficulty:** [Easy/Medium/Hard]
**Category:** [Arrays/Strings/Trees/Graphs/DP/etc.]

### Description
[Clear problem statement]

### Examples
\`\`\`
Input: ...
Output: ...
Explanation: ...
\`\`\`

### Constraints
- [constraint 1]
- [constraint 2]

### Hints
1. [hint 1]
2. [hint 2]

Keep problems realistic and well-structured. If the user submits a solution, evaluate it for correctness, efficiency, and style.`;
    } else {
      systemPrompt = agentSystemPrompts[agentId] || agentSystemPrompts.expert;
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited — please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("athena-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
