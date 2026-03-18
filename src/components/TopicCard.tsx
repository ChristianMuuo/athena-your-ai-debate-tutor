import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface Topic {
  title: string;
  category: string;
  emoji: string;
}

interface TopicCardProps {
  topic: Topic;
  onClick: (topic: Topic) => void;
  index: number;
}

export function TopicCard({ topic, onClick, index }: TopicCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(topic)}
      className="glass-card p-5 text-left w-full hover:border-primary/40 hover:glow-primary transition-all group focus:outline-none focus:ring-2 focus:ring-primary/50"
      aria-label={`Debate topic: ${topic.title}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-2xl">{topic.emoji}</span>
        <MessageCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5" />
      </div>
      <h3 className="font-display text-sm font-semibold text-foreground leading-snug mb-2 group-hover:text-primary transition-colors">
        {topic.title}
      </h3>
      <Badge
        variant="secondary"
        className="text-xs px-2 py-0.5 bg-secondary/80 text-muted-foreground border-border/50"
      >
        {topic.category}
      </Badge>
    </motion.button>
  );
}

export const DEBATE_TOPICS: Topic[] = [
  { title: "Should homework be banned?", category: "Education", emoji: "📚" },
  { title: "Social media does more harm than good", category: "Technology", emoji: "📱" },
  { title: "Universal basic income is necessary", category: "Economics", emoji: "💰" },
  { title: "AI will replace most jobs within 10 years", category: "Future of Work", emoji: "🤖" },
  { title: "Space exploration is a waste of money", category: "Science", emoji: "🚀" },
  { title: "The death penalty should be abolished", category: "Ethics", emoji: "⚖️" },
  { title: "Climate change requires immediate global action", category: "Environment", emoji: "🌍" },
  { title: "Remote work is better than office work", category: "Lifestyle", emoji: "🏠" },
];
