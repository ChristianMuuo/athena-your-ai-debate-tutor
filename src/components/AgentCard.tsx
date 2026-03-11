import { Agent } from "@/lib/agents";

export function AgentCard({ agent }: { agent: Agent }) {
  const Icon = agent.icon;
  return (
    <div className="glass-card p-6 hover:border-primary/30 transition-all group cursor-pointer">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl bg-${agent.color}/20 shrink-0`}>
          <Icon className={`h-6 w-6 text-${agent.color}`} />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display text-lg font-semibold text-foreground">{agent.name}</h3>
            <span className="text-xs text-muted-foreground italic">{agent.title}</span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{agent.description}</p>
          <p className="text-xs text-muted-foreground/70 italic">"{agent.personality}"</p>
        </div>
      </div>
    </div>
  );
}
