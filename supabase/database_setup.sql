-- [ATHENA DATABASE SETUP]
-- Run this in your Supabase SQL Editor to initialize all required tables.

-- 1. Debate Sessions (History)
CREATE TABLE IF NOT EXISTS public.debate_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    messages JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. User Profiles (Personalization)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    weaknesses TEXT[] DEFAULT '{}',
    strengths TEXT[] DEFAULT '{}',
    interests TEXT[] DEFAULT '{}',
    mastery_by_topic JSONB DEFAULT '{}',
    last_analyzed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Study Cards (SRS)
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

-- 4. Enable RLS
ALTER TABLE public.debate_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_cards ENABLE ROW LEVEL SECURITY;

-- 5. Policies
CREATE POLICY "Users can manage their own sessions" ON public.debate_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own profile" ON public.user_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own cards" ON public.study_cards FOR ALL USING (auth.uid() = user_id);
