import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, TrendingUp, Target, Brain, Trophy, Clock, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, BarChart, Bar } from "recharts";

const progressData = [
  { week: "W1", mastery: 15, avgStudent: 10 },
  { week: "W2", mastery: 28, avgStudent: 18 },
  { week: "W3", mastery: 42, avgStudent: 25 },
  { week: "W4", mastery: 55, avgStudent: 32 },
  { week: "W5", mastery: 68, avgStudent: 38 },
  { week: "W6", mastery: 82, avgStudent: 44 },
  { week: "W7", mastery: 91, avgStudent: 50 },
  { week: "W8", mastery: 96, avgStudent: 55 },
];

const skillsData = [
  { subject: "Algorithms", you: 88, avg: 52 },
  { subject: "Data Structures", you: 92, avg: 58 },
  { subject: "Recursion", you: 75, avg: 45 },
  { subject: "OOP", you: 85, avg: 60 },
  { subject: "Databases", you: 70, avg: 48 },
  { subject: "Networks", you: 65, avg: 42 },
];

const weeklyActivity = [
  { day: "Mon", sessions: 3, problems: 8 },
  { day: "Tue", sessions: 2, problems: 5 },
  { day: "Wed", sessions: 4, problems: 12 },
  { day: "Thu", sessions: 1, problems: 3 },
  { day: "Fri", sessions: 3, problems: 9 },
  { day: "Sat", sessions: 5, problems: 15 },
  { day: "Sun", sessions: 2, problems: 6 },
];

const stats = [
  { icon: TrendingUp, label: "Mastery Score", value: "96%", change: "+12% this week", color: "text-primary" },
  { icon: Target, label: "Problems Solved", value: "247", change: "+34 this week", color: "text-agent-executor" },
  { icon: Brain, label: "Concepts Learned", value: "68", change: "+8 this week", color: "text-agent-planner" },
  { icon: Trophy, label: "Streak", value: "14 days", change: "Personal best!", color: "text-agent-psychologist" },
  { icon: Clock, label: "Study Time", value: "42h", change: "6h this week", color: "text-agent-historian" },
  { icon: Zap, label: "vs. Avg Student", value: "+42%", change: "Faster mastery", color: "text-agent-challenger" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass-card border-b border-border/30 h-14 flex items-center px-6 sticky top-0 z-10">
        <Link to="/">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Sparkles className="h-5 w-5 text-primary ml-2" />
        <span className="font-display font-bold text-foreground ml-2">ATHENA Analytics</span>
        <Link to="/chat" className="ml-auto">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-display text-sm">
            Open Tutor
          </Button>
        </Link>
      </header>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Welcome */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <h1 className="font-display text-3xl font-bold text-foreground mb-1">Welcome back, Student 🎓</h1>
          <p className="text-muted-foreground">You're learning <span className="text-primary font-semibold">42% faster</span> than the average CS student. Keep it up!</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stats.map((stat, i) => (
            <motion.div key={stat.label} initial="hidden" animate="visible" variants={fadeUp} custom={i + 1}
              className="glass-card p-4 hover:border-primary/20 transition-colors">
              <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
              <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-xs text-primary mt-1">{stat.change}</p>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Progress Chart */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={7} className="glass-card p-6">
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">Learning Progress vs Average</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={progressData}>
                <defs>
                  <linearGradient id="colorMastery" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(38, 92%, 55%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(38, 92%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                <XAxis dataKey="week" stroke="hsl(215, 16%, 55%)" fontSize={12} />
                <YAxis stroke="hsl(215, 16%, 55%)" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(222, 44%, 9%)", border: "1px solid hsl(222, 30%, 18%)", borderRadius: "8px", color: "hsl(210, 40%, 93%)" }} />
                <Area type="monotone" dataKey="mastery" stroke="hsl(38, 92%, 55%)" fill="url(#colorMastery)" strokeWidth={2} name="You" />
                <Area type="monotone" dataKey="avgStudent" stroke="hsl(215, 16%, 55%)" fill="transparent" strokeWidth={1.5} strokeDasharray="5 5" name="Average" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Skills Radar */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={8} className="glass-card p-6">
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">Skills Radar</h3>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={skillsData}>
                <PolarGrid stroke="hsl(222, 30%, 18%)" />
                <PolarAngleAxis dataKey="subject" stroke="hsl(215, 16%, 55%)" fontSize={11} />
                <Radar name="You" dataKey="you" stroke="hsl(38, 92%, 55%)" fill="hsl(38, 92%, 55%)" fillOpacity={0.2} strokeWidth={2} />
                <Radar name="Average" dataKey="avg" stroke="hsl(215, 16%, 55%)" fill="transparent" strokeWidth={1} strokeDasharray="4 4" />
                <Tooltip contentStyle={{ background: "hsl(222, 44%, 9%)", border: "1px solid hsl(222, 30%, 18%)", borderRadius: "8px", color: "hsl(210, 40%, 93%)" }} />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Weekly Activity */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={9} className="glass-card p-6">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">Weekly Activity</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
              <XAxis dataKey="day" stroke="hsl(215, 16%, 55%)" fontSize={12} />
              <YAxis stroke="hsl(215, 16%, 55%)" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(222, 44%, 9%)", border: "1px solid hsl(222, 30%, 18%)", borderRadius: "8px", color: "hsl(210, 40%, 93%)" }} />
              <Bar dataKey="problems" fill="hsl(38, 92%, 55%)" radius={[4, 4, 0, 0]} name="Problems Solved" />
              <Bar dataKey="sessions" fill="hsl(270, 70%, 60%)" radius={[4, 4, 0, 0]} name="Sessions" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}
