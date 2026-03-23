# ATHENA — Your AI Debate Tutor

Athena is an adaptive AI-powered debate coach and tutor designed to transform how people learn, think, and communicate ideas. It plays devil's advocate to your strongest convictions, helping you practice argumentation, spot logical fallacies, and get instant feedback.

## Features

- **Multi-Agent Architecture**: Athena leverages specialized agents (Socratic, Debugger, Optimizer, etc.) to provide deep, personalized learning.
- **Voice Mode**: Speak naturally and hear Athena's responses spoken back to you (works best in Chrome).
- **Multi-Provider AI**: Lightning-fast responses powered by Groq and OpenAI with intelligent retry and fallback logic.
- **Multi-Modal Support**: Analyze images, videos, and documents (PDF, CSV, etc.) for a truly immersive experience.
- **Gamified Learning**: Track your progress with an XP system and skill levels.
- **Debate History**: Sign in to save your sessions and monitor your growth over time.

## Tech Stack

- **Frontend**: React 18, Vite 8 (next-gen dev server)
- **Styling**: Tailwind CSS, shadcn/ui
- **Animations**: Framer Motion
- **Database & Auth**: Supabase
- **AI Backend**: Multi-provider Engine (OpenAI & Groq) via Supabase Edge Functions.
- **Voice**: Web Speech API (`SpeechRecognition` & `SpeechSynthesis`)

## Getting Started Locally

### Prerequisites
- Node.js (v18+)
- A [Supabase](https://supabase.com/) project
- An [OpenAI API Key](https://platform.openai.com/) or [Groq API Key](https://console.groq.com/)

### Setup

1. **Clone the repository**
   ```bash
   cd athena-your-ai-debate-tutor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   Rename `.env.example` to `.env` and fill in your credentials:
   ```env
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_PUBLISHABLE_KEY=...
   VITE_OPENAI_API_KEY=your-key
   VITE_OPENAI_BASE_URL=https://api.openai.com/v1
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

## License

This project is licensed under the MIT License.
