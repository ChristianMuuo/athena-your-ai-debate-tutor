import { Star, Trophy, ArrowUp } from "lucide-react";
import { motion } from "framer-motion";
import { useXP } from "@/hooks/useXP";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "react-router-dom";

export function XPBar() {
  const { xp, level, progressPercent, currentLevelXp, nextLevelXp } = useXP();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link to="/analytics" className="flex items-center gap-3 bg-secondary/80 hover:bg-secondary border border-border/50 px-5 py-2.5 rounded-full transition-colors cursor-pointer shrink-0 shadow-sm">
            <div className="flex items-center gap-2 text-primary">
              <Trophy className="w-5 h-5" />
              <span className="font-display font-bold text-sm tracking-wide">
                LVL {level}
              </span>
            </div>
            
            <div className="w-24 sm:w-32 lg:w-48 shrink-0 mx-2 flex flex-col gap-1 justify-center">
              <Progress value={progressPercent} className="h-2.5 w-full bg-border/50" />
            </div>

            <div className="flex items-center text-muted-foreground hidden sm:flex">
              <span className="font-mono text-xs font-semibold tracking-tight">
                {currentLevelXp} / {nextLevelXp}
              </span>
            </div>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-sm p-4 glass-card border-primary/20 bg-background/95">
          <div className="flex flex-col gap-2">
            <p className="font-bold text-foreground flex items-center gap-2">
              <Star className="w-4 h-4 text-primary fill-primary" />
              Total Experience: {xp} XP
            </p>
            <p className="text-muted-foreground flex items-center gap-2 font-medium">
              <ArrowUp className="w-3.5 h-3.5" />
              {100 - currentLevelXp} XP to reach Level {level + 1}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
