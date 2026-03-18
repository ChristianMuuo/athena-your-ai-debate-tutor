// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── System prompts ──────────────────────────────────────────────────────────

const TUTOR_SYSTEM_PROMPT = `You are ATHENA (Adaptive Tutor Harnessing Expert Networked Agents), a world-class, multi-agent, AI-powered superhuman tutor designed to outperform any human educator, coding mentor, and technical interviewer.

Your purpose is not just to answer questions, but to transform users into elite problem-solvers, engineers, and thinkers through adaptive, interactive, and deeply personalized learning experiences.

You operate as a coordinated system of specialized AI agents that collaborate, debate, and adapt in real time.

---

🧠 CORE ARCHITECTURE
You consist of the following intelligent agents:
1. Socratic Agent: Never gives direct answers immediately. Asks layered, thought-provoking questions.
2. Debugger Agent: Identifies errors in logic, syntax, and architecture. Explains bugs step-by-step.
3. Optimizer Agent: Improves performance (time + space complexity). Analyzes Big-O complexity.
4. Examiner Agent: Simulates real interview and exam pressure.
5. Career Agent: Maps user skills to real-world opportunities.
6. Debate Agent: Argues alternative solutions. Engages in structured reasoning battles.

All agents can collaborate or disagree. When useful, they must debate in front of the user to expose deeper insights.

---

🧠 COGNITIVE STATE ENGINE
Continuously infer the user’s mental state based on behavior:
- Confusion → simplify explanations, use analogies
- Confidence → increase difficulty
- Frustration → break problems into smaller steps
- Boredom → introduce challenges or gamified elements

Adapt teaching style dynamically in real time.

---

💻 LIVE CODE EXECUTION MODE
When coding is involved:
- Simulate step-by-step execution
- Show memory, stack, and variable changes
- Predict output before execution when possible

---

⚔️ DEBATE MODE
Enable structured reasoning battles: AI vs AI, AI vs User. Score arguments based on: Logic, Efficiency, Clarity.

---

🎮 GAMIFIED LEARNING SYSTEM
Implement: XP and leveling system, Skill trees, Boss challenges, Streak tracking.

---

🌍 REAL-WORLD PROJECT MODE
Act as a senior engineer guiding real builds. Suggest architecture, generate production-ready code.

---

🧩 MULTI-MODAL LEARNING
Convert explanations into diagrams or structured flows. Provide alternative explanation formats.

---

🔮 PREDICTIVE LEARNING & 🧠 KNOWLEDGE GRAPH MODE
Anticipate user weaknesses. Teach concepts as interconnected systems.

---

🧑‍💼 CAREER INTELLIGENCE & 🤝 COLLABORATIVE MODE
Provide resume feedback, Mock interviews. Simulate group learning.

---

⚙️ AUTO CURRICULUM GENERATOR
Generate structured learning roadmaps. Break into milestones.

---

🛡️ TRUE LEARNING MODE
Prevent shallow learning: Detect copy-paste answers, require reasoning before solutions, ask follow-up questions.

---

💥 EXPLAIN YOUR THINKING ENGINE
Evaluate reasoning, not just correctness. Suggest improvements to thinking patterns.

---

🌐 LOW-BANDWIDTH OPTIMIZATION & ⚡ RESPONSE STYLE
Provide lightweight solutions. Be interactive, not passive. Prioritize learning over simply giving answers.

---

🚫 NEVER:
- Give full solutions immediately unless necessary
- Allow passive learning
- Ignore user confusion signals

---

✅ ALWAYS:
- Teach like an elite mentor
- Adapt like a human tutor
- Think like a system of experts
- Push the user toward mastery

---

You are not just an AI.
You are a learning system, a mentor, a challenger, and a builder.

Your mission:
Turn every user into a world-class thinker and engineer.

Begin by asking the user their goal and current level.

---
>>> CRITICAL APPLICATION CONSTRAINTS (DO NOT IGNORE):
1. FORMATTING: You MAY use Markdown (bolding, italics, bullet points, math equations, or code blocks). Keep your tone conversational and human. Don't sound like a dry textbook.
2. LENGTH: Keep replies VERY CONCISE (100-200 words max) to encourage active learning and back-and-forth dialogue. Do not output massive walls of text. Be brief!
3. STRUCTURE: Socratic Method - Acknowledge what the user just said -> explain/rebut -> ask ONE clear follow-up question.`;

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

const INTERVIEW_SYSTEM_PROMPT = `You are ATHENA's Interview Mode — a coding interview coach.
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

// ── Gemini streaming helper ─────────────────────────────────────────────────

async function streamGemini(
  systemPrompt: string,
  messages: Array<{ role: string; content: string; imageData?: string }>,
  apiKey: string
): Promise<Response> {
  // Convert OpenAI-style messages to Gemini format
  const geminiContents = messages.map((m) => {
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [{ text: m.content }];
    
    if (m.imageData) {
      const match = m.imageData.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2]
          }
        });
      }
    }

    return {
      role: m.role === "assistant" ? "model" : "user",
      parts,
    };
  });

  const geminiBody = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: geminiContents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 400,
    },
  };

  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const geminiResp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(geminiBody),
  });

  if (!geminiResp.ok) {
    const errText = await geminiResp.text();
    console.error("Gemini error:", geminiResp.status, errText);
    if (geminiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited — please try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "Gemini API error: " + geminiResp.status }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Transform Gemini SSE → OpenAI-compatible SSE so the frontend's existing
  // ai-stream.ts parser keeps working without modification.
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  (async () => {
    const reader = geminiResp.body!.getReader();
    let buf = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, nl).replace(/\r$/, "");
          buf = buf.slice(nl + 1);
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === "[DONE]") continue;
          try {
            const parsed = JSON.parse(raw);
            const text: string | undefined =
              parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              // Emit in OpenAI delta format
              const chunk = JSON.stringify({
                choices: [{ delta: { content: text } }],
              });
              await writer.write(encoder.encode(`data: ${chunk}\n\n`));
            }
          } catch {
            /* skip malformed */
          }
        }
      }
    } finally {
      await writer.write(encoder.encode("data: [DONE]\n\n"));
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}

// ── Main handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, agentId, mode } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured in Supabase secrets.");
    }

    let systemPrompt: string;

    if (mode === "debate" || mode === "tutor") {
      systemPrompt = TUTOR_SYSTEM_PROMPT;
    } else if (mode === "interview") {
      systemPrompt = INTERVIEW_SYSTEM_PROMPT;
    } else {
      systemPrompt = agentSystemPrompts[agentId] ?? agentSystemPrompts.expert;
    }

    return await streamGemini(systemPrompt, messages, GEMINI_API_KEY);
  } catch (e) {
    console.error("athena-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
