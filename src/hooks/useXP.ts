import { useState, useEffect } from "react";

export function useXP() {
  const [xp, setXp] = useState<number>(0);

  // Load XP from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("athena_xp");
    if (saved) {
      setXp(parseInt(saved, 10));
    }
  }, []);

  const addXp = (amount: number) => {
    setXp((prev) => {
      const newXp = prev + amount;
      localStorage.setItem("athena_xp", newXp.toString());
      return newXp;
    });
  };

  // Level formula: Level 1 is 0-99, Level 2 is 100-199...
  const level = Math.floor(xp / 100) + 1;
  const currentLevelXp = xp % 100;
  const nextLevelXp = 100; // Always 100 XP to the next level
  const progressPercent = (currentLevelXp / nextLevelXp) * 100;

  return { xp, level, currentLevelXp, nextLevelXp, progressPercent, addXp };
}
