import { motion } from "framer-motion";
import { Network, Activity, Split } from "lucide-react";

export interface ArgumentNode {
  id: string;
  type: "claim" | "rebuttal";
  content: string;
  speaker: string;
  parentId?: string;
  status?: "supported" | "countered" | "neutral";
}

interface ArgumentCanvasProps {
  nodes: ArgumentNode[];
}

export function ArgumentCanvas({ nodes }: ArgumentCanvasProps) {
  if (nodes.length === 0) return (
    <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-secondary/10 rounded-2xl border border-dashed border-border/50">
      <Network className="h-8 w-8 mb-3 opacity-20" />
      <p className="text-xs font-medium">Argument map will appear as the debate progresses...</p>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6 relative custom-scrollbar">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary">Live Argument Canvas</h3>
      </div>

      <div className="space-y-4">
        {nodes.map((node, i) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`relative pl-8 ${node.type === 'rebuttal' ? 'ml-6' : ''}`}
          >
            {/* Connector Line */}
            {node.type === 'rebuttal' && (
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-border/30">
                <div className="absolute top-4 left-0 w-4 h-[2px] bg-border/30" />
              </div>
            )}
            
            <div className={`p-3 rounded-xl border ${
              node.type === 'claim' 
                ? 'bg-primary/5 border-primary/20' 
                : 'bg-secondary/20 border-border/50'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                  node.type === 'claim' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {node.type}
                </span>
                <span className="text-[8px] font-bold text-muted-foreground">{node.speaker}</span>
                {node.status === 'countered' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                {node.status === 'supported' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400" />}
              </div>
              <p className="text-[11px] font-medium leading-tight text-foreground/90">{node.content}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
