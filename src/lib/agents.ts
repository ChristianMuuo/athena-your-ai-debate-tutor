import { BookOpen, Zap, Play, Map, Heart, Clock } from "lucide-react";

export type AgentId = "expert" | "challenger" | "executor" | "planner" | "psychologist" | "historian";

export interface Agent {
  id: AgentId;
  name: string;
  title: string;
  icon: typeof BookOpen;
  description: string;
  personality: string;
  color: string;
}

export const agents: Agent[] = [
  {
    id: "expert",
    name: "Expert",
    title: "The Professor",
    icon: BookOpen,
    description: "Explains concepts with clarity and depth, drawing from vast CS knowledge.",
    personality: "Wise, thorough, and patient. Speaks with authority but never condescension.",
    color: "agent-expert",
  },
  {
    id: "challenger",
    name: "Challenger",
    title: "The Troublemaker",
    icon: Zap,
    description: "Challenges assumptions, introduces edge cases, and stress-tests your understanding.",
    personality: "Playful, provocative, and sharp. Loves a good 'what if?' question.",
    color: "agent-challenger",
  },
  {
    id: "executor",
    name: "Executor",
    title: "The Engineer",
    icon: Play,
    description: "Runs code in a secure sandbox and shows runtime results with performance graphs.",
    personality: "Energetic, hands-on, and precise. Speaks in code as much as words.",
    color: "agent-executor",
  },
  {
    id: "planner",
    name: "Planner",
    title: "The Strategist",
    icon: Map,
    description: "Breaks complex problems into clear, manageable learning steps.",
    personality: "Organized, calm, and structured. Loves numbered lists and roadmaps.",
    color: "agent-planner",
  },
  {
    id: "psychologist",
    name: "Psychologist",
    title: "The Cheerleader",
    icon: Heart,
    description: "Detects frustration and motivates the student with encouragement.",
    personality: "Warm, empathetic, and uplifting. Celebrates every small victory.",
    color: "agent-psychologist",
  },
  {
    id: "historian",
    name: "Historian",
    title: "The Memory Keeper",
    icon: Clock,
    description: "Remembers every past interaction, mistake, and breakthrough.",
    personality: "Thoughtful, nostalgic, and precise. Connects past struggles to current growth.",
    color: "agent-historian",
  },
];

export const getAgent = (id: AgentId) => agents.find((a) => a.id === id)!;
