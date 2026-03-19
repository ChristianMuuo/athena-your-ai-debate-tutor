import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Save, Loader2, Send, Paperclip, X, FileText, Film, Image as ImageIcon } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DebateChat, type DebateMessage, type Attachment } from "@/components/DebateChat";
import { VoiceButton } from "@/components/VoiceButton";
import { useVoice } from "@/hooks/useVoice";
import { useAuth } from "@/hooks/useAuth";
import { useDebateHistory } from "@/hooks/useDebateHistory";
import { streamGeminiDebate } from "@/lib/gemini";
import { useXP } from "@/hooks/useXP";
import { XPBar } from "@/components/XPBar";
import { toast } from "sonner";
import { extractTextFromFile, getFileIcon } from "@/lib/fileParser";

const MAX_CONTEXT_TURNS = 6; // keep last 6 messages for context

export default function Debate() {
  const [searchParams] = useSearchParams();
  const topicParam = searchParams.get("topic") ?? "Should homework be banned?";
  const continueSessionId = searchParams.get("continueSession");

  const [messages, setMessages] = useState<DebateMessage[]>([{
    id: "welcome-msg",
    role: "assistant",
    content: "Hi! I'm Athena, your debate and learning buddy. Ready to sharpen those thinking skills? What's on your mind today — a debate topic, a tricky concept, or something you're stuck on?",
    timestamp: new Date()
  }]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const { saving, saveSession, loadSessions, sessions } = useDebateHistory();
  const { addXp } = useXP();

  // Preload messages when continuing a saved session
  useEffect(() => {
    if (!continueSessionId) return;
    const tryLoad = async () => {
      await loadSessions("");
    };
    tryLoad();
  }, [continueSessionId, loadSessions]);

  useEffect(() => {
    if (!continueSessionId || sessions.length === 0) return;
    const saved = sessions.find((s) => s.id === continueSessionId);
    if (!saved) return;
    const hydrated: DebateMessage[] = saved.messages.map((m) => ({
      id: crypto.randomUUID(),
      role: m.role as "user" | "assistant",
      content: m.content,
      attachments: (m as any).attachments || [],
      timestamp: new Date(m.timestamp),
    }));
    setMessages(hydrated);
    setSaved(true); // already saved — prevent re-saving immediately
  }, [continueSessionId, sessions]);

  // Voice hook — auto-fill input & submit when speech ends
  const { isListening, isSpeaking, isSupported, interimTranscript, startListening, stopListening, speak, cancelSpeech } =
    useVoice({
      onTranscript: (text) => {
        setInput(text);
        // Small delay so user can see transcript before it sends
        setTimeout(() => sendMessage(text), 300);
      },
    });
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed && attachments.length === 0 || isStreaming) return;

      // Cancel any ongoing speech
      cancelSpeech();
      setInput("");

      const userMsg: DebateMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        attachments: [...attachments],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      const currentAttachments = [...attachments];
      setAttachments([]);

      // Placeholder for streaming assistant message
      const assistantId = crypto.randomUUID();
      const assistantMsg: DebateMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Build context (last N turns)
      const allMsgs = [...messages, userMsg];
      const contextWindow = allMsgs.slice(-MAX_CONTEXT_TURNS);
      const apiMessages = contextWindow.map((m) => ({
        role: m.role,
        content: m.content,
        // Only include attachments for the user's latest message if applicable (or if we want context)
        attachments: m.attachments
      }));

      let fullContent = "";

      try {
        await streamGeminiDebate({
          messages: apiMessages,
          topicContext: topicParam,
          onDelta: (chunk) => {
            fullContent += chunk;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent } : m))
            );
          },
          onDone: () => {
            setIsStreaming(false);
            setSaved(false);
            addXp(15); // Award XP for every successful debate turn!
            // Auto-speak the response
            if (fullContent) speak(fullContent);
          },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "AI request failed";
        toast.error(msg);
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        setIsStreaming(false);
      }
    },
    [isStreaming, messages, topicParam, cancelSpeech, speak, attachments, addXp]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleMicToggle = () => {
    if (!isSupported) {
      toast.error("Voice input is not supported in this browser. Please use Chrome.");
      return;
    }
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const type = getFileIcon(file.type) as Attachment["type"];
      const extractedText = await extractTextFromFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result as string;
        setAttachments(prev => [...prev, {
          type,
          mimeType: file.type,
          data,
          name: file.name,
          extractedText
        }]);
      };
      
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error("Failed to process file.");
    }
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("Sign in to save your debate history.");
      return;
    }
    if (messages.length < 2) {
      toast.error("Debate too short — exchange at least one message first.");
      return;
    }

    const historyMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp.toISOString(),
      attachments: m.attachments
    }));

    const id = await saveSession(topicParam, historyMessages);
    if (id) {
      setSaved(true);
      toast.success("Debate saved to your history!");
    } else {
      toast.error("Could not save debate. Please check your connection and try again.");
    }
  };

  const turnCount = Math.floor(messages.filter((m) => m.role === "user").length);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="glass-card border-b border-border/30 h-14 flex items-center px-4 gap-3 shrink-0 z-10 sticky top-0">
        <Link to="/">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" aria-label="Back to home">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>

        <Sparkles className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-foreground text-sm leading-none truncate">{topicParam}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {turnCount > 0 ? `${turnCount} turn${turnCount !== 1 ? "s" : ""}` : "Debate with Athena"}
          </p>
        </div>

        {/* XP Bar */}
        <XPBar />

        {/* Save button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={saving || saved || messages.length < 2}
          className="text-xs border-border hover:border-primary/50 hover:text-primary shrink-0"
          aria-label="Save debate to history"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          <span className="ml-1.5 hidden sm:inline">{saved ? "Saved" : "Save"}</span>
        </Button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <DebateChat messages={messages} isStreaming={isStreaming} topic={topicParam} />
      </div>

      {/* Voice status banner */}
      {isListening && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs text-center py-2 font-medium"
        >
          🎙 Listening… {interimTranscript && `"${interimTranscript}"`}
        </motion.div>
      )}
      {isSpeaking && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/5 border-t border-primary/20 text-primary text-xs text-center py-2 font-medium"
        >
          🔊 Athena is speaking…
        </motion.div>
      )}

      {/* Input area */}
      <div className="border-t border-border glass-card p-4">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-2 max-w-3xl mx-auto"
          aria-label="Debate input form"
        >
          {/* Attachment Previews */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 p-2 bg-secondary/30 rounded-lg">
              {attachments.map((att, i) => (
                <div key={i} className="relative group">
                  <div className="w-16 h-16 rounded-lg bg-secondary border border-border flex items-center justify-center overflow-hidden">
                    {att.type === "image" && <img src={att.data} alt="Preview" className="w-full h-full object-cover" />}
                    {att.type === "video" && <Film className="w-6 h-6 text-muted-foreground" />}
                    {att.type === "document" && <FileText className="w-6 h-6 text-muted-foreground" />}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-md hover:scale-110 transition-transform"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <p className="text-[8px] text-muted-foreground truncate w-16 mt-1 text-center font-medium">
                    {att.name}
                  </p>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex gap-2 items-center">
            <input
              type="file"
              accept="image/*,video/*,.pdf,.txt,.md,.csv"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileSelect}
            />
            
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-xl shrink-0 border-border hover:bg-secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming}
              aria-label="Add attachment"
            >
              <Paperclip className="h-4 w-4 text-muted-foreground" />
            </Button>

            <input
              ref={inputRef}
              value={isListening ? interimTranscript : input}
            onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Listening…" : "Attach files or state your argument…"}
              disabled={isStreaming || isListening}
              aria-label="Your argument"
              className="flex-1 bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground
                placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50
                disabled:opacity-60 transition-all"
            />

          <VoiceButton
            isListening={isListening}
            isSpeaking={isSpeaking}
            isSupported={isSupported}
            onToggle={handleMicToggle}
            disabled={isStreaming}
          />

          <Button
            type="submit"
            disabled={isStreaming || (!input.trim() && !isListening)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-4 shrink-0"
            aria-label="Send argument"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
          </div>
        </form>
        <p className="text-center text-xs text-muted-foreground mt-3">
          Athena always argues the <span className="text-primary">opposite</span> of your position.
        </p>
      </div>
    </div>
  );
}
