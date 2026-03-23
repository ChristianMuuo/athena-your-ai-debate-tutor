import { generateSpeech, generatePodcastScript as aiGeneratePodcastScript, type PodcastSegment } from "./ai-service";
import { supabase } from "@/integrations/supabase/client";

export { type PodcastSegment };

export class PodcastService {
  private static ATHENA_VOICE: "nova" = "nova";
  private static USER_VOICE: "onyx" = "onyx";
  private static JINGLE_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"; // Placeholder

  static async generatePodcastScript(messages: any[], topic: string, apiKey: string): Promise<PodcastSegment[]> {
    return await aiGeneratePodcastScript({ messages, topic, apiKey });
  }

  static async createPodcastMP3(segments: PodcastSegment[], apiKey: string): Promise<Blob> {
    const blobs: Blob[] = [];
    
    // Intro Sting
    try {
      const stingResp = await fetch(this.JINGLE_URL);
      if (stingResp.ok) {
        const sting = await stingResp.blob();
        blobs.push(sting);
      }
    } catch (e) { 
      console.warn("Failed to fetch sting, skipping."); 
    }

    // Group segments by role to minimize switches
    // Actually, to keep flow, we'll just batch up to the 4096 char limit
    let currentText = "";
    let currentRole: "athena" | "user" = segments[0]?.role || "athena";

    const flush = async () => {
      if (!currentText) return;
      try {
        const voice = currentRole === "athena" ? this.ATHENA_VOICE : this.USER_VOICE;
        const blob = await generateSpeech({ text: currentText, voice, apiKey });
        blobs.push(blob);
      } catch (err) {
        console.error("TTS Batch failure:", err);
      }
      currentText = "";
    };

    for (const segment of segments) {
      if (segment.role !== currentRole || (currentText.length + segment.text.length) > 4000) {
        await flush();
        currentRole = segment.role;
      }
      currentText += segment.text + " ";
    }
    await flush();

    if (blobs.length === 0) {
      throw new Error("No audio generated. Please check your OpenAI credits or connection.");
    }

    return new Blob(blobs, { type: "audio/mpeg" });
  }

  static async createUnlimitedMP3(segments: PodcastSegment[]): Promise<Blob> {
    const blobs: Blob[] = [];
    
    // Intro Sting
    try {
      const stingResp = await fetch(this.JINGLE_URL);
      if (stingResp.ok) {
        const sting = await stingResp.blob();
        blobs.push(sting);
      }
    } catch (e) { 
      console.warn("Failed to fetch sting, skipping."); 
    }

    for (const segment of segments) {
      try {
        // Break into smaller chunks because Google Translate TTS has a 200 char limit
        const chunks = this.splitText(segment.text, 180);
        for (const chunk of chunks) {
          const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=en&client=tw-ob`;
          // Use AllOrigins to bypass CORS - it returns a JSON with base64 data
          const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
          const resp = await fetch(proxyUrl);
          if (resp.ok) {
            const data = await resp.json();
            if (data.contents) {
              // Convert base64 back to blob
              const b64Data = data.contents.split(',')[1] || data.contents;
              const byteCharacters = atob(b64Data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              blobs.push(new Blob([byteArray], { type: "audio/mpeg" }));
            }
          }
        }
      } catch (err) {
        console.error("Unlimited TTS Error:", err);
      }
    }

    if (blobs.length === 0) {
      throw new Error("Failed to generate unlimited audio.");
    }

    return new Blob(blobs, { type: "audio/mpeg" });
  }

  private static splitText(text: string, maxLength: number): string[] {
    const words = text.split(" ");
    const chunks: string[] = [];
    let current = "";
    for (const word of words) {
      if ((current.length + word.length + 1) > maxLength) {
        chunks.push(current);
        current = word;
      } else {
        current = current ? `${current} ${word}` : word;
      }
    }
    if (current) chunks.push(current);
    return chunks;
  }

  static async uploadPodcast(id: string, blob: Blob): Promise<string | null> {
    const fileName = `podcast_${id}_${Date.now()}.mp3`;
    const { data, error } = await (supabase as any).storage
      .from("podcasts")
      .upload(fileName, blob);

    if (error) {
      console.error("Storage upload error:", error);
      return null;
    }

    const { data: { publicUrl } } = (supabase as any).storage
      .from("podcasts")
      .getPublicUrl(fileName);

    return publicUrl;
  }

  static generateShowNotes(messages: any[], topic: string): string {
    const date = new Date().toLocaleDateString();
    let markdown = `# ATHENA Debate Recap: ${topic}\n`;
    markdown += `*Generated on ${date}*\n\n`;
    markdown += `## Executive Summary\n`;
    markdown += `This session explored the nuances of "${topic}", featuring a Socratic exploration led by Athena.\n\n`;
    markdown += `## Key Arguments\n`;
    
    messages.forEach((m, i) => {
      const role = m.role === "assistant" ? "Athena" : "User";
      markdown += `### [${i + 1}] ${role}\n${m.content}\n\n`;
    });

    markdown += `## Chapters\n`;
    markdown += `- 00:00 Intro\n`;
    markdown += `- 00:15 Executive Summary\n`;
    markdown += `- 01:00 Fallacy Spotlight\n`;
    markdown += `- 02:30 Deep Dive Rebuttal\n`;
    markdown += `- 04:00 Closing Thoughts\n\n`;

    markdown += `---\n*Powered by ATHENA - Your AI Debate Tutor*`;
    return markdown;
  }

  static getCleanScriptText(segments: PodcastSegment[]): string {
    return segments.map(s => {
      const label = s.role === "athena" ? "Athena:" : "User:";
      return `${label} ${s.text}`;
    }).join("\n\n");
  }
}
