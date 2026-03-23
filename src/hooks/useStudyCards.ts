import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StudyCard {
  id: string;
  front: string;
  back: string;
  mastery_level: number;
  next_review: string;
}

const LOCAL_KEY = "athena_study_cards";

function localLoad(): StudyCard[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]");
  } catch (err) {
    console.error("Failed to load local cards:", err);
    return [];
  }
}

function localSave(cards: StudyCard[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(cards));
}

export function useStudyCards() {
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCards = useCallback(async () => {
    setLoading(true);
    let supabaseCards: StudyCard[] = [];
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("study_cards")
          .select("*")
          .eq("user_id", user.id)
          .lte("next_review", new Date().toISOString())
          .order("created_at", { ascending: false });

        if (!error && data) {
          supabaseCards = data;
        }
      }
    } catch (err) {
      console.warn("Supabase cards loading failed, using local only:", err);
    }

    const local = localLoad().filter(c => new Date(c.next_review) <= new Date());
    const combined = [...supabaseCards];
    // Add local cards that aren't already in Supabase (by ID)
    local.forEach(lc => {
      if (!combined.find(sc => sc.id === lc.id)) combined.push(lc);
    });
    
    setCards(combined);
    setLoading(false);
  }, []);

  const saveCards = useCallback(async (newCards: { front: string; back: string }[], sessionId?: string) => {
    const localToSave: StudyCard[] = [];
    const now = new Date().toISOString();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const cardsToInsert = newCards.map(c => ({
          user_id: user.id,
          session_id: sessionId,
          front: c.front,
          back: c.back,
        }));

        const { error } = await supabase.from("study_cards").insert(cardsToInsert);
        if (error) {
          console.warn("Supabase card save failed, falling back to local:", error.message);
        } else {
          return; // Successfully saved to cloud
        }
      }
    } catch (err) {
      console.warn("Supabase unavailable for card save:", err);
    }

    // Fallback to local
    const existing = localLoad();
    const additions = newCards.map(c => ({
      id: crypto.randomUUID(),
      front: c.front,
      back: c.back,
      mastery_level: 0,
      next_review: now,
      created_at: now
    }));
    localSave([...additions, ...existing].slice(0, 100));
  }, []);

  const updateMastery = useCallback(async (id: string, currentLevel: number, success: boolean) => {
    const nextLevel = success ? Math.min(currentLevel + 1, 5) : 0;
    const intervalDays = [0.5, 1, 3, 7, 14, 30][nextLevel];
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + intervalDays);
    const nextReviewStr = nextReview.toISOString();

    try {
      const { error } = await supabase
        .from("study_cards")
        .update({ mastery_level: nextLevel, next_review: nextReviewStr })
        .eq("id", id);
      
      if (!error) {
        setCards(prev => prev.filter(c => c.id !== id));
        return;
      }
    } catch (err) {
      console.warn("Supabase mastery update failed:", err);
    }

    // Local update
    const local = localLoad();
    const idx = local.findIndex(c => c.id === id);
    if (idx > -1) {
      local[idx].mastery_level = nextLevel;
      local[idx].next_review = nextReviewStr;
      localSave(local);
    }
    setCards(prev => prev.filter(c => c.id !== id));
  }, []);

  return { cards, loading, loadCards, saveCards, updateMastery };
}
