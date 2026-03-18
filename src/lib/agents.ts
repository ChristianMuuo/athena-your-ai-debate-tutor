import { BookOpen, Calculator, FlaskConical, PenTool, Globe, Terminal } from "lucide-react";

export type AgentId = "athena" | "archimedes" | "curie" | "shakespeare" | "rosetta" | "turing";

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
    id: "athena",
    name: "Athena",
    title: "The Critical Thinker",
    icon: BookOpen,
    description: "Your debate coach and general knowledge tutor. She challenges assumptions and builds logic.",
    personality: "Sharp, provocative, and encouraging. Plays devil's advocate beautifully.",
    color: "agent-challenger", // We can repurpose existing tailwind colors
  },
  {
    id: "archimedes",
    name: "Archimedes",
    title: "The Mathematician",
    icon: Calculator,
    description: "Breaks down complex math algorithms and formulas into intuitive, bite-sized steps.",
    personality: "Patient, structured, and precise. Loves using real-world analogies.",
    color: "agent-planner",
  },
  {
    id: "curie",
    name: "Curie",
    title: "The Scientist",
    icon: FlaskConical,
    description: "Explores physics, chemistry, and biology through first-principles thinking.",
    personality: "Curious, empirical, and enthusiastic. Celebrates the wonder of discovery.",
    color: "agent-expert",
  },
  {
    id: "shakespeare",
    name: "Shakespeare",
    title: "The Wordsmith",
    icon: PenTool,
    description: "Helps with creative writing, literature analysis, and mastering essay structure.",
    personality: "Eloquent, thoughtful, and mildly poetic. Loves a good metaphor.",
    color: "agent-historian",
  },
  {
    id: "rosetta",
    name: "Rosetta",
    title: "The Linguist",
    icon: Globe,
    description: "Immersive language partner for Spanish, French, Japanese, and more.",
    personality: "Warm, conversational, and culturally insightful. Focuses on speaking.",
    color: "agent-psychologist",
  },
  {
    id: "turing",
    name: "Turing",
    title: "The Coder",
    icon: Terminal,
    description: "Your pair-programming buddy. Explains code without just giving you the answer.",
    personality: "Logical, hands-on, and helpful. Speaks in code and values clean architecture.",
    color: "agent-executor",
  },
];

export const getAgent = (id: AgentId) => agents.find((a) => a.id === id)!;

