import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, Play, Pause, RotateCcw, FastForward } from "lucide-react";
import { Button } from "./ui/button";

export interface DebatePhase {
  name: string;
  duration: number; // in seconds
  speaker: "user" | "athena";
}

export interface DebateFormat {
  name: string;
  phases: DebatePhase[];
}

export const DEBATE_FORMATS: Record<string, DebateFormat> = {
  Casual: {
    name: "Casual",
    phases: [
      { name: "Open Exchange", duration: 0, speaker: "user" }
    ]
  },
  "Lincoln-Douglas": {
    name: "Lincoln-Douglas",
    phases: [
      { name: "Affirmative Constructive", duration: 360, speaker: "user" },
      { name: "Cross-Examination", duration: 180, speaker: "athena" },
      { name: "Negative Constructive", duration: 420, speaker: "athena" },
      { name: "Affirmative Rebuttal", duration: 240, speaker: "user" },
      { name: "Negative Rebuttal", duration: 360, speaker: "athena" },
      { name: "Closing", duration: 180, speaker: "user" }
    ]
  },
  "Oxford Style": {
    name: "Oxford Style",
    phases: [
      { name: "Opening Statement", duration: 300, speaker: "user" },
      { name: "Opponent Statement", duration: 300, speaker: "athena" },
      { name: "Rebuttal Phase", duration: 240, speaker: "user" },
      { name: "Final Summary", duration: 120, speaker: "athena" }
    ]
  }
};

interface DebateTimerProps {
  formatName: string;
  onPhaseComplete: (phase: DebatePhase) => void;
  isActive: boolean;
}

export function DebateTimer({ formatName, onPhaseComplete, isActive }: DebateTimerProps) {
  const format = DEBATE_FORMATS[formatName] || DEBATE_FORMATS.Casual;
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(format.phases[0].duration);
  const [isRunning, setIsRunning] = useState(false);

  const currentPhase = format.phases[currentPhaseIndex];

  // Reset when format changes
  useEffect(() => {
    setCurrentPhaseIndex(0);
    setTimeLeft(format.phases[0].duration);
    setIsRunning(false);
  }, [formatName]);

  useEffect(() => {
    let interval: any;
    if (isRunning && isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && format.phases[currentPhaseIndex].duration > 0) {
      setIsRunning(false);
      onPhaseComplete(currentPhase);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, isActive, currentPhase, onPhaseComplete]);

  const toggleTimer = () => setIsRunning(!isRunning);
  
  const nextPhase = useCallback(() => {
    if (currentPhaseIndex < format.phases.length - 1) {
      const nextIdx = currentPhaseIndex + 1;
      setCurrentPhaseIndex(nextIdx);
      setTimeLeft(format.phases[nextIdx].duration);
      setIsRunning(false);
    }
  }, [currentPhaseIndex, format.phases]);

  const resetTimer = () => {
    setTimeLeft(currentPhase.duration);
    setIsRunning(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (formatName === "Casual") return null;

  return (
    <div className="glass-card border-primary/20 p-4 rounded-2xl shadow-xl flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${isRunning ? 'bg-primary/20 text-primary animate-pulse' : 'bg-secondary text-muted-foreground'}`}>
            <Timer className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Current Phase</p>
            <p className="text-sm font-display font-bold text-foreground">{currentPhase.name}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Time Left</p>
          <p className={`text-2xl font-display font-bold tabular-nums ${timeLeft < 30 ? 'text-red-400' : 'text-primary'}`}>
            {formatTime(timeLeft)}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={toggleTimer}
          className={`flex-1 rounded-xl h-9 border-border hover:border-primary/50 ${isRunning ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : ''}`}
        >
          {isRunning ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
          {isRunning ? "Pause" : "Start Phase"}
        </Button>
        <Button variant="ghost" size="icon" onClick={resetTimer} className="h-9 w-9 border border-border rounded-xl">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={nextPhase} className="h-9 w-9 border border-border rounded-xl">
          <FastForward className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-1 mt-1">
        {format.phases.map((_, i) => (
          <div 
            key={i} 
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
              i < currentPhaseIndex ? 'bg-primary' : i === currentPhaseIndex ? 'bg-primary/30' : 'bg-secondary'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
