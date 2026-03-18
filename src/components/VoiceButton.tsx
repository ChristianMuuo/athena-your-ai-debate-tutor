import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2 } from "lucide-react";

interface VoiceButtonProps {
  isListening: boolean;
  isSpeaking: boolean;
  isSupported: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function VoiceButton({
  isListening,
  isSpeaking,
  isSupported,
  onToggle,
  disabled = false,
}: VoiceButtonProps) {
  if (!isSupported) {
    return (
      <button
        disabled
        title="Voice not supported in this browser. Please use Chrome."
        aria-label="Voice not supported"
        className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-secondary border border-border text-muted-foreground cursor-not-allowed opacity-50 shrink-0"
      >
        <MicOff className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-label={isListening ? "Stop listening" : isSpeaking ? "Athena is speaking" : "Press to speak"}
      aria-pressed={isListening}
      className={`relative flex items-center justify-center w-11 h-11 rounded-xl border transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
        isListening
          ? "bg-red-500/20 border-red-500/50 text-red-400"
          : isSpeaking
          ? "bg-primary/10 border-primary/30 text-primary"
          : "bg-secondary border-border text-muted-foreground hover:border-primary/30 hover:text-primary"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {/* Pulse rings when listening */}
      <AnimatePresence>
        {isListening && (
          <>
            <motion.span
              key="ring1"
              className="absolute inset-0 rounded-xl border-2 border-red-400"
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.span
              key="ring2"
              className="absolute inset-0 rounded-xl border-2 border-red-400"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.9, opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Icon */}
      {isSpeaking ? (
        <Volume2 className="h-5 w-5 animate-pulse" />
      ) : (
        <Mic className="h-5 w-5" />
      )}
    </button>
  );
}
