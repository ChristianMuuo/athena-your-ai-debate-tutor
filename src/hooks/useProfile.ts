import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface UserProfile {
  id: string;
  user_id: string;
  weaknesses: string[];
  strengths: string[];
  interests: string[];
  mastery_by_topic: Record<string, number>;
  last_analyzed: string;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setProfile(data as unknown as UserProfile);
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("user_profiles")
        .upsert({
          user_id: user.id,
          ...updates,
          last_analyzed: new Date().toISOString(),
        });

      if (error) throw error;
      await fetchProfile();
    } catch (err) {
      console.error("Error updating profile:", err);
      toast.error("Failed to update learning profile.");
    }
  }, [user, fetchProfile]);

  return { profile, loading, fetchProfile, updateProfile };
}
