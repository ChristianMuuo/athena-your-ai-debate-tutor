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
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  cancelSpeech: () => void;
}

// Detect browser SpeechRecognition support
const SpeechRecognitionAPI =
  (typeof window !== "undefined" &&
    (window.SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition: typeof SpeechRecognition }).webkitSpeechRecognition)) ||
  null;

export function useVoice({ onTranscript, lang = "en-US" }: UseVoiceOptions): UseVoiceReturn {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
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

    recognition.onresult = (event: SpeechRecognitionEvent) => {
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
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      setInterimTranscript("");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
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

    // Strip markdown formatting before speaking
    const plain = text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/#{1,6}\s/g, "")
      .replace(/`{1,3}[^`]*`{1,3}/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim();

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(plain);
    utterance.lang = lang;
    utterance.rate = 0.95;
    utterance.pitch = 1.05;

    // Wait for voices to load, then prefer a natural-sounding English voice
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          (v.name.includes("Google") || v.name.includes("Premium") || v.name.includes("Natural")) &&
          v.lang.startsWith("en")
      );
      const fallback = voices.find((v) => v.lang.startsWith("en"));
      if (preferred || fallback) utterance.voice = preferred ?? fallback!;
    };

    setVoice();
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener("voiceschanged", setVoice, { once: true });
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [lang]);

  const cancelSpeech = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    isListening,
    isSpeaking,
    isSupported,
    interimTranscript,
    startListening,
    stopListening,
    speak,
    cancelSpeech,
  };
}
