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

const TUTOR_SYSTEM_PROMPT = `You are ATHENA (Adaptive Tutor Harnessing Expert Networked Agents), a world-class, multi-agent, AI-powered superhuman tutor designed to outperform any human educator, coding mentor, and technical interviewer... (rest of the prompt remains the same)`;

/**
 * Enhanced stream that handles images, videos, and documents.
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
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  const baseUrl = (import.meta.env.VITE_OPENAI_BASE_URL as string | undefined) || "https://api.openai.com/v1";
  const model = (import.meta.env.VITE_OPENAI_MODEL as string | undefined) || "gpt-4o-mini";

  const systemText = topicContext
    ? `${TUTOR_SYSTEM_PROMPT}\n\nUser Context/Topic: "${topicContext}". Remember to stay in character.`
    : TUTOR_SYSTEM_PROMPT;

  // 1. Determine requirements
  const hasVideoOrDoc = messages.some(m => 
    m.attachments?.some(a => a.type === "video" || a.type === "document")
  );
  
  // 2. Intelligent Routing
  // - If we have video/docs, we MUST use Native Gemini (Groq doesn't support these yet)
  // - If we only have images/text, we prefer the OpenAI-compatible provider (Groq) if a key is present
  
  if (hasVideoOrDoc) {
    if (geminiApiKey) {
      return streamNativeGemini({ messages, onDelta, onDone, systemText, apiKey: geminiApiKey });
    } else {
      onDelta("Video and Document analysis requires a Google Gemini API key. Please add VITE_GEMINI_API_KEY to your .env file.");
      onDone();
      return;
    }
  }

  // For images and text, use OpenAI/Groq if key is available, else fallback to Gemini
  if (openaiApiKey) {
    return streamOpenAIDebate({ messages, onDelta, onDone, systemText, apiKey: openaiApiKey, baseUrl, model });
  } else if (geminiApiKey) {
    return streamNativeGemini({ messages, onDelta, onDone, systemText, apiKey: geminiApiKey });
  }

  onDelta("No AI provider configured. Please add VITE_GEMINI_API_KEY or VITE_OPENAI_API_KEY to your .env file.");
  onDone();
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
      temperature: 0.85,
      stream: true
    }),
  });

  if (!resp.ok) {
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
        // skip malformed chunks
        console.debug("Malformed stream chunk:", e);
      }
    }
  }
  onDone();
}

/**
 * Real Native Gemini 1.5/2.0 streaming (required for Video/File understanding).
 */
async function streamNativeGemini({
  messages,
  onDelta,
  onDone,
  systemText,
  apiKey,
}: {
  messages: ChatMessage[];
  onDelta: (text: string) => void;
  onDone: () => void;
  systemText: string;
  apiKey: string;
}) {
  const model = "gemini-1.5-flash"; // or gemini-2.0-flash-exp
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const contents = messages.map(m => {
    const parts: { text?: string; inline_data?: { mime_type: string; data: string } }[] = [{ text: m.content }];
    if (m.attachments) {
      for (const att of m.attachments) {
        if (att.type === "image" || att.type === "video") {
          // Gemini expects base64 without the data:mime prefix in the data field
          const base64Data = att.data.includes("base64,") ? att.data.split("base64,")[1] : att.data;
          parts.push({
            inline_data: {
              mime_type: att.mimeType,
              data: base64Data
            }
          });
        } else if (att.extractedText) {
          parts[0].text += `\n\n[Document: ${att.name}]\n${att.extractedText}`;
        }
      }
    }
    return { role: m.role === "assistant" ? "model" : "user", parts };
  });

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      system_instruction: { parts: [{ text: systemText }] },
      generationConfig: { temperature: 0.9, maxOutputTokens: 1000 }
    }),
  });

  if (!resp.ok) {
    onDelta(`Gemini API Error ${resp.status}. Please verify your Gemini key.`);
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
      try {
        const parsed = JSON.parse(line.slice(6));
        const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (chunk) onDelta(chunk);
      } catch (e) {
        console.debug("Malformed Gemini stream chunk:", e);
      }
    }
  }
  onDone();
}
