import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Mic, History as HistoryIcon, ShieldCheck, Zap, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TopicCard, DEBATE_TOPICS, type Topic } from "@/components/TopicCard";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/hooks/useAuth";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function Landing() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  const handleTopicClick = (topic: Topic) => {
    navigate(`/debate?topic=${encodeURIComponent(topic.title)}`);
  };

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden flex flex-col">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 glass-card border-b border-border/30">
        <div className="container mx-auto flex items-center justify-between h-16 px-6">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-bold tracking-tight text-foreground">ATHENA</span>
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link to="/history">
                  <Button variant="ghost" className="text-muted-foreground hover:text-foreground hidden sm:flex">
                    <HistoryIcon className="h-4 w-4 mr-2" /> History
                  </Button>
                </Link>
                <div className="h-4 w-px bg-border hidden sm:block" />
                <Button variant="ghost" onClick={signOut} className="text-muted-foreground hover:text-foreground hover:bg-destructive/10">
                  Sign Out
                </Button>
              </>
            ) : (
              <Button variant="ghost" onClick={() => setAuthOpen(true)} className="text-muted-foreground hover:text-foreground">
                <UserIcon className="h-4 w-4 mr-2" /> Sign In
              </Button>
            )}
            <Link to="/debate">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-display font-semibold hidden sm:flex">
                Start Debate <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-16 px-6 flex-1 flex flex-col justify-center">
        <div className="absolute inset-0 overflow-hidden -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "2s" }} />
        </div>

        <div className="container mx-auto max-w-5xl z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="h-3.5 w-3.5" /> AI Debate Coach
              </span>
            </motion.div>

            <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1}
              className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight mb-6">
              Master the art of <span className="text-gradient-primary">Argumentation</span>
            </motion.h1>

            <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2}
              className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed">
              Athena plays devil's advocate to your strongest convictions. 
              Practice argumentation, spot fallacies, and get instant feedback — by voice or text.
            </motion.p>

            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/debate">
                <Button size="lg" className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-display font-semibold text-lg px-8 py-6 shadow-[0_0_30px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)] transition-all">
                  Start a Debate <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              {!user && (
                <Button size="lg" variant="outline" onClick={() => setAuthOpen(true)} className="w-full sm:w-auto border-border hover:bg-secondary text-foreground font-display text-lg px-8 py-6">
                  Sign In to Save History
                </Button>
              )}
            </motion.div>
          </div>

          {/* Topics Grid */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}>
            <div className="flex items-center justify-between mb-6 px-2">
              <h2 className="font-display text-xl font-bold text-foreground">Select a topic to begin</h2>
              <span className="text-sm text-muted-foreground hidden sm:block">Or type your own inside</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {DEBATE_TOPICS.map((topic, i) => (
                <TopicCard key={topic.title} topic={topic} index={i} onClick={handleTopicClick} />
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Strip */}
      <section className="py-12 border-t border-border/50 bg-secondary/30 mt-auto">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                <Mic className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-display font-semibold text-sm">Voice Mode</h4>
              <p className="text-xs text-muted-foreground max-w-[160px]">Speak naturally and hear Athena's response</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-display font-semibold text-sm">Fallacy Detection</h4>
              <p className="text-xs text-muted-foreground max-w-[160px]">Gentle corrections on logical errors</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-display font-semibold text-sm">Gemini 2.0 Flash</h4>
              <p className="text-xs text-muted-foreground max-w-[160px]">Lightning fast, super intelligent AI</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                <HistoryIcon className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-display font-semibold text-sm">Debate History</h4>
              <p className="text-xs text-muted-foreground max-w-[160px]">Save sessions and track your growth</p>
            </div>
          </div>
        </div>
      </section>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
