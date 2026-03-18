import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, LogOut, BookOpen } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useDebateHistory } from "@/hooks/useDebateHistory";
import { agents, Agent } from "@/lib/agents";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  // We'll reuse useDebateHistory for now to fetch past sessions
  const { sessions, loading } = useDebateHistory();

  const handleStartSession = (agent: Agent) => {
    // In the future we can pass mode and agent ID
    navigate(`/debate?topic=${encodeURIComponent("General Study")}&agent=${agent.id}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="glass-card border-b border-border/30 h-16 flex items-center px-6 sticky top-0 z-10">
        <Link to="/" className="flex items-center gap-2 mr-6">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-display font-bold text-foreground">ATHENA HUB</span>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <Button variant="ghost" onClick={signOut} className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-6 py-10 flex-1 flex flex-col gap-12">
        {/* Welcome */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <h1 className="font-display text-4xl font-bold text-foreground mb-2">
            Welcome back, {user?.email?.split('@')[0] || "Student"} 🎓
          </h1>
          <p className="text-lg text-muted-foreground">
            Who would you like to learn with today?
          </p>
        </motion.div>

        {/* Tutors Grid */}
        <div>
          <h2 className="text-2xl font-display font-semibold mb-6 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Expert Tutors
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent, i) => (
              <motion.div
                key={agent.id}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={i + 1}
                onClick={() => handleStartSession(agent)}
                className="glass-card p-6 rounded-2xl cursor-pointer hover:border-primary/50 group transition-all duration-300 hover:shadow-[0_0_30px_hsl(var(--primary)/0.1)] flex flex-col h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-secondary border border-border group-hover:bg-primary/10 group-hover:border-primary/30 transition-colors`}>
                    <agent.icon className={`h-6 w-6 text-primary`} />
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary/80 text-muted-foreground">
                    {agent.title}
                  </span>
                </div>
                <h3 className="text-xl font-display font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {agent.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 flex-1">
                  {agent.description}
                </p>
                <div className="text-xs font-medium text-foreground/70 bg-secondary/50 p-3 rounded-lg mt-auto">
                  <span className="text-primary italic">"{agent.personality}"</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent Sessions */}
        <div>
          <h2 className="text-2xl font-display font-semibold mb-6">Recent Sessions</h2>
          {loading ? (
            <div className="glass-card p-8 rounded-2xl flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            </div>
          ) : sessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.slice(0, 3).map((session, i) => (
                <motion.div
                  key={session.id}
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                  custom={i + agents.length + 1}
                  className="glass-card p-5 rounded-xl hover:bg-secondary/20 transition-colors"
                >
                  <p className="font-medium text-foreground line-clamp-1 mb-1">{session.topic}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(session.created_at).toLocaleDateString()} • {session.messages.length} messages
                  </p>
                  <Link to={`/history?session=${session.id}`}>
                    <Button variant="link" className="px-0 h-auto mt-3 text-primary text-sm">
                      Review Session &rarr;
                    </Button>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="glass-card p-8 rounded-2xl text-center border-dashed">
              <p className="text-muted-foreground">No recent study sessions found.</p>
              <Button variant="outline" className="mt-4" onClick={() => handleStartSession(agents[0])}>
                Start Your First Session
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
