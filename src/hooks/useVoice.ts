import { useState, useRef, useCallback, useEffect } from "react";

interface UseVoiceOptions {
  onTranscript: (text: string) => void;
  lang?: string;
}

interface UseVoiceReturn {
  isListening: boolean;
  isSpeaking: boolean;
  isSupported: boolean;
  interimTranscript: string;
  stats: {
    wpm: number;
    fillers: number;
    pacing: "slow" | "good" | "fast";
  };
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  cancelSpeech: () => void;
  resetStats: () => void;
}

// Detect browser SpeechRecognition support
const SpeechRecognitionAPI =
  (typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
  null;

export function useVoice({ onTranscript, lang = "en-US" }: UseVoiceOptions): UseVoiceReturn {
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [stats, setStats] = useState<UseVoiceReturn["stats"]>({ wpm: 0, fillers: 0, pacing: "good" });
  
  const startTimeRef = useRef<number | null>(null);
  const wordCountRef = useRef(0);
  const fillerWords = ["um", "uh", "like", "basically", "actually", "know"];

  const isSupported = Boolean(SpeechRecognitionAPI);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) return;

    // Cancel any ongoing speech
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);

    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setInterimTranscript("");
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      setInterimTranscript(interim || final);

      if (final) {
        setInterimTranscript("");
        onTranscript(final.trim());

        // Update Stats
        const words = final.trim().split(/\s+/);
        wordCountRef.current += words.length;

        const fillersFound = words.filter(w => fillerWords.includes(w.toLowerCase())).length;
        
        if (startTimeRef.current && wordCountRef.current > 2) {
          const durationMins = (Date.now() - startTimeRef.current) / 60000;
          const wpm = Math.round(wordCountRef.current / durationMins);
          const pacing = wpm < 100 ? "slow" : wpm > 160 ? "fast" : "good";
          
          setStats(prev => ({
            wpm,
            fillers: prev.fillers + fillersFound,
            pacing
          }));
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      setInterimTranscript("");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      startTimeRef.current = Date.now();
      recognition.start();
    } catch (e) {
      console.error("Failed to start recognition:", e);
      setIsListening(false);
    }
  }, [lang, onTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;

    // If text is empty, we are just "priming" the speech engine to unlock it for later (required by some browsers)
    if (!text.trim()) {
      const utterance = new SpeechSynthesisUtterance("");
      window.speechSynthesis.speak(utterance);
      return;
    }

    // Strip markdown formatting before speaking
    const plain = text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/#{1,6}\s/g, "")
      .replace(/`{1,3}[^`]*`{1,3}/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/(\r\n|\n|\r)/gm, " ") // Replace newlines with spaces
      .trim();

    if (!plain) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(plain);
    utterance.lang = lang;
    utterance.rate = 1.0; // Slightly faster for responsiveness
    utterance.pitch = 1.0;

    // Wait for voices to load, then prefer a natural-sounding English voice
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      console.log(`TTS: Found ${voices.length} voices.`);
      
      const preferred = voices.find(
        (v) =>
          (v.name.includes("Google") || v.name.includes("Premium") || v.name.includes("Natural") || v.name.includes("Neural")) &&
          v.lang.startsWith("en")
      );
      const fallback = voices.find((v) => v.lang.startsWith("en"));
      if (preferred || fallback) {
        utterance.voice = preferred ?? fallback!;
        console.log(`TTS: Selected voice: ${utterance.voice.name}`);
      }
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener("voiceschanged", setVoice, { once: true });
    } else {
      setVoice();
    }
    
    utterance.onstart = () => {
      console.log("TTS: Started speaking.");
      setIsSpeaking(true);
    };
    utterance.onend = () => {
      console.log("TTS: Finished speaking.");
      setIsSpeaking(false);
    };
    utterance.onerror = (event) => {
      console.error("TTS: SpeechSynthesisUtterance error", event);
      setIsSpeaking(false);
    };

    // Use a small timeout to ensure the browser has processed the 'cancel' and 'prime' calls 
    setTimeout(() => {
      console.log("TTS: Calling speak()...");
      window.speechSynthesis.speak(utterance);
      
      // If stuck (happens in some Chrome versions), resume
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 50);
  }, [lang]);

  const cancelSpeech = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  const resetStats = useCallback(() => {
    setStats({ wpm: 0, fillers: 0, pacing: "good" });
    wordCountRef.current = 0;
    startTimeRef.current = null;
  }, []);

  return {
    isListening,
    isSpeaking,
    isSupported,
    interimTranscript,
    stats,
    startListening,
    stopListening,
    speak,
    cancelSpeech,
    resetStats,
  };
}
