import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Brain, Code2, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { agents } from "@/lib/agents";
import { AgentCard } from "@/components/AgentCard";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Brain, title: "Multi-Agent Debates", desc: "6 specialized AI agents argue, teach, and guide you in real time." },
  { icon: Code2, title: "Live Code Execution", desc: "Run Python, JS, Java & C++ in a secure sandbox with benchmarking." },
  { icon: Shield, title: "Predictive Tutoring", desc: "ML detects when you're about to struggle — before you even know." },
  { icon: Sparkles, title: "Self-Improving", desc: "ATHENA experiments with teaching styles and learns what works for you." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 glass-card border-b border-border/30">
        <div className="container mx-auto flex items-center justify-between h-16 px-6">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-bold tracking-tight text-foreground">ATHENA</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/chat">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">Try Demo</Button>
            </Link>
            <Link to="/interview">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">Interview</Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">Dashboard</Button>
            </Link>
            <Link to="/chat">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-display font-semibold">
                Launch ATHENA <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
        </div>

        <div className="container mx-auto text-center relative z-10">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-8">
              <Sparkles className="h-3.5 w-3.5" /> Multi-Agent AI Tutor
            </span>
          </motion.div>

          <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1}
            className="font-display text-5xl md:text-7xl font-bold tracking-tight leading-tight max-w-4xl mx-auto mb-6">
            The AI Tutor That{" "}
            <span className="text-gradient-primary">Debates Solutions</span>{" "}
            With You
          </motion.h1>

          <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            ATHENA deploys 6 specialized AI agents that argue, test code live, predict your struggles,
            and evolve into better teachers — every single day.
          </motion.p>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="flex items-center justify-center gap-4">
            <Link to="/chat">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-display font-semibold text-lg px-8 py-6 animate-pulse-glow">
                Start Learning <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button size="lg" variant="outline" className="border-border hover:bg-secondary text-foreground font-display text-lg px-8 py-6">
                View Dashboard
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="font-display text-3xl md:text-4xl font-bold text-center mb-16">
            Why ATHENA is <span className="text-gradient-primary">Different</span>
          </motion.h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="glass-card p-6 hover:border-primary/30 transition-colors group">
                <f.icon className="h-10 w-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-display text-lg font-semibold mb-2 text-foreground">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Agents */}
      <section className="py-24 px-6 bg-secondary/20">
        <div className="container mx-auto">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="font-display text-3xl md:text-4xl font-bold text-center mb-4">
            Meet Your <span className="text-gradient-primary">AI Team</span>
          </motion.h2>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
            className="text-muted-foreground text-center max-w-xl mx-auto mb-16">
            Six specialized agents that collaborate, challenge, and support your learning journey.
          </motion.p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent, i) => (
              <motion.div key={agent.id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}>
                <AgentCard agent={agent} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="container mx-auto text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="glass-card p-12 max-w-2xl mx-auto glow-primary">
            <h2 className="font-display text-3xl font-bold mb-4 text-foreground">Ready to Learn Differently?</h2>
            <p className="text-muted-foreground mb-8">Experience the future of CS education with ATHENA's multi-agent debate system.</p>
            <Link to="/chat">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-display font-semibold text-lg px-8 py-6">
                Launch ATHENA <Sparkles className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="container mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-display font-semibold text-foreground">ATHENA</span>
            <span>· Adaptive Tutor Harnessing Expert Networked Agents</span>
          </div>
          <span>Built with ❤️ for CS students</span>
        </div>
      </footer>
    </div>
  );
}
