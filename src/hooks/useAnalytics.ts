import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface WeeklyPoint {
  name: string;
  Messages: number;
  AvgMessages: number;
}

export interface ProgressPoint {
  name: string;
  student: number;
  average: number;
}

export interface SkillPoint {
  subject: string;
  A: number;
  fullMark: number;
}

export interface AnalyticsData {
  totalXp: number;
  level: number;
  progressPercent: number;
  currentLevelXp: number;
  totalSessions: number;
  totalMessages: number;
  streakDays: number;
  conceptsLearned: number;
  weeklyActivity: WeeklyPoint[];
  masteryProgress: ProgressPoint[];
  skillsRadar: SkillPoint[];
  vsAvgPercent: number;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const AVG_DAILY = 2; // average student messages per day

function getStreakDays(sessionDates: string[]): number {
  if (!sessionDates.length) return 0;
  const uniqueDays = [
    ...new Set(sessionDates.map((d) => new Date(d).toDateString())),
  ].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  let streak = 1;
  for (let i = 0; i < uniqueDays.length - 1; i++) {
    const diff =
      (new Date(uniqueDays[i]).getTime() - new Date(uniqueDays[i + 1]).getTime()) /
      86400000;
    if (diff <= 1) streak++;
    else break;
  }
  return streak;
}

function buildWeeklyActivity(
  sessions: { created_at: string; messages: { role: string }[] }[]
): WeeklyPoint[] {
  const dayMap: Record<string, number> = {};
  DAYS.forEach((d) => (dayMap[d] = 0));

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 6);

  sessions.forEach((s) => {
    const date = new Date(s.created_at);
    if (date >= weekAgo) {
      const day = DAYS[date.getDay()];
      const userMsgs = s.messages.filter((m) => m.role === "user").length;
      dayMap[day] = (dayMap[day] || 0) + userMsgs;
    }
  });

  // Start from 6 days ago to today
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekAgo);
    d.setDate(weekAgo.getDate() + i);
    const name = DAYS[d.getDay()];
    return { name, Messages: dayMap[name] || 0, AvgMessages: AVG_DAILY };
  });
}

function buildMasteryProgress(xp: number, totalSessions: number): ProgressPoint[] {
  // Simulate 8 weeks of progress from 0 to current XP, growing logarithmically
  return Array.from({ length: 8 }, (_, i) => {
    const fraction = (i + 1) / 8;
    const studentValue = Math.min(100, Math.round(fraction * (xp / Math.max(totalSessions, 1)) * 4));
    return {
      name: `W${i + 1}`,
      student: Math.min(100, studentValue + Math.round(fraction * 20)),
      average: Math.min(55, 15 + Math.round(fraction * 40)),
    };
  });
}

function buildSkillsRadar(
  sessions: { topic: string; messages: { role: string; content: string }[] }[]
): SkillPoint[] {
  const domains = [
    { subject: "Argumentation", keywords: ["argument", "claim", "evidence", "reasoning"] },
    { subject: "Critical Thinking", keywords: ["analyze", "evaluate", "assumption", "logic"] },
    { subject: "Rhetoric", keywords: ["persuade", "audience", "appeal", "ethos", "pathos"] },
    { subject: "Research", keywords: ["source", "data", "study", "fact", "statistics"] },
    { subject: "Rebuttal", keywords: ["counter", "refute", "disagree", "however", "rebut"] },
    { subject: "Vocabulary", keywords: ["therefore", "consequently", "nevertheless", "furthermore"] },
  ];

  const allText = sessions
    .flatMap((s) => s.messages)
    .filter((m) => m.role === "user")
    .map((m) => m.content.toLowerCase())
    .join(" ");

  return domains.map(({ subject, keywords }) => {
    const hits = keywords.reduce(
      (count, kw) => count + (allText.split(kw).length - 1),
      0
    );
    const A = Math.min(95, 20 + hits * 5);
    return { subject, A, fullMark: 100 };
  });
}

export function useAnalytics(): AnalyticsData {
  const [data, setData] = useState<AnalyticsData>({
    totalXp: 0,
    level: 1,
    progressPercent: 0,
    currentLevelXp: 0,
    totalSessions: 0,
    totalMessages: 0,
    streakDays: 0,
    conceptsLearned: 0,
    weeklyActivity: DAYS.map((name) => ({ name, Messages: 0, AvgMessages: AVG_DAILY })),
    masteryProgress: Array.from({ length: 8 }, (_, i) => ({
      name: `W${i + 1}`,
      student: 0,
      average: 15 + i * 5,
    })),
    skillsRadar: [
      { subject: "Argumentation", A: 20, fullMark: 100 },
      { subject: "Critical Thinking", A: 20, fullMark: 100 },
      { subject: "Rhetoric", A: 20, fullMark: 100 },
      { subject: "Research", A: 20, fullMark: 100 },
      { subject: "Rebuttal", A: 20, fullMark: 100 },
      { subject: "Vocabulary", A: 20, fullMark: 100 },
    ],
    vsAvgPercent: 0,
  });

  useEffect(() => {
    async function load() {
      // 1. XP from localStorage
      const xp = parseInt(localStorage.getItem("athena_xp") ?? "0", 10);
      const level = Math.floor(xp / 100) + 1;
      const currentLevelXp = xp % 100;
      const progressPercent = (currentLevelXp / 100) * 100;

      // 2. Sessions from Supabase
      let sessions: { created_at: string; topic: string; messages: { role: string; content: string }[] }[] = [];
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: rows } = await supabase
            .from("debate_sessions")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true })
            .limit(50);

          sessions = (rows ?? []).map((r) => ({
            created_at: r.created_at ?? "",
            topic: r.topic ?? "",
            messages: (r.messages as unknown as { role: string; content: string }[]) ?? [],
          }));
        }
      } catch {
        // Supabase may be offline — fall through with empty sessions
      }

      const totalSessions = sessions.length;
      const allUserMsgs = sessions.flatMap((s) =>
        s.messages.filter((m) => m.role === "user")
      );
      const totalMessages = allUserMsgs.length;
      const streakDays = getStreakDays(sessions.map((s) => s.created_at));
      const conceptsLearned = Math.max(0, Math.floor(xp / 15)); // 15xp = 1 concept

      // How much faster vs average (avg = 1 debate per week baseline)
      const vsAvgPercent =
        totalSessions > 0 ? Math.min(200, Math.round(((totalMessages / Math.max(totalSessions, 1)) - 2) * 10)) : 0;

      setData({
        totalXp: xp,
        level,
        progressPercent,
        currentLevelXp,
        totalSessions,
        totalMessages,
        streakDays,
        conceptsLearned,
        weeklyActivity: buildWeeklyActivity(sessions),
        masteryProgress: buildMasteryProgress(xp, totalSessions),
        skillsRadar: buildSkillsRadar(sessions),
        vsAvgPercent,
      });
    }

    load();

    // Re-load when localStorage changes (another tab earns XP)
    const onStorage = (e: StorageEvent) => {
      if (e.key === "athena_xp") load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return data;
}
