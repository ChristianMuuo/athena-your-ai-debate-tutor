import { Link } from "react-router-dom";
import { Sparkles, TrendingUp, CheckCircle, Brain, Target, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  BarChart, Bar,
} from "recharts";
import { useAnalytics } from "@/hooks/useAnalytics";

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "#18181b",
    border: "1px solid #3f3f46",
    borderRadius: "8px",
    fontSize: "12px",
    color: "white",
  },
};

export function AnalyticsDashboard() {
  const {
    totalXp, level, totalSessions, totalMessages,
    streakDays, conceptsLearned, vsAvgPercent,
    weeklyActivity, masteryProgress, skillsRadar,
  } = useAnalytics();

  const masteryPct = Math.min(100, Math.round((totalXp / Math.max(totalXp + 50, 100)) * 100));

  return (
    <div className="flex flex-col gap-6 w-full mt-4">
      {/* Section header */}
      <section className="mb-2">
        <h2 className="text-2xl md:text-[28px] font-display font-bold text-foreground mb-2 flex items-center gap-3 tracking-tight">
          Your Performance Insights 📊
        </h2>
        <p className="text-[#a1a1aa] text-sm tracking-wide">
          {vsAvgPercent > 0
            ? <>You're learning <span className="text-[#facc15] font-semibold">+{vsAvgPercent}%</span> faster than the average student — keep it up!</>
            : "Start a debate to see your personalised insights!"}
        </p>
      </section>

      {/* 6 Stats Cards – real data */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-2">
        <div className="bg-[#121215] p-5 rounded-xl flex flex-col gap-3 shadow-sm border border-white/5">
          <TrendingUp className="w-4 h-4 text-[#facc15]" />
          <div>
            <p className="text-xl font-bold text-white tracking-tight">{masteryPct}%</p>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mt-1 mb-1">Mastery Score</p>
            <p className="text-[10px] text-[#facc15] font-semibold">{totalXp} total XP</p>
          </div>
        </div>

        <div className="bg-[#121215] p-5 rounded-xl flex flex-col gap-3 shadow-sm border border-white/5">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <div>
            <p className="text-xl font-bold text-white tracking-tight">{totalSessions}</p>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mt-1 mb-1">Sessions Done</p>
            <p className="text-[10px] text-[#facc15] font-semibold">{totalMessages} total msgs</p>
          </div>
        </div>

        <div className="bg-[#121215] p-5 rounded-xl flex flex-col gap-3 shadow-sm border border-white/5">
          <Brain className="w-4 h-4 text-purple-400" />
          <div>
            <p className="text-xl font-bold text-white tracking-tight">{conceptsLearned}</p>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mt-1 mb-1">Concepts Learned</p>
            <p className="text-[10px] text-[#facc15] font-semibold">{totalXp} XP earned</p>
          </div>
        </div>

        <div className="bg-[#121215] p-5 rounded-xl flex flex-col gap-3 shadow-sm border border-white/5">
          <Target className="w-4 h-4 text-pink-400" />
          <div>
            <p className="text-xl font-bold text-white tracking-tight">{streakDays} day{streakDays !== 1 ? "s" : ""}</p>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mt-1 mb-1">Streak</p>
            <p className="text-[10px] text-[#facc15] font-semibold">{streakDays > 0 ? "Keep going!" : "Start today!"}</p>
          </div>
        </div>

        <div className="bg-[#121215] p-5 rounded-xl flex flex-col gap-3 shadow-sm border border-white/5">
          <Clock className="w-4 h-4 text-amber-500" />
          <div>
            <p className="text-xl font-bold text-white tracking-tight">{Math.round(totalMessages * 1.5)}m</p>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mt-1 mb-1">Study Time</p>
            <p className="text-[10px] text-[#facc15] font-semibold">~90s / message</p>
          </div>
        </div>

        <div className="bg-[#121215] p-5 rounded-xl flex flex-col gap-3 shadow-sm border border-white/5">
          <Zap className="w-4 h-4 text-rose-500" />
          <div>
            <p className="text-xl font-bold text-white tracking-tight">{vsAvgPercent > 0 ? `+${vsAvgPercent}%` : "—"}</p>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mt-1 mb-1">vs. Avg Student</p>
            <p className="text-[10px] text-[#facc15] font-semibold">Faster mastery</p>
          </div>
        </div>
      </section>

      {/* Charts Row */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="col-span-1 lg:col-span-3 bg-[#121215] rounded-xl p-6 border border-white/5 shadow-sm">
          <h3 className="text-[13px] font-semibold text-zinc-200 mb-8 tracking-wide">Learning Progress over Time</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={masteryProgress} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" tick={{ fill: "#52525b", fontSize: 10 }} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#52525b" tick={{ fill: "#52525b", fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                <RechartsTooltip {...TOOLTIP_STYLE} />
                <Line type="basis" dataKey="student" stroke="#facc15" strokeWidth={2} dot={false} name="You" />
                <Line type="basis" dataKey="average" stroke="#71717a" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Avg" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-1 lg:col-span-2 bg-[#121215] rounded-xl p-6 border border-white/5 shadow-sm">
          <h3 className="text-[13px] font-semibold text-zinc-200 mb-0 tracking-wide">Skills Radar</h3>
          <div className="h-[280px] w-full mt-[-10px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="60%" data={skillsRadar}>
                <PolarGrid stroke="#27272a" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "#71717a", fontSize: 9 }} />
                <Radar name="Student" dataKey="A" stroke="#facc15" fill="#facc15" fillOpacity={0.15} />
                <RechartsTooltip {...TOOLTIP_STYLE} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Weekly Activity */}
      <section className="bg-[#121215] rounded-xl p-6 border border-white/5 shadow-sm mb-6">
        <h3 className="text-[13px] font-semibold text-zinc-200 mb-8 tracking-wide">Weekly Activity (Messages sent)</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyActivity} margin={{ top: 5, right: 0, left: -20, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" stroke="#52525b" tick={{ fill: "#52525b", fontSize: 10 }} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#52525b" tick={{ fill: "#52525b", fontSize: 10 }} tickLine={false} axisLine={false} />
              <RechartsTooltip {...TOOLTIP_STYLE} cursor={{ fill: "#27272a" }} />
              <Bar dataKey="Messages" fill="#facc15" radius={[2, 2, 0, 0]} maxBarSize={40} name="You" />
              <Bar dataKey="AvgMessages" fill="#a855f7" radius={[2, 2, 0, 0]} maxBarSize={40} name="Avg Student" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

export default function Analytics() {
  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col p-4 md:p-8 font-sans">
      <header className="flex justify-between items-center mb-10 w-full max-w-6xl mx-auto gap-4 flex-wrap">
        <div className="flex items-center gap-2 px-2 hover:opacity-80 transition-opacity">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="font-display font-semibold text-foreground text-sm tracking-wide">ATHENA Analytics</h1>
          </Link>
        </div>
        <Link to="/">
          <Button variant="default" className="bg-[#facc15] hover:bg-[#facc15]/90 text-black font-semibold rounded-lg px-6 py-2">
            Open Tutor
          </Button>
        </Link>
      </header>
      <main className="flex-1 w-full max-w-6xl mx-auto flex flex-col">
        <AnalyticsDashboard />
      </main>
    </div>
  );
}
