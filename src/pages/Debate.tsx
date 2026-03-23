import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, Save, Loader2, Send, Paperclip, X, FileText, Film, Image as ImageIcon, Headphones, Radio, BrainCircuit, BarChart3, TrendingUp, AlertCircle, Quote, CheckCircle2, BookOpen } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DebateChat, type DebateMessage, type Attachment } from "@/components/DebateChat";
import { VoiceButton } from "@/components/VoiceButton";
import { useVoice } from "@/hooks/useVoice";
import { useAuth } from "@/hooks/useAuth";
import { useDebateHistory } from "@/hooks/useDebateHistory";
import { streamAIDebate } from "@/lib/ai-service";
import { useXP } from "@/hooks/useXP";
import { useProfile } from "@/hooks/useProfile";
import { XPBar } from "@/components/XPBar";
import { toast } from "sonner";
import { PodcastService, type PodcastSegment } from "@/lib/PodcastService";
import { extractTextFromFile, getFileIcon } from "@/lib/fileParser";
import { useStudyCards } from "@/hooks/useStudyCards";
import { extractStudyCards, evaluateDebate, type DebateScore, type ChatMessage, extractArguments, type ArgumentNode } from "@/lib/ai-service";
import { DebateTimer, DEBATE_FORMATS } from "@/components/DebateTimer";
import { Trophy, CheckCircle, Target, Zap, Users, UserPlus, MinusCircle, Map as MapIcon } from "lucide-react";
import { agents as allAgents, getAgent, type Agent } from "@/lib/agents";
import { ArgumentCanvas } from "@/components/ArgumentCanvas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  const [showVoiceReport, setShowVoiceReport] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState("Casual");
  const [debateScore, setDebateScore] = useState<DebateScore | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [activeAgents, setActiveAgents] = useState<Agent[]>([allAgents[0]]); // Athena by default
  const [argumentNodes, setArgumentNodes] = useState<ArgumentNode[]>([]);
  const [showRecapDialog, setShowRecapDialog] = useState(false);
  const [recapSegments, setRecapSegments] = useState<PodcastSegment[]>([]);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const { saving, saveSession, loadSessions, sessions } = useDebateHistory();
  const { addXp } = useXP();
  const { saveCards } = useStudyCards();
  const { profile, updateProfile, fetchProfile } = useProfile();

  // Preload messages when continuing a saved session
  useEffect(() => {
    fetchProfile();
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
    setSaved(true);
  }, [continueSessionId, sessions]);

  // Voice hook
  const {
    isListening,
    isSpeaking,
    isSupported,
    interimTranscript,
    stats,
    startListening,
    stopListening,
    speak,
    cancelSpeech,
    resetStats
  } = useVoice({
    onTranscript: (text) => {
      setInput((prev) => (prev ? prev + " " + text : text));
    },
  });

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if ((!trimmed && attachments.length === 0) || isStreaming) return;

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
      setAttachments([]);

      const assistantId = crypto.randomUUID();
      const assistantMsg: DebateMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      const contextWindow = [...messages, userMsg].slice(-MAX_CONTEXT_TURNS);
      const apiMessages = contextWindow.map((m) => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments
      }));

      // Sequential responses from multiple agents
      const runAgentTurns = async (currentMsgs: DebateMessage[]) => {
        for (const agent of activeAgents) {
          const agentAssistantId = crypto.randomUUID();
          const agentAssistantMsg: DebateMessage = {
            id: agentAssistantId,
            role: "assistant",
            content: "",
            timestamp: new Date(),
            // @ts-ignore - adding agent context to message
            agentName: agent.name,
            agentIcon: agent.id
          };
          setMessages((prev) => [...prev, agentAssistantMsg]);

          const recentMsgs = currentMsgs.slice(-MAX_CONTEXT_TURNS);
          const apiMessages: ChatMessage[] = recentMsgs.map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments
          }));

          let agentFullContent = "";
          await new Promise<void>((resolve, reject) => {
            streamAIDebate({
              messages: apiMessages,
              topicContext: topicParam,
              agentPersonality: agent.personality,
              onDelta: (chunk) => {
                agentFullContent += chunk;
                setMessages((prev) =>
                  prev.map((m) => (m.id === agentAssistantId ? { ...m, content: agentFullContent } : m))
                );
              },
              onDone: () => {
                currentMsgs.push({ ...agentAssistantMsg, content: agentFullContent });
                if (agentFullContent) speak(agentFullContent);
                resolve();
              },
            }).catch(reject);
          });
        }
        setIsStreaming(false);
        setSaved(false);
        addXp(15 * activeAgents.length);

        // Update Argument Canvas
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
        if (apiKey && currentMsgs.length > 2) {
          extractArguments({ messages: currentMsgs, topic: topicParam, apiKey })
            .then(setArgumentNodes)
            .catch(console.error);
        }
      };

      try {
        await runAgentTurns([...messages, userMsg]);
      } catch (err) {
        toast.error("Multi-agent request failed");
        setIsStreaming(false);
      }
    },
    [isStreaming, messages, topicParam, cancelSpeech, speak, attachments, addXp, activeAgents, user]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) sendMessage(input);
  };

  const handleMicToggle = () => {
    if (!isSupported) {
      toast.error("Voice input is not supported in this browser.");
      return;
    }
    if (isListening) {
      stopListening();
    } else {
      resetStats();
      startListening();
    }
  };

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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("Sign in to save your history.");
      return;
    }
    if (messages.length < 2) {
      toast.error("Debate too short.");
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
      toast.success("Debate saved!");
    }
  };

  const handleExportPodcast = async () => {
    if (messages.length < 3) return toast.error("Too short for recap.");
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) return toast.error("OpenAI API Key required.");

    setIsGeneratingPodcast(true);
    const toastId = toast.loading("Athena is narrating...");

    try {
      // 1. Generate Script (Now with Groq Fallback, so this is very likely to succeed)
      const script = await PodcastService.generatePodcastScript(messages, topicParam, apiKey);
      setRecapSegments(script);
      setShowRecapDialog(true);

      setIsAudioLoading(true);
      try {
        // 2. Try Generate MP3 in background
        const blob = await PodcastService.createPodcastMP3(script, apiKey);
        setAudioBlob(blob);
      } catch (audioErr: any) {
        console.warn("Cloud Audio generation failed:", audioErr);
        // We still have the script, so the dialog stays open
      } finally {
        setIsAudioLoading(false);
      }

      toast.dismiss(toastId);
    } catch (err: any) {
      toast.error(`Recap failed: ${err.message || 'Unknown error'}`, { id: toastId });
      setIsGeneratingPodcast(false);
    }
  };

  const handleDownloadRecap = () => {
    const showNotes = PodcastService.generateShowNotes(messages, topicParam);
    const blob = new Blob([showNotes], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Athena_Recap.md`; a.click();
    toast.success("Recap downloaded!");
  };

  const handleDownloadAudio = () => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement("a");
    a.href = url; a.download = `Athena_Podcast.mp3`; a.click();
    toast.success("Podcast downloaded!");
  };

  const handlePlayRecapAloud = () => {
    const text = PodcastService.getCleanScriptText(recapSegments);
    speak(text);
  };

  const [unlimitedAudioBlob, setUnlimitedAudioBlob] = useState<Blob | null>(null);

  const handleDownloadUnlimitedAudio = async () => {
    setIsAudioLoading(true);
    setUnlimitedAudioBlob(null);
    const toastId = toast.loading("Synthesizing Unlimited Audio...");
    try {
      const blob = await PodcastService.createUnlimitedMP3(recapSegments);
      setUnlimitedAudioBlob(blob);
      toast.success("Unlimited Audio generated! Click download again to save.", { id: toastId });
    } catch (err: any) {
      toast.error(`Unlimited Audio failed: ${err.message}`, { id: toastId });
    } finally {
      setIsAudioLoading(false);
    }
  };

  const handleSaveUnlimitedAudio = () => {
    if (!unlimitedAudioBlob) return;
    const url = URL.createObjectURL(unlimitedAudioBlob);
    const a = document.createElement("a");
    a.href = url; a.download = `Athena_Unlim_Debate.mp3`; a.click();
    toast.success("Podcast saved to your device!");
  };

  const handleDownloadJSON = () => {
    const data = {
      topic: topicParam,
      messages: messages.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `session.json`; a.click();
    toast.success("Session data exported!");
  };

  const handleGenerateStudyCards = async () => {
    if (messages.length < 3) return toast.error("Too short for cards.");
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) return toast.error("OpenAI API Key required.");

    setIsGeneratingCards(true);
    const toastId = toast.loading("Athena is drafting...");

    try {
      const cards = await extractStudyCards({ messages, topic: topicParam, apiKey });
      await saveCards(cards, continueSessionId || undefined);
      toast.success(`${cards.length} cards added!`, { id: toastId });
    } catch (err: any) {
      toast.error(`Failed to generate cards: ${err.message || 'Unknown error'}`, { id: toastId });
    } finally {
      setIsGeneratingCards(false);
    }
  };

  const handleFinishAndScore = async () => {
    if (messages.length < 3) return toast.error("Too short to score.");
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) return toast.error("OpenAI API Key required.");

    setIsScoring(true);
    const toastId = toast.loading("Athena is judging the debate...");

    try {
      const score = await evaluateDebate({ messages, topic: topicParam, format: selectedFormat, apiKey });
      setDebateScore(score);
      setShowScoreModal(true);

      // Update learning profile
      if (user) {
        const newStrengths = [...new Set([...(profile?.strengths || []), ...score.strengths])].slice(-10);
        const newWeaknesses = [...new Set([...(profile?.weaknesses || []), ...score.weaknesses])].slice(-10);
        await updateProfile({
          strengths: newStrengths,
          weaknesses: newWeaknesses,
          mastery_by_topic: {
            ...(profile?.mastery_by_topic || {}),
            [topicParam]: score.overall
          }
        });
      }

      toast.success("Scoring complete!", { id: toastId });
    } catch (err: any) {
      toast.error(`Judging failed: ${err.message || 'Unknown error'}`, { id: toastId });
    } finally {
      setIsScoring(false);
    }
  };

  const turnCount = messages.filter((m) => m.role === "user").length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="glass-card border-b border-border/30 h-14 flex items-center px-4 gap-3 shrink-0 z-10 sticky top-0">
        <Link to="/">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Sparkles className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-foreground text-sm leading-none truncate">{topicParam}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
              {turnCount} turns
            </p>
            <span className="text-muted-foreground/30">•</span>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="bg-transparent text-[10px] font-bold text-primary uppercase tracking-tight focus:outline-none cursor-pointer hover:text-primary/80 transition-colors"
            >
              {Object.keys(DEBATE_FORMATS).map(f => (
                <option key={f} value={f} className="bg-background text-foreground uppercase">{f} Style</option>
              ))}
            </select>
          </div>
        </div>
        <XPBar />
        <Button variant="outline" size="sm" onClick={handleSave} disabled={saving || saved || messages.length < 2} className="text-xs shrink-0">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          <span className="ml-1.5 hidden sm:inline">{saved ? "Saved" : "Save"}</span>
        </Button>
        <Button variant="secondary" size="sm" onClick={handleExportPodcast} disabled={isGeneratingPodcast || messages.length < 3} className="text-xs bg-primary/10 text-primary shrink-0">
          {isGeneratingPodcast ? <Radio className="h-3.5 w-3.5 animate-pulse" /> : <Headphones className="h-3.5 w-3.5" />}
          <span className="ml-1.5 hidden sm:inline">Recap</span>
        </Button>
        <Button variant="secondary" size="sm" onClick={handleGenerateStudyCards} disabled={isGeneratingCards || messages.length < 3} className="text-xs bg-purple-500/10 text-purple-400 shrink-0">
          <BrainCircuit className={`h-3.5 w-3.5 ${isGeneratingCards ? 'animate-pulse' : ''}`} />
          <span className="ml-1.5 hidden sm:inline">Study</span>
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setShowVoiceReport(true)} disabled={messages.length < 2} className="text-xs bg-blue-500/10 text-blue-400 shrink-0">
          <BarChart3 className="h-3.5 w-3.5" />
          <span className="ml-1.5 hidden sm:inline">Analysis</span>
        </Button>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Sidebar for Timer/Stats */}
        {selectedFormat !== "Casual" && (
          <aside className="w-full md:w-80 p-4 border-b md:border-b-0 md:border-r border-border/30 bg-secondary/10 shrink-0 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
            <DebateTimer
              formatName={selectedFormat}
              isActive={!isStreaming}
              onPhaseComplete={(phase) => {
                toast.info(`Phase complete: ${phase.name}`);
              }}
            />

            <div className="flex-1 space-y-4">
              <Button
                onClick={handleFinishAndScore}
                disabled={isScoring || messages.length < 3}
                className="w-full h-11 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20"
              >
                {isScoring ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trophy className="h-4 w-4 mr-2" />}
                Judge & Finish
              </Button>

              <ArgumentCanvas nodes={argumentNodes} />

              <div className="glass-card p-4 rounded-xl border-primary/20 bg-primary/5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-bold uppercase text-primary tracking-widest flex items-center gap-1">
                    <Users className="h-3 w-3" /> Arena Agents
                  </h4>
                  <p className="text-[10px] text-muted-foreground">{activeAgents.length}/3</p>
                </div>
                <div className="space-y-2">
                  {activeAgents.map((agent) => (
                    <div key={agent.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                          <agent.icon className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-[11px] font-bold truncate max-w-[80px]">{agent.name}</span>
                      </div>
                      {activeAgents.length > 1 && (
                        <button
                          onClick={() => setActiveAgents(prev => prev.filter(a => a.id !== agent.id))}
                          className="text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MinusCircle className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {activeAgents.length < 3 && (
                    <select
                      onChange={(e) => {
                        const agent = allAgents.find(a => a.id === e.target.value);
                        if (agent && !activeAgents.find(a => a.id === agent.id)) {
                          setActiveAgents(prev => [...prev, agent]);
                        }
                        e.target.value = "";
                      }}
                      className="w-full bg-secondary border border-border text-[10px] rounded p-1 focus:outline-none"
                    >
                      <option value="">+ Add Specialist</option>
                      {allAgents.filter(a => !activeAgents.find(ag => ag.id === a.id)).map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="glass-card p-4 rounded-xl border-border/50 hidden md:block">
                <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-3">Format Rules</h4>
                <ul className="text-[11px] space-y-2 text-foreground/80">
                  <li className="flex gap-2">
                    <span className="text-primary">•</span> No manual time limits.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span> Switch phases when ready.
                  </li>
                </ul>
              </div>
            </div>
          </aside>
        )}

        <div className="flex-1 overflow-y-auto">
          <DebateChat messages={messages} isStreaming={isStreaming} topic={topicParam} />
        </div>
      </div>

      <div className="border-t border-border glass-card p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 max-w-3xl mx-auto">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 p-2 bg-secondary/30 rounded-lg">
              {attachments.map((att, i) => (
                <div key={i} className="relative group w-16 h-16 rounded-lg bg-secondary border border-border flex items-center justify-center overflow-hidden">
                  {att.type === "image" && <img src={att.data} alt="Preview" className="w-full h-full object-cover" />}
                  {att.type === "video" && <Film className="w-6 h-6 text-muted-foreground" />}
                  {att.type === "document" && <FileText className="w-6 h-6 text-muted-foreground" />}
                  <button type="button" onClick={() => removeAttachment(i)} className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-center relative">
            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
            <Button type="button" variant="outline" size="icon" className="rounded-xl shrink-0" onClick={() => fileInputRef.current?.click()} disabled={isStreaming}><Paperclip className="h-4 w-4" /></Button>
            <input
              ref={inputRef}
              value={isListening ? interimTranscript : input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Listening…" : "State your argument…"}
              disabled={isStreaming || isListening}
              className="flex-1 bg-secondary border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50"
            />
            <VoiceButton isListening={isListening} isSpeaking={isSpeaking} isSupported={isSupported} onToggle={handleMicToggle} disabled={isStreaming} />

            <AnimatePresence>
              {isListening && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="absolute -top-16 left-1/2 -translate-x-1/2 flex gap-4 pointer-events-none z-50">
                  <div className="glass-card px-4 py-2 rounded-full border-blue-500/30 flex items-center gap-2 shadow-xl whitespace-nowrap">
                    <span className="text-[10px] font-bold text-blue-400">WPM</span>
                    <span className={`text-sm font-bold ${stats.pacing === 'fast' ? 'text-red-400' : stats.pacing === 'slow' ? 'text-yellow-400' : 'text-blue-400'}`}>{stats.wpm}</span>
                  </div>
                  <div className="glass-card px-4 py-2 rounded-full border-purple-500/30 flex items-center gap-2 shadow-xl whitespace-nowrap">
                    <span className="text-[10px] font-bold text-purple-400">Fillers</span>
                    <span className="text-sm font-bold text-purple-400">{stats.fillers}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button type="submit" disabled={isStreaming || (!input.trim() && !isListening)} className="h-11 px-6 rounded-xl font-bold">
              {isStreaming ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Send className="h-4 w-4 mr-2" /> Send</>}
            </Button>
          </div>
        </form>
      </div>

      <Dialog open={showVoiceReport} onOpenChange={setShowVoiceReport}>
        <DialogContent className="sm:max-w-md glass-card border-blue-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-display">
              <TrendingUp className="h-6 w-6 text-blue-400" />
              Delivery Analysis
            </DialogTitle>
            <DialogDescription>Athena's performance metrics for this session.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="glass-card p-4 rounded-xl text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">WPM</p>
              <p className={`text-3xl font-bold ${stats.pacing === 'fast' ? 'text-red-400' : stats.pacing === 'slow' ? 'text-yellow-400' : 'text-blue-400'}`}>{stats.wpm}</p>
              <p className="text-[10px] capitalize text-muted-foreground">{stats.pacing} Pacing</p>
            </div>
            <div className="glass-card p-4 rounded-xl text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Fillers</p>
              <p className="text-3xl font-bold text-purple-400">{stats.fillers}</p>
              <p className="text-[10px] text-muted-foreground">Session count</p>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-muted-foreground">Athena's Feedback</h4>
            <div className="bg-secondary/30 p-4 rounded-xl text-sm leading-relaxed">
              {stats.wpm > 160 ? (
                <p className="flex gap-2"><AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" /> Slow down! You're speaking too fast for optimal persuasion.</p>
              ) : stats.wpm < 100 && stats.wpm > 0 ? (
                <p className="flex gap-2"><AlertCircle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" /> Pick up the pace. A bit more energy will improve engagement.</p>
              ) : stats.wpm > 0 ? (
                <p className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" /> Spot on! Your delivery pacing is professional.</p>
              ) : (
                <p className="italic text-muted-foreground">Speak to generate performance insights.</p>
              )}
            </div>
            {stats.fillers > 3 && (
              <div className="bg-secondary/30 p-4 rounded-xl border border-border/50 text-sm leading-relaxed">
                <p className="flex gap-2 text-purple-400"><Quote className="h-4 w-4 shrink-0 mt-0.5" /> You used {stats.fillers} fillers. Try pausing instead of saying "um".</p>
              </div>
            )}
          </div>
          <Button onClick={() => setShowVoiceReport(false)} className="w-full mt-4">Continue Debate</Button>
        </DialogContent>
      </Dialog>

      {/* Recap Dialog */}
      <Dialog open={showRecapDialog} onOpenChange={setShowRecapDialog}>
        <DialogContent className="sm:max-w-md glass-card border-primary/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-display font-bold">
              <Sparkles className="h-6 w-6 text-primary" />
              Debate Recap Ready
            </DialogTitle>
            <DialogDescription>
              Choose how you'd like to experience your debate summary.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="default"
                className="w-full justify-start gap-3 h-16 relative overflow-hidden group"
                onClick={handlePlayRecapAloud}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Radio className={`h-5 w-5 ${isSpeaking ? 'animate-pulse text-primary' : ''}`} />
                </div>
                <div className="text-left">
                  <p className="font-bold leading-tight">Listen Aloud</p>
                  <p className="text-[10px] text-primary-foreground/70">Using browser voice (Instant & Free)</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-16 relative group"
                disabled={isAudioLoading || !audioBlob}
                onClick={handleDownloadAudio}
              >
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  {isAudioLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Headphones className="h-5 w-5" />}
                </div>
                <div className="text-left">
                  <p className="font-bold leading-tight">Download Podcast (Premium)</p>
                  <p className="text-[10px] text-muted-foreground">High-Fidelity Cloud Voices</p>
                </div>
                {!audioBlob && !isAudioLoading && (
                  <span className="absolute top-2 right-2 text-[8px] uppercase font-bold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">
                    Limit hit
                  </span>
                )}
              </Button>

              <Button
                variant="outline"
                className={`w-full justify-start gap-3 h-16 relative group ${unlimitedAudioBlob ? 'border-primary bg-primary/5' : 'border-primary/20 hover:border-primary/50'}`}
                disabled={isAudioLoading}
                onClick={unlimitedAudioBlob ? handleSaveUnlimitedAudio : handleDownloadUnlimitedAudio}
              >
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${unlimitedAudioBlob ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                  {isAudioLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : unlimitedAudioBlob ? <CheckCircle className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                </div>
                <div className="text-left">
                  <p className="font-bold leading-tight">{unlimitedAudioBlob ? "Download Unlimited MP3" : "Generate (No Limits)"}</p>
                  <p className="text-[10px] text-primary/60">{unlimitedAudioBlob ? "Audio is ready to save!" : "Standard Audio • 100% Free"}</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-16 group"
                onClick={handleDownloadRecap}
              >
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="font-bold leading-tight">Save Show Notes</p>
                  <p className="text-[10px] text-muted-foreground">Markdown Transcript & Analysis</p>
                </div>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 opacity-60 hover:opacity-100"
                onClick={handleDownloadJSON}
              >
                <div className="h-8 w-8 rounded-full bg-secondary/50 flex items-center justify-center shrink-0">
                  <Save className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold leading-tight">Download Raw Data (for CLI)</p>
                  <p className="text-[8px] text-muted-foreground">Export session.json for local script</p>
                </div>
              </Button>
            </div>

            {/* Script Preview */}
            <div className="max-h-40 overflow-y-auto p-4 rounded-xl bg-secondary/30 border border-border/50 text-xs leading-relaxed custom-scrollbar">
              <p className="font-bold mb-2 uppercase text-[10px] tracking-widest text-muted-foreground">Script Preview</p>
              {recapSegments.map((s, i) => (
                <p key={i} className="mb-2 last:mb-0">
                  <span className="font-bold text-primary">{s.role === 'athena' ? 'Athena: ' : 'User: '}</span>
                  {s.text}
                </p>
              ))}
            </div>
          </div>

          <DialogHeader className="pt-2">
            <Button variant="ghost" onClick={() => setShowRecapDialog(false)} className="w-full">
              Close
            </Button>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Debate Score Modal */}
      <Dialog open={showScoreModal} onOpenChange={setShowScoreModal}>
        <DialogContent className="sm:max-w-lg glass-card border-primary/30 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-3xl font-display font-bold">
              <Trophy className="h-8 w-8 text-yellow-400" />
              Debate Verdict
            </DialogTitle>
            <DialogDescription className="text-lg">
              {debateScore?.winner === 'user' ? "Winner: User 🎉" : debateScore?.winner === 'athena' ? "Winner: Athena 🤖" : "Result: Draw ⚖️"}
            </DialogDescription>
          </DialogHeader>

          {debateScore && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Logic", val: debateScore.logic, icon: Target, color: "text-blue-400" },
                  { label: "Evidence", val: debateScore.evidence, icon: BookOpen, color: "text-green-400" },
                  { label: "Delivery", val: debateScore.delivery, icon: Zap, color: "text-yellow-400" },
                  { label: "Overall", val: debateScore.overall, icon: Sparkles, color: "text-primary" }
                ].map((stat, i) => (
                  <div key={i} className="glass-card p-3 rounded-xl border-white/10 text-center">
                    <p className="text-[9px] uppercase font-bold text-muted-foreground mb-1">{stat.label}</p>
                    <div className="flex items-center justify-center gap-1">
                      <stat.icon className={`h-3 w-3 ${stat.color}`} />
                      <span className="text-xl font-display font-bold">{stat.val}/10</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="bg-secondary/30 p-4 rounded-xl border border-border/50">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Judge's Feedback</h4>
                  <p className="text-sm leading-relaxed">{debateScore.feedback}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase text-green-400 tracking-widest">Key Strengths</h4>
                    <ul className="space-y-1">
                      {debateScore.strengths.map((s, i) => (
                        <li key={i} className="text-xs flex gap-2">
                          <CheckCircle className="h-3 w-3 text-green-400 shrink-0 mt-0.5" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase text-red-400 tracking-widest">Growth Areas</h4>
                    <ul className="space-y-1">
                      {debateScore.weaknesses.map((w, i) => (
                        <li key={i} className="text-xs flex gap-2">
                          <AlertCircle className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowScoreModal(false)} className="flex-1">
              Keep Debating
            </Button>
            <Link to="/" className="flex-1">
              <Button className="w-full">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
