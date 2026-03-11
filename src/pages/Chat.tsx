import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { agents, type AgentId, getAgent } from "@/lib/agents";
import { streamAgentResponse, type ChatMessage } from "@/lib/ai-stream";
import { fireConfetti } from "@/lib/confetti";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface Message {
  id: string;
  agentId: AgentId | "user";
  content: string;
  timestamp: Date;
}

const agentOrder: AgentId[] = ["expert", "challenger", "executor", "planner", "psychologist", "historian"];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isDebating, setIsDebating] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentId | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const startDebate = async (userMessage: string) => {
    if (!userMessage.trim() || isDebating) return;
    setInput("");
    setIsDebating(true);

    const userMsg: Message = { id: crypto.randomUUID(), agentId: "user", content: userMessage, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);

    // Build conversation context for AI
    const conversationHistory: ChatMessage[] = [{ role: "user", content: userMessage }];

    // Each agent responds in sequence
    for (const agentId of agentOrder) {
      setActiveAgent(agentId);
      const msgId = crypto.randomUUID();
      let fullContent = "";

      // Add placeholder message
      setMessages((prev) => [...prev, { id: msgId, agentId, content: "", timestamp: new Date() }]);

      // Build context: include previous agents' responses for this debate round
      const agentContext: ChatMessage[] = [
        ...conversationHistory,
      ];

      try {
        await streamAgentResponse({
          messages: agentContext,
          agentId,
          onDelta: (delta) => {
            fullContent += delta;
            setMessages((prev) =>
              prev.map((m) => (m.id === msgId ? { ...m, content: fullContent } : m))
            );
          },
          onDone: () => {
            // Check for celebration trigger
            if (fullContent.includes("[CELEBRATE]")) {
              fireConfetti();
              fullContent = fullContent.replace("[CELEBRATE]", "").trim();
              setMessages((prev) =>
                prev.map((m) => (m.id === msgId ? { ...m, content: fullContent } : m))
              );
            }
            // Add this agent's response to context for next agents
            conversationHistory.push({ role: "assistant", content: `[${agentId}]: ${fullContent}` });
          },
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "AI request failed";
        toast.error(errorMsg);
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, content: `⚠️ ${errorMsg}` } : m))
        );
        break;
      }
    }

    setActiveAgent(null);
    setIsDebating(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="glass-card border-b border-border/30 h-14 flex items-center px-4 gap-3 shrink-0 z-10">
        <Link to="/">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Sparkles className="h-5 w-5 text-primary" />
        <span className="font-display font-bold text-foreground">ATHENA Debate</span>
        <div className="flex items-center gap-1.5 ml-auto">
          {agents.map((a) => {
            const Icon = a.icon;
            const isActive = activeAgent === a.id;
            return (
              <div
                key={a.id}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  isActive ? "ring-2 ring-primary scale-110" : ""
                } bg-${a.color}/20`}
                title={a.name}
              >
                <Icon className={`h-3.5 w-3.5 text-${a.color}`} />
              </div>
            );
          })}
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="h-12 w-12 text-primary mb-4 animate-float" />
            <h2 className="font-display text-2xl font-bold mb-2 text-foreground">Ask ATHENA anything</h2>
            <p className="text-muted-foreground max-w-md mb-8">
              Ask a CS question and watch 6 AI agents debate the best way to teach you.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {["How does binary search work?", "Explain recursion vs iteration", "What is Big O notation?", "How do hash tables handle collisions?"].map((q) => (
                <button key={q} onClick={() => startDebate(q)}
                  className="px-4 py-2 rounded-full border border-border text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              {msg.agentId === "user" ? (
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3 max-w-md">
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ) : (
                <AgentMessage msg={msg} />
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator with active agent avatar */}
        {isDebating && activeAgent && (
          <TypingIndicator agentId={activeAgent} />
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-4 glass-card">
        <form onSubmit={(e) => { e.preventDefault(); startDebate(input); }} className="flex gap-2 max-w-3xl mx-auto">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a CS question..." disabled={isDebating}
            className="flex-1 bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50" />
          <Button type="submit" disabled={isDebating || !input.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-4">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function TypingIndicator({ agentId }: { agentId: AgentId }) {
  const agent = getAgent(agentId);
  const Icon = agent.icon;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="flex items-center gap-3 max-w-2xl">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-${agent.color}/20 animate-pulse`}>
        <Icon className={`h-4 w-4 text-${agent.color}`} />
      </div>
      <div className="glass-card px-4 py-3 rounded-2xl rounded-tl-md">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-semibold text-foreground">{agent.name}</span>
          <span className="text-xs text-muted-foreground">is thinking...</span>
          <div className="flex gap-1 ml-1">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AgentMessage({ msg }: { msg: Message }) {
  const agent = getAgent(msg.agentId as AgentId);
  const Icon = agent.icon;
  return (
    <div className="flex gap-3 max-w-2xl">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-1 bg-${agent.color}/20`}>
        <Icon className={`h-4 w-4 text-${agent.color}`} />
      </div>
      <div className="glass-card px-4 py-3 rounded-2xl rounded-tl-md flex-1">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-display text-sm font-semibold text-foreground">{agent.name}</span>
          <span className="text-xs text-muted-foreground">{agent.title}</span>
        </div>
        <div className="text-sm text-foreground/90 leading-relaxed prose prose-sm prose-invert max-w-none">
          <ReactMarkdown>{msg.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
