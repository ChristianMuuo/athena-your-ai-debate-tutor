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
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  const baseUrl = (import.meta.env.VITE_OPENAI_BASE_URL as string | undefined) || "https://api.openai.com/v1";
  const model = (import.meta.env.VITE_OPENAI_MODEL as string | undefined) || "gpt-4o-mini";

  if (!apiKey) {
    const errorMsg = "No `VITE_OPENAI_API_KEY` was found in `.env`! You switched to the OpenAI format. Please grab an API key from OpenAI, Groq, or OpenRouter and add it to your `.env` file! This is a mock response so the UI doesn't crash.";
    console.warn("No VITE_OPENAI_API_KEY found. Falling back to mock response.");
    const words = errorMsg.split(" ");
    for (const word of words) {
      onDelta(word + " ");
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    onDone();
    return;
  }

  const systemText = topicContext
    ? `${TUTOR_SYSTEM_PROMPT}\n\nUser Context/Topic: "${topicContext}". Remember to stay in character.`
    : TUTOR_SYSTEM_PROMPT;

  // Convert to OpenAI content format
  const apiMessages: any[] = [{ role: "system", content: systemText }];
  
  for (const m of messages) {
    if (m.imageData) {
      apiMessages.push({
        role: m.role,
        content: [
          { type: "text", text: m.content },
          { type: "image_url", image_url: { url: m.imageData } }
        ]
      });
    } else {
      apiMessages.push({ role: m.role, content: m.content });
    }
  }

  const url = `${baseUrl}/chat/completions`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: apiMessages,
      temperature: 0.85,
      max_tokens: 250,
      stream: true
    }),
  });

  if (!resp.ok || !resp.body) {
    const errorMsg = `API Error ${resp.status}. Please verify your API key and billing status! This is a fallback mock response.`;
    console.warn(`API Error: ${resp.status}. Falling back to mock response.`);
    const words = errorMsg.split(" ");
    for (const word of words) {
      onDelta(word + " ");
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    onDone();
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === "[DONE]") continue;
      
      try {
        const parsed = JSON.parse(raw);
        const text: string | undefined = parsed?.choices?.[0]?.delta?.content;
        if (text) onDelta(text);
      } catch {
        // skip malformed chunks
      }
    }
  }

  onDone();
}
