import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Play, BookOpen, MessageCircle, User, Clock, FileText, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDebateHistory, type DebateSession, type DebateMessage } from "@/hooks/useDebateHistory";

interface Attachment {
  type: "image" | "video" | "document";
  mimeType: string;
  data: string;
  name?: string;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function SessionReview() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session");

  const { sessions, loadSessions } = useDebateHistory();
  const [session, setSession] = useState<DebateSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Load all sessions then find the target one
  useEffect(() => {
    async function load() {
      await loadSessions("");
      setLoading(false);
    }
    load();
  }, [loadSessions]);

  useEffect(() => {
    if (!sessionId || sessions.length === 0) return;
    const found = sessions.find((s) => s.id === sessionId);
    setSession(found ?? null);
  }, [sessionId, sessions]);

  const handleContinue = () => {
    if (!session) return;
    // Encode session ID so Debate.tsx can preload messages
    navigate(`/debate?topic=${encodeURIComponent(session.topic)}&continueSession=${session.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Sparkles className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-center px-6">
        <MessageCircle className="h-10 w-10 text-muted-foreground/40" />
        <h2 className="font-display text-2xl font-bold text-foreground">Session not found</h2>
        <p className="text-muted-foreground">This debate session may have been deleted or doesn't exist.</p>
        <Link to="/history">
          <Button variant="outline">Back to History</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="glass-card border-b border-border/30 h-14 flex items-center px-4 gap-3 shrink-0 sticky top-0 z-10">
        <Link to="/history">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-foreground text-sm leading-none truncate">{session.topic}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatTime(session.created_at)} · {Math.floor((session.messages?.length || 0) / 2)} turns
          </p>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleContinue}
            className="text-xs border-primary/40 text-primary hover:bg-primary/10"
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Continue Debate
          </Button>
        </div>
      </header>

      {/* Read-only transcript */}
      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center gap-2 mb-6 text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span className="text-sm font-medium">Read-only replay — scroll to review your debate</span>
          </div>

          <div className="flex flex-col gap-4">
            {(session.messages ?? []).map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold
                    ${msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary border border-border text-muted-foreground"
                    }`}
                >
                  {msg.role === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed
                    ${msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm shadow-md"
                      : "glass-card border border-border/50 text-foreground rounded-tl-sm shadow-sm"
                    }`}
                >
                  {/* Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-col gap-2 mb-3">
                      {msg.attachments.map((att: Attachment, idx: number) => (
                        <div key={idx} className="rounded-lg overflow-hidden bg-black/20 border border-white/10">
                          {att.type === "image" && (
                            <img src={att.data} alt={att.name || "Upload"} className="max-h-64 w-full object-contain" />
                          )}
                          {att.type === "video" && (
                            <video controls src={att.data} className="max-h-64 w-full" />
                          )}
                          {att.type === "document" && (
                            <div className="p-2 flex items-center gap-2">
                              <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center">
                                <FileText className="h-4 w-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-medium truncate text-white">{att.name || "Document"}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {msg.timestamp && (
                    <p className={`text-[10px] mt-2 flex items-center gap-1 
                      ${msg.role === "user" ? "text-primary-foreground/60 justify-end" : "text-muted-foreground"}`}>
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-12 flex flex-col sm:flex-row gap-3 items-center justify-center py-8 border-t border-border/30">
            <p className="text-muted-foreground text-sm">Want to jump back in?</p>
            <Button onClick={handleContinue} className="bg-primary text-primary-foreground px-6">
              <Play className="h-4 w-4 mr-2" />
              Continue this Debate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
