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

const LOCAL_KEY = "athena_debate_sessions";

function localLoad(): DebateSession[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function localSave(sessions: DebateSession[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(sessions));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useDebateHistory(): UseDebateHistoryReturn {
  const [sessions, setSessions] = useState<DebateSession[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const saveSession = useCallback(async (topic: string, messages: DebateMessage[]): Promise<string | null> => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await db
          .from("debate_sessions")
          .insert({ user_id: user.id, topic, messages })
          .select("id")
          .single();

        if (!error && data?.id) {
          setSaving(false);
          return data.id as string;
        }
        console.warn("Supabase save failed, falling back to localStorage:", error?.message);
      }
    } catch (err) {
      console.warn("Supabase unavailable, falling back to localStorage:", err);
    }

    // Local fallback — always works even without Supabase
    const localSession: DebateSession = {
      id: crypto.randomUUID(),
      topic,
      messages,
      created_at: new Date().toISOString(),
    };
    const existing = localLoad();
    const updated = [localSession, ...existing].slice(0, 50);
    localSave(updated);
    setSessions((prev) => [localSession, ...prev]);
    setSaving(false);
    return localSession.id;
  }, []);

  const loadSessions = useCallback(async (userId: string): Promise<void> => {
    setLoading(true);
    try {
      const { data, error } = await db
        .from("debate_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        const parsed: DebateSession[] = data.map((row: {
          id: string; topic: string; messages: DebateMessage[]; created_at: string;
        }) => ({
          id: row.id,
          topic: row.topic,
          messages: row.messages ?? [],
          created_at: row.created_at ?? "",
        }));

        const local = localLoad();
        const localOnly = local.filter(l => !parsed.find(p => p.id === l.id));
        setSessions([...parsed, ...localOnly]);
        setLoading(false);
        return;
      }
    } catch {
      // Supabase unavailable
    }

    setSessions(localLoad());
    setLoading(false);
  }, []);

  const deleteSession = useCallback(async (id: string): Promise<void> => {
    try {
      await db.from("debate_sessions").delete().eq("id", id);
    } catch {
      // ignore
    }
    const updated = localLoad().filter((s) => s.id !== id);
    localSave(updated);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { sessions, saving, loading, saveSession, loadSessions, deleteSession };
}
