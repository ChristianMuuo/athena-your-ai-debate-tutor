import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Clock, MessageCircle, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useDebateHistory, type DebateSession } from "@/hooks/useDebateHistory";
import { AuthModal } from "@/components/AuthModal";
import { useState } from "react";

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function History() {
  const { user, loading: authLoading } = useAuth();
  const { sessions, loading: historyLoading, loadSessions, deleteSession } = useDebateHistory();
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (user) loadSessions(user.id);
  }, [user, loadSessions]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Sparkles className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="glass-card border-b border-border/30 h-14 flex items-center px-4 shrink-0">
          <Link to="/">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Sparkles className="h-5 w-5 text-primary ml-3 mr-2" />
          <span className="font-display font-bold text-foreground">Debate History</span>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-secondary border border-border flex items-center justify-center mb-6">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-3">Sign in to see history</h2>
          <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed">
            Create an account or sign in to save your debates and track your progress over time.
          </p>
          <Button onClick={() => setAuthOpen(true)} className="bg-primary text-primary-foreground focus:ring-2 focus:ring-primary/50">
            Sign In / Create Account
          </Button>
        </div>

        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="glass-card border-b border-border/30 h-14 flex items-center px-4 shrink-0">
        <Link to="/">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Sparkles className="h-5 w-5 text-primary ml-3 mr-2" />
        <span className="font-display font-bold text-foreground">Debate History</span>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">Past Debates</h1>
            <p className="text-muted-foreground">Review your arguments and Athena's feedback.</p>
          </div>

          {historyLoading ? (
            <div className="flex justify-center py-12">
              <Sparkles className="h-8 w-8 text-primary animate-pulse" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-16 glass-card border-border/50">
              <MessageCircle className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">No debates yet</h3>
              <p className="text-sm text-muted-foreground">Start a debate from the home page to see it here.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {sessions.map((session, i) => (
                <HistoryCard
                  key={session.id}
                  session={session}
                  index={i}
                  onDelete={() => deleteSession(session.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryCard({ session, index, onDelete }: { session: DebateSession; index: number; onDelete: () => void }) {
  const turns = Math.floor((session.messages?.length || 0) / 2);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass-card p-5 group relative"
    >
      <div className="pr-8 mb-3">
        <h3 className="font-display font-semibold text-foreground text-lg leading-snug line-clamp-2">
          {session.topic}
        </h3>
      </div>
      
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-5">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {formatRelativeTime(session.created_at)}
        </div>
        <div className="flex items-center gap-1.5 border-l border-border pl-4">
          <MessageCircle className="h-3.5 w-3.5" />
          {turns} turn{turns !== 1 && "s"}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground/70 italic flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Read-only replay coming soon
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 h-8 px-2 absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
          title="Delete session"
        >
          Delete
        </Button>
      </div>
    </motion.div>
  );
}

// Ensure Lock icon is imported if we use it
import { Lock } from "lucide-react";
