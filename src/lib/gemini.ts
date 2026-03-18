/**
 * Direct frontend Gemini API integration.
 * Used as a fallback when the Supabase Edge Function is unavailable.
 *
 * Set VITE_GEMINI_API_KEY in your .env file.
 * Get a key at: https://aistudio.google.com/app/apikey
 */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  imageData?: string; // Base64 data url
}

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

/**
 * Stream a debate response directly from the Gemini API.
 * Calls onDelta with each text chunk and onDone when complete.
 */
export async function streamGeminiDebate({
  messages,
  onDelta,
  onDone,
  topicContext,
}: {
  messages: ChatMessage[];
  onDelta: (text: string) => void;
  onDone: () => void;
  topicContext?: string;
}): Promise<void> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error(
      "No VITE_GEMINI_API_KEY found. Please add it to your .env file."
    );
  }

  const systemText = topicContext
    ? `${TUTOR_SYSTEM_PROMPT}\n\nUser Context/Topic: "${topicContext}". Remember to stay in character.`
    : TUTOR_SYSTEM_PROMPT;

  // Convert to Gemini content format
  const contents = messages.map((m) => {
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [{ text: m.content }];
    
    if (m.imageData) {
      // Parse data URL: data:image/png;base64,iVBORw0KGgo...
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

  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemText }] },
      contents,
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 250,
      },
    }),
  });

  if (!resp.ok || !resp.body) {
    if (resp.status === 429) throw new Error("Rate limited — please try again shortly.");
    if (resp.status === 400) throw new Error("Invalid request. Check your Gemini API key.");
    throw new Error(`Gemini API error: ${resp.status}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

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
        if (text) onDelta(text);
      } catch {
        /* skip malformed chunks */
      }
    }
  }

  onDone();
}
