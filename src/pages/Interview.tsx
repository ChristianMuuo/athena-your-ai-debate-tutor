import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Play, Clock, RotateCcw, CheckCircle2, Timer } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { streamAgentResponse, type ChatMessage } from "@/lib/ai-stream";
import { fireConfetti } from "@/lib/confetti";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

const topics = [
  "Arrays & Strings", "Linked Lists", "Trees & Graphs", "Dynamic Programming",
  "Sorting & Searching", "Hash Tables", "Stacks & Queues", "Recursion & Backtracking",
];

const difficulties = ["Easy", "Medium", "Hard"] as const;

export default function Interview() {
  const [problem, setProblem] = useState("");
  const [solution, setSolution] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<typeof difficulties[number]>("Medium");
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const generateProblem = useCallback(async (topic: string) => {
    setIsGenerating(true);
    setProblem("");
    setFeedback("");
    setSolution("");
    setTimer(0);
    setSelectedTopic(topic);

    const messages: ChatMessage[] = [
      { role: "user", content: `Generate a ${selectedDifficulty} difficulty coding interview problem about ${topic}. Make it realistic like a LeetCode/HackerRank problem.` },
    ];

    let full = "";
    try {
      await streamAgentResponse({
        messages,
        agentId: "expert",
        mode: "interview",
        onDelta: (d) => { full += d; setProblem(full); },
        onDone: () => { setIsTimerRunning(true); },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate problem");
    }
    setIsGenerating(false);
  }, [selectedDifficulty]);

  const submitSolution = async () => {
    if (!solution.trim()) return;
    setIsTimerRunning(false);
    setIsEvaluating(true);
    setFeedback("");

    const messages: ChatMessage[] = [
      { role: "user", content: `Here's the problem:\n${problem}\n\nHere's my solution:\n\`\`\`\n${solution}\n\`\`\`\n\nEvaluate my solution. Check correctness, time/space complexity, edge cases, and code quality. Be encouraging but honest. If the solution is correct, start with "✅ Correct!" — if not, start with "❌ Issues found:". Provide a better solution if mine is suboptimal.` },
    ];

    let full = "";
    try {
      await streamAgentResponse({
        messages,
        agentId: "expert",
        mode: "interview",
        onDelta: (d) => { full += d; setFeedback(full); },
        onDone: () => {
          if (full.includes("✅")) fireConfetti();
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to evaluate");
    }
    setIsEvaluating(false);
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
        <span className="font-display font-bold text-foreground">Interview Mode</span>
        {isTimerRunning && (
          <div className="ml-auto flex items-center gap-2 text-primary font-mono font-bold">
            <Timer className="h-4 w-4" />
            {formatTime(timer)}
          </div>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
          {/* Topic Selection */}
          {!problem && !isGenerating && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="text-center">
                <h1 className="font-display text-3xl font-bold text-foreground mb-2">Mock Coding Interview</h1>
                <p className="text-muted-foreground">Choose a topic and difficulty. ATHENA will generate a timed problem.</p>
              </div>

              {/* Difficulty */}
              <div className="flex justify-center gap-3">
                {difficulties.map((d) => (
                  <button key={d} onClick={() => setSelectedDifficulty(d)}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedDifficulty === d
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground hover:bg-secondary"
                    }`}>
                    {d}
                  </button>
                ))}
              </div>

              {/* Topics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {topics.map((topic) => (
                  <button key={topic} onClick={() => generateProblem(topic)}
                    className="glass-card p-4 text-left hover:border-primary/30 transition-all group">
                    <Play className="h-5 w-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
                    <span className="font-display text-sm font-semibold text-foreground">{topic}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Loading */}
          {isGenerating && !problem && (
            <div className="text-center py-12">
              <Sparkles className="h-10 w-10 text-primary mx-auto mb-4 animate-pulse" />
              <p className="text-muted-foreground">Generating your {selectedDifficulty.toLowerCase()} {selectedTopic} problem...</p>
            </div>
          )}

          {/* Problem Display */}
          {problem && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="glass-card p-6">
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>{problem}</ReactMarkdown>
                </div>
              </div>

              {/* Solution Input */}
              <div className="space-y-3">
                <label className="font-display text-sm font-semibold text-foreground">Your Solution</label>
                <textarea
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  placeholder="Write your solution here..."
                  className="w-full h-64 bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono resize-y"
                  disabled={isEvaluating}
                />
                <div className="flex gap-3">
                  <Button onClick={submitSolution} disabled={!solution.trim() || isEvaluating}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-display">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {isEvaluating ? "Evaluating..." : "Submit Solution"}
                  </Button>
                  <Button variant="outline" onClick={() => { setProblem(""); setSolution(""); setFeedback(""); setIsTimerRunning(false); setTimer(0); }}
                    className="border-border text-foreground hover:bg-secondary">
                    <RotateCcw className="h-4 w-4 mr-2" /> New Problem
                  </Button>
                  {timer > 0 && (
                    <div className="flex items-center gap-2 ml-auto text-muted-foreground text-sm">
                      <Clock className="h-4 w-4" />
                      Time: {formatTime(timer)}
                    </div>
                  )}
                </div>
              </div>

              {/* Feedback */}
              {feedback && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-6 border-primary/20">
                  <h3 className="font-display text-lg font-semibold text-foreground mb-3">ATHENA's Evaluation</h3>
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown>{feedback}</ReactMarkdown>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
