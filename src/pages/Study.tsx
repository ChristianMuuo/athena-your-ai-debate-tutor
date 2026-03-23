import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Brain, CheckCircle2, XCircle, RotateCcw, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useStudyCards, type StudyCard } from "@/hooks/useStudyCards";
import { toast } from "sonner";
import { stripMarkdownSymbols } from "@/lib/stringUtils";

export default function Study() {
  const { cards, loading, loadCards, updateMastery } = useStudyCards();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const currentCard = cards[currentIndex];

  const handleScore = async (success: boolean) => {
    if (!currentCard) return;
    
    try {
      await updateMastery(currentCard.id, currentCard.mastery_level, success);
      if (currentIndex < cards.length - 1) {
        setIsFlipped(false);
        setTimeout(() => setCurrentIndex(prev => prev + 1), 300);
      } else {
        setIsFinished(true);
      }
    } catch (err) {
      toast.error("Failed to update card mastery.");
    }
  };

  if (loading && cards.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Brain className="h-12 w-12 text-primary mx-auto animate-pulse" />
          <p className="text-muted-foreground animate-pulse font-display">Preparing your study session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="glass-card border-b border-border/30 h-14 flex items-center px-4 gap-3 shrink-0 z-10 sticky top-0">
        <Link to="/">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Brain className="h-5 w-5 text-primary" />
        <span className="font-display font-bold text-foreground">Study Deck</span>
        <div className="ml-auto text-xs text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
          {currentIndex + 1} / {cards.length}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {cards.length === 0 && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-6 max-w-sm">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold">All caught up!</h1>
            <p className="text-muted-foreground">You've finished all your scheduled reviews. Engage in more debates to generate new cards.</p>
            <Link to="/debate">
              <Button className="w-full">Start a New Debate</Button>
            </Link>
          </motion.div>
        )}

        {currentCard && !isFinished && (
          <div className="w-full max-w-md perspective-1000">
            <motion.div
              layout
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
              className="relative w-full aspect-[4/3] preserve-3d cursor-pointer"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              {/* Front */}
              <div className="absolute inset-0 backface-hidden glass-card p-8 flex flex-col items-center justify-center text-center shadow-2xl border-primary/20 bg-secondary/5">
                <span className="text-xs font-bold text-primary tracking-widest uppercase mb-4 opacity-50">Question / Fact</span>
                <p className="text-xl font-display font-semibold leading-relaxed text-foreground">
                  {stripMarkdownSymbols(currentCard.front)}
                </p>
                <p className="mt-8 text-xs text-muted-foreground animate-bounce">Click to flip</p>
              </div>

              {/* Back */}
              <div className="absolute inset-0 backface-hidden glass-card p-8 flex flex-col items-center justify-center text-center shadow-2xl border-green-500/20 bg-green-500/5 rotate-y-180">
                <span className="text-xs font-bold text-green-500 tracking-widest uppercase mb-4 opacity-50">Explanation</span>
                <div className="text-lg leading-relaxed text-foreground">
                  {stripMarkdownSymbols(currentCard.back)}
                </div>
              </div>
            </motion.div>

            <AnimatePresence>
              {isFlipped && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-8 flex gap-4"
                >
                  <Button variant="outline" className="flex-1 border-red-500/30 text-red-500 hover:bg-red-500/10 h-14" onClick={() => handleScore(false)}>
                    <XCircle className="h-5 w-5 mr-2" /> Forgot
                  </Button>
                  <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white h-14" onClick={() => handleScore(true)}>
                    <CheckCircle2 className="h-5 w-5 mr-2" /> Mastered
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {isFinished && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="font-display text-3xl font-bold">Session Complete!</h2>
            <p className="text-muted-foreground">Great job! Your brain is growing. Come back tomorrow for more spaced repetition.</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => { setCurrentIndex(0); setIsFlipped(false); setIsFinished(false); loadCards(); }}>
                <RotateCcw className="h-4 w-4 mr-2" /> Review Again
              </Button>
              <Link to="/">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
