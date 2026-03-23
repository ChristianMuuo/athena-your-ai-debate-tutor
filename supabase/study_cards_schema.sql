-- Create study_cards table for SRS
CREATE TABLE IF NOT EXISTS public.study_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.debate_sessions(id) ON DELETE SET NULL,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    mastery_level INTEGER DEFAULT 0,
    next_review TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.study_cards ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own cards" ON public.study_cards
    FOR ALL USING (auth.uid() = user_id);

-- Storage bucket for Podcasts (if not already created)
-- Note: Bucket creation is better done via dashboard or CLI, 
-- but this is a reminder for the user.
