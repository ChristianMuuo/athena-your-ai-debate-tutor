import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DebateMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface DebateSession {
  id: string;
  topic: string;
  messages: DebateMessage[];
  created_at: string;
}

interface UseDebateHistoryReturn {
  sessions: DebateSession[];
  saving: boolean;
  loading: boolean;
  saveSession: (topic: string, messages: DebateMessage[]) => Promise<string | null>;
  loadSessions: (userId: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
}

export function useDebateHistory(): UseDebateHistoryReturn {
  const [sessions, setSessions] = useState<DebateSession[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const saveSession = useCallback(async (topic: string, messages: DebateMessage[]): Promise<string | null> => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("debate_sessions")
        .insert({
          user_id: user.id,
          topic,
          messages: messages as unknown as import("@supabase/supabase-js").Json,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data?.id ?? null;
    } catch (err) {
      console.error("Failed to save debate session:", err);
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const loadSessions = useCallback(async (userId: string): Promise<void> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("debate_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const parsed: DebateSession[] = (data ?? []).map((row) => ({
        id: row.id,
        topic: row.topic,
        messages: (row.messages as unknown as DebateMessage[]) ?? [],
        created_at: row.created_at ?? "",
      }));

      setSessions(parsed);
    } catch (err) {
      console.error("Failed to load debate sessions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSession = useCallback(async (id: string): Promise<void> => {
    await supabase.from("debate_sessions").delete().eq("id", id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { sessions, saving, loading, saveSession, loadSessions, deleteSession };
}
