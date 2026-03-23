import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StudyCard {
  id: string;
  front: string;
  back: string;
  mastery_level: number;
  next_review: string;
}

export function useStudyCards() {
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCards = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("study_cards")
      .select("*")
      .eq("user_id", user.id)
      .lte("next_review", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCards(data);
    }
    setLoading(false);
  }, []);

  const saveCards = useCallback(async (newCards: { front: string; back: string }[], sessionId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const cardsToInsert = newCards.map(c => ({
      user_id: user.id,
      session_id: sessionId,
      front: c.front,
      back: c.back,
    }));

    const { error } = await supabase.from("study_cards").insert(cardsToInsert);
    if (error) throw error;
  }, []);

  const updateMastery = useCallback(async (id: string, currentLevel: number, success: boolean) => {
    const nextLevel = success ? Math.min(currentLevel + 1, 5) : 0;
    const intervalDays = [0.5, 1, 3, 7, 14, 30][nextLevel];
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + intervalDays);

    const { error } = await supabase
      .from("study_cards")
      .update({ mastery_level: nextLevel, next_review: nextReview.toISOString() })
      .eq("id", id);

    if (!error) {
      setCards(prev => prev.filter(c => c.id !== id));
    }
  }, []);

  return { cards, loading, loadCards, saveCards, updateMastery };
}
