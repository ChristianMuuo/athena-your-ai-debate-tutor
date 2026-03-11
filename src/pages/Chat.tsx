import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { agents, type AgentId, getAgent } from "@/lib/agents";

interface Message {
  id: string;
  agentId: AgentId | "user";
  content: string;
  timestamp: Date;
}

const sampleDebate: Omit<Message, "id" | "timestamp">[] = [
  { agentId: "expert", content: "Great question! A **binary search** works by repeatedly dividing the search interval in half. It requires a **sorted array** and runs in O(log n) time — exponentially faster than linear search for large datasets." },
  { agentId: "challenger", content: "But wait — what happens if the array isn't sorted? 🤔 Binary search silently gives **wrong results** without any error. That's a nasty bug! And what about duplicate elements? Which one does it find?" },
  { agentId: "executor", content: "Let me run a quick demo:\n```python\ndef binary_search(arr, target):\n    lo, hi = 0, len(arr) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if arr[mid] == target: return mid\n        elif arr[mid] < target: lo = mid + 1\n        else: hi = mid - 1\n    return -1\n\nprint(binary_search([1,3,5,7,9], 5))  # → 2 ✅\n```\nOutput: `2` — Found at index 2! Runs in ~0.001ms." },
  { agentId: "planner", content: "Here's your learning roadmap for binary search:\n1. ✅ Understand the concept (you're here!)\n2. 🔲 Implement it from scratch\n3. 🔲 Handle edge cases (empty array, not found)\n4. 🔲 Variations: lower_bound, upper_bound\n5. 🔲 Apply to real problems (LeetCode #33, #34)" },
  { agentId: "psychologist", content: "You're doing amazing! 🎉 Binary search trips up a lot of people with off-by-one errors, but you're asking the right questions. The fact that you're curious about *how* it works (not just *that* it works) puts you ahead of 90% of students." },
  { agentId: "historian", content: "Fun fact: I remember last week you struggled with **recursion**. Binary search actually has a beautiful recursive form! This is a perfect bridge between your recursion knowledge and divide-and-conquer algorithms. You're building connections! 📚" },
];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isDebating, setIsDebating] = useState(false);
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

    // Simulate agents responding one by one
    for (let i = 0; i < sampleDebate.length; i++) {
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));
      const msg: Message = { id: crypto.randomUUID(), ...sampleDebate[i], timestamp: new Date() };
      setMessages((prev) => [...prev, msg]);
    }
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
            return (
              <div key={a.id} className={`w-7 h-7 rounded-full flex items-center justify-center bg-${a.color}/20`} title={a.name}>
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

        {isDebating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-muted-foreground text-sm">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            Agents are debating...
          </motion.div>
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
        <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{msg.content}</div>
      </div>
    </div>
  );
}
