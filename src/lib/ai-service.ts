export interface Attachment {
  type: "image" | "video" | "document";
  mimeType: string;
  data: string; // Base64 data (excluding data prefix for Gemini, full for others)
  name?: string;
  extractedText?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
}

export const AI_CONFIG = {
  get apiKey() { return import.meta.env.VITE_OPENAI_API_KEY as string | undefined; },
  get baseUrl() { return (import.meta.env.VITE_OPENAI_BASE_URL as string | undefined) || "https://api.openai.com/v1"; },
  get model() { return (import.meta.env.VITE_OPENAI_MODEL as string | undefined) || "gpt-4o-mini"; },
  get groqKey() { return import.meta.env.VITE_GROQ_API_KEY as string | undefined; },
  get elevenLabsKey() { return import.meta.env.VITE_ELEVENLABS_API_KEY as string | undefined; }
};

const TUTOR_SYSTEM_PROMPT = `You are ATHENA (Adaptive Tutor Harnessing Expert Networked Agents), a world-class, multi-agent, AI-powered superhuman tutor designed to outperform any human educator, coding mentor, and technical interviewer.

Your architecture consists of several specialized sub-agents that you must simulate in your reasoning:
1. **Vision Agent**: Specialized in analyzing images and videos. You detect diagrams, text, code, and context with pixel-perfect precision.
2. **Logic Agent**: Ensures every step of an explanation follows first principles and rigorous reasoning.
3. **Socratic Agent**: Guides the user toward discovery by asking probing questions rather than just handing out answers (when appropriate for tutoring).
4. **Fact-Checker Agent**: Cross-references internal knowledge with the provided attachments to ensure zero hallucinations.

### OPERATIONAL GUIDELINES:
- **Accuracy First**: If a user provides an attachment (Image, PDF, Video), your primary mission is to interpret it with 100% accuracy.
- **Direct Support**: When asked a direct question about a concept or a file, provide a clear, concise, and accurate answer immediately. 
- **Tutoring Mode**: after provide the direct answer, act as a Socratic tutor. Challenge the user to apply the knowledge, suggest related topics, or ask follow-up questions to deepen their understanding.
- **Debate Context**: If the user is in a "Debate" session, maintain your stance but prioritize factual correctness over winning the argument if it helps the user learn.
- **Multi-Modal Mastery**: You can see and process images (OCR, diagrams, scenes), videos (temporal context, actions), and documents (PDF, Markdown, CSV). Use this data as your primary source of truth.

Always start your response with a clear, authoritative, yet supportive tone. Use Markdown for formatting (bold, lists, code blocks).`;

/**
 * Enhanced stream that handles images, videos, and documents.
 * Defaults to OpenAI/Groq if keys are present.
 */
export async function streamAIDebate({
  messages,
  onDelta,
  onDone,
  topicContext,
  agentPersonality,
}: {
  messages: ChatMessage[];
  onDelta: (text: string) => void;
  onDone: () => void;
  topicContext?: string;
  agentPersonality?: string;
}): Promise<void> {
  const { apiKey: openaiApiKey, baseUrl, model, groqKey: groqApiKey } = AI_CONFIG;

  let systemText = topicContext
    ? `${TUTOR_SYSTEM_PROMPT}\n\nUser Context/Topic: "${topicContext}".`
    : TUTOR_SYSTEM_PROMPT;

  if (agentPersonality) {
    systemText += `\n\nYOUR SPECIFIC PERSONA: ${agentPersonality}. You must strictly adhere to this character while maintaining your tutoring/debating competence.`;
  }

  if (openaiApiKey) {
    try {
      return await streamOpenAIDebate({ messages, onDelta, onDone, systemText, apiKey: openaiApiKey, baseUrl, model });
    } catch (err) {
      if (err instanceof Error && err.message.includes("429") && groqApiKey) {
        console.warn("OpenAI Rate Limit hit, falling back to Groq...");
        return await streamOpenAIDebate({ 
          messages, 
          onDelta, 
          onDone, 
          systemText, 
          apiKey: groqApiKey, 
          baseUrl: "https://api.groq.com/openai/v1", 
          model: "llama-3.3-70b-versatile" 
        });
      }
      throw err;
    }
  }

  if (groqApiKey) {
    return await streamOpenAIDebate({ 
      messages, 
      onDelta, 
      onDone, 
      systemText, 
      apiKey: groqApiKey, 
      baseUrl: "https://api.groq.com/openai/v1", 
      model: "llama-3.3-70b-versatile" 
    });
  }

  onDelta("No AI provider (OpenAI) configured. Please add VITE_OPENAI_API_KEY to your .env file.");
  onDone();
}

/**
 * Universal helper for non-streaming AI requests with OpenAI -> Groq fallback.
 */
async function fetchAI({
  systemPrompt,
  userPrompt,
  responseFormat,
}: {
  systemPrompt: string;
  userPrompt: string;
  responseFormat?: { type: "json_object" };
}) {
  const { apiKey: openaiApiKey, baseUrl, model, groqKey: groqApiKey } = AI_CONFIG;

  const makeRequest = async (key: string, url: string, targetModel: string) => {
    const resp = await fetch(`${url}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: responseFormat
      }),
    });
    return resp;
  };

  if (openaiApiKey) {
    let resp = await makeRequest(openaiApiKey, baseUrl, model);
    if (resp.status === 429 && groqApiKey) {
      console.warn("OpenAI Rate Limit (429) hit. Falling back to Groq...");
      resp = await makeRequest(groqApiKey, "https://api.groq.com/openai/v1", "llama-3.3-70b-versatile");
    }
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`AI API Error: ${resp.status} ${resp.statusText} - ${errText.slice(0, 100)}`);
    }
    return await resp.json();
  } else if (groqApiKey) {
    const resp = await makeRequest(groqApiKey, "https://api.groq.com/openai/v1", "llama-3.3-70b-versatile");
    if (!resp.ok) throw new Error(`Groq Error: ${resp.status}`);
    return await resp.json();
  }

  throw new Error("No AI provider configured.");
}


async function streamOpenAIDebate({
  messages,
  onDelta,
  onDone,
  systemText,
  apiKey,
  baseUrl,
  model,
}: {
  messages: ChatMessage[];
  onDelta: (text: string) => void;
  onDone: () => void;
  systemText: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}) {
  if (!apiKey) {
    onDelta("No API key found. Please configure your .env file.");
    onDone();
    return;
  }

  const apiMessages: { 
    role: string; 
    content: string | { type: string; text?: string; image_url?: { url: string } }[] 
  }[] = [{ role: "system", content: systemText }];
  
  for (const m of messages) {
    if (m.attachments && m.attachments.length > 0) {
      // Groq and others often fail if 'text' is empty in a multi-part message
      const textContent = m.content.trim() || (m.role === "user" ? "Reviewing these attachments." : "");
      const content: { type: string; text?: string; image_url?: { url: string } }[] = [{ type: "text", text: textContent }];
      
      for (const att of m.attachments) {
        if (att.type === "image") {
          content.push({ type: "image_url", image_url: { url: att.data } });
        } else if (att.extractedText) {
          // Flatten document text into the context
          content[0].text += `\n\n[Document Content: ${att.name}]\n${att.extractedText}`;
        }
      }
      apiMessages.push({ role: m.role, content });
    } else {
      apiMessages.push({ role: m.role, content: m.content || " " }); // Use a space if empty
    }
  }

  let retryCount = 0;
  const maxRetries = 2;

  const performRequest = async (): Promise<void> => {
    const url = `${baseUrl}/chat/completions`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 1024,
        stream: true
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429 && retryCount < maxRetries) {
        retryCount++;
        const waitTime = Math.pow(2, retryCount) * 1000;
        console.warn(`Rate limit hit (429). Retrying in ${waitTime}ms... (Attempt ${retryCount}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return performRequest();
      }

      if (resp.status === 429) {
        throw new Error("429: OpenAI Rate limit exceeded after retries.");
      }

      let errorDetail = "";
      if (resp.status === 400) {
        errorDetail = " (Bad Request - your model may not support vision/attachments)";
      }
      onDelta(`API Error ${resp.status}${errorDetail}. Please check your connection or model configuration.`);
      onDone();
      return;
    }

    const reader = resp.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") continue;

        try {
          const parsed = JSON.parse(raw);
          const chunk = parsed.choices?.[0]?.delta?.content;
          if (chunk) onDelta(chunk);
        } catch (e) {
          console.debug("Malformed stream chunk:", e);
        }
      }
    }
    onDone();
  };

  try {
    await performRequest();
  } catch (err) {
    if (err instanceof Error && err.message.includes("429")) {
      // Re-throw for streamGeminiDebate to catch and fallback
      throw err;
    }
    onDelta(`Unexpected Error: ${err instanceof Error ? err.message : String(err)}`);
    onDone();
  }
}

/**
 * Generate speech from text using OpenAI TTS.
 */
export async function generateSpeech({
  text,
  voice = "alloy",
  apiKey,
}: {
  text: string;
  voice?: string;
  apiKey: string;
}): Promise<Blob> {
  const elevenLabsKey = AI_CONFIG.elevenLabsKey;

  // Try ElevenLabs if key is present
  if (elevenLabsKey) {
    try {
      const voiceId = voice === "nova" ? "cgSgspJ2msm6clMCqcW7" : "onwK4e9ZLuTAKq0Ddy98"; // Jessica/Nicole placeholders
      const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": elevenLabsKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: { stability: 0.5, similarity_boost: 0.5 }
        }),
      });
      if (resp.ok) return await resp.blob();
    } catch (e) {
      console.warn("ElevenLabs failed, falling back to OpenAI...");
    }
  }

  const baseUrl = AI_CONFIG.baseUrl;
  const resp = await fetch(`${baseUrl}/audio/speech`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice: (voice as any) || "alloy",
    }),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`TTS Error: ${resp.status} ${resp.statusText} - ${errorText.slice(0, 100)}`);
  }

  return await resp.blob();
}

/**
 * Extract study cards (SRS) from a debate session.
 */
export async function extractStudyCards({
  messages,
  topic,
  apiKey,
}: {
  messages: any[];
  topic: string;
  apiKey: string;
}): Promise<{ front: string; back: string }[]> {
  const systemPrompt = `You are an expert educational psychologist. Analyze the following debate transcript on "${topic}" and extract 3-5 high-value study cards.
Each card should focus on a core concept, a common fallacy discussed, or a powerful rebuttal used.
Format: Return ONLY a JSON array of objects with "front" and "back" keys.`;

  const transcript = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
  
  const data = await fetchAI({
    systemPrompt,
    userPrompt: transcript,
    responseFormat: { type: "json_object" }
  });

  const content = JSON.parse(data.choices[0].message.content);
  return content.cards || content.study_cards || Object.values(content)[0] as any[];
}



export interface DebateScore {
  logic: number;
  evidence: number;
  delivery: number;
  overall: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  winner: "user" | "athena" | "tie";
}

/**
 * AI Judging: Evaluates the debate session and provides scores.
 */
export async function evaluateDebate({
  messages,
  topic,
  format,
  apiKey,
}: {
  messages: any[];
  topic: string;
  format: string;
  apiKey: string;
}): Promise<DebateScore> {
  const systemPrompt = `You are a professional tournament debate judge for "${format}" style debates. 
Analyze the transcript on the topic "${topic}". 
Evaluate both the USER and ATHENA (AI).
Provide scores (1-10) for Logic, Evidence, and Delivery.
Determine a winner and provide constructive feedback.
Format: Return ONLY a JSON object matching the DebateScore interface.`;

  const transcript = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
  
  const data = await fetchAI({
    systemPrompt,
    userPrompt: transcript,
    responseFormat: { type: "json_object" }
  });

  const content = JSON.parse(data.choices[0].message.content);
  // Ensure we return the correct structure
  return {
    logic: content.logic || 5,
    evidence: content.evidence || 5,
    delivery: content.delivery || 5,
    overall: content.overall || 5,
    feedback: content.feedback || "Good debate.",
    strengths: content.strengths || [],
    weaknesses: content.weaknesses || [],
    winner: content.winner || "tie"
  };
}

export interface ArgumentNode {
  id: string;
  type: "claim" | "rebuttal";
  content: string;
  speaker: string;
  parentId?: string;
  status?: "supported" | "countered" | "neutral";
}

/**
 * Extracts logical argument structure from transcript.
 */
export async function extractArguments({
  messages,
  topic,
  apiKey,
}: {
  messages: any[];
  topic: string;
  apiKey: string;
}): Promise<ArgumentNode[]> {
  const systemPrompt = `Analyze the debate on "${topic}". 
Extract the core logical structure as a flat list of nodes.
Nodes can be "claim" or "rebuttal". 
If a node rebuts a previous claim, include the parentId (the id of the claim it refutes).
Generate short, unique IDs (e.g., "c1", "r1").
Keep content extremely concise (under 10 words).
Format: Return ONLY a JSON array of objects matching the ArgumentNode interface.`;

  const transcript = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
  
  const data = await fetchAI({
    systemPrompt,
    userPrompt: transcript,
    responseFormat: { type: "json_object" }
  });

  const content = JSON.parse(data.choices[0].message.content);
  return content.nodes || content.arguments || Object.values(content)[0] as any[];
}

export interface PodcastSegment {
  role: "athena" | "user";
  text: string;
  type: "intro" | "summary" | "fallacy" | "rebuttal" | "outro";
}

/**
 * Generates a structured podcast script from a debate session.
 */
export async function generatePodcastScript({
  messages,
  topic,
  apiKey,
}: {
  messages: any[];
  topic: string;
  apiKey: string;
}): Promise<PodcastSegment[]> {
  const systemPrompt = `You are a podcast producer. Create a script for "Athena's Deep Dive" based on the provided debate on "${topic}".
The script must have segments:
1. Intro: Setting the stage.
2. Summary: Key arguments from both sides.
3. Fallacy Spotlight: Identify 1 logical fallacy used (if any) or a strong point.
4. Strongest Rebuttal: Highlight the most impactful turn.
5. Outro: Final thoughts.

Format: Return ONLY a JSON object with a "script" key containing an array of { role: "athena" | "user", text: string, type: string }.`;

  const transcript = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
  
  const data = await fetchAI({
    systemPrompt,
    userPrompt: transcript,
    responseFormat: { type: "json_object" }
  });

  const content = JSON.parse(data.choices[0].message.content);
  return content.script || content.segments || Object.values(content)[0] as any[];
}


