# ATHENA — Your AI Debate Tutor

Athena is an open-source React application that acts as a strict but encouraging debate coach. It plays devil's advocate to your strongest convictions, helping you practice argumentation, spot logical fallacies, and get instant feedback.

## Features

- **Voice Mode**: Speak naturally using your browser's microphone and hear Athena's responses spoken back to you (works best in Chrome).
- **Gemini 2.0 Flash Integration**: Lightning-fast, hyper-intelligent debate responses powered by Google's Gemini API.
- **Structured Feedback**: Every response includes a direct rebuttal, a counter-argument, and a probing question to keep you on your toes.
- **Debate History**: Sign in to save your sessions and track your growth over time (powered by Supabase).
- **Beautiful UI**: Built with React, Vite, Tailwind CSS, shadcn/ui, and Framer Motion.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui
- **Animations**: Framer Motion
- **Database & Auth**: Supabase
- **AI Backend**: Google Gemini API (via Supabase Edge Functions or direct fallback)
- **Voice**: Web Speech API (`SpeechRecognition` & `SpeechSynthesis`)

## Getting Started Locally

### Prerequisites
- Node.js (v18+)
- A [Supabase](https://supabase.com/) project
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### Setup

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/ChristianMuuo/athena-your-ai-debate-tutor.git
   cd athena-your-ai-debate-tutor
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   # or
   bun install
   \`\`\`

3. **Environment Variables**
   Rename `.env.example` to `.env` and fill in your Supabase and Gemini credentials:
   \`\`\`env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-public-key
   VITE_SUPABASE_PROJECT_ID=your-project-id
   VITE_GEMINI_API_KEY=your-gemini-api-key
   \`\`\`

4. **Run the development server**
   \`\`\`bash
   npm run dev
   \`\`\`
   Navigate to `http://localhost:8081` (or whichever port Vite opens).

### Supabase Setup (Optional but required for History)

To enable saving debate history:

1. Enable Email/Password authentication in your Supabase dashboard.
2. Run the following SQL migration in your Supabase SQL Editor:
   \`\`\`sql
   create table if not exists debate_sessions (
     id uuid primary key default gen_random_uuid(),
     user_id uuid references auth.users(id) on delete cascade,
     topic text not null,
     messages jsonb not null default '[]',
     created_at timestamptz default now()
   );
   alter table debate_sessions enable row level security;
   create policy "Users see own sessions" on debate_sessions
     for all using (auth.uid() = user_id);
   \`\`\`

### Supabase Edge Function (Optional)

If you want to proxy Gemini requests through the Edge Function instead of direct frontend calls:
1. Ensure your Supabase CLI is linked to your project.
2. Set the Gemini API secret:
   \`\`\`bash
   supabase secrets set GEMINI_API_KEY=your-api-key
   \`\`\`
3. Deploy the function:
   \`\`\`bash
   supabase functions deploy athena-chat
   \`\`\`

## Deployment

This app can be easily deployed to Vercel, Netlify, or similar platforms.
Just make sure to add your `VITE_` environment variables in the platform's dashboard before building.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
