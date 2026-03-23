import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, FileText, Film, Image as ImageIcon, Search, ShieldAlert, GraduationCap, Calculator, FlaskConical, PenTool, Globe, Terminal } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { stripMarkdownSymbols } from "@/lib/stringUtils";

const AGENT_ICONS: Record<string, any> = {
  athena: Sparkles,
  archimedes: Calculator,
  curie: FlaskConical,
  shakespeare: PenTool,
  rosetta: Globe,
  turing: Terminal,
  "devils-advocate": ShieldAlert,
  philosopher: GraduationCap,
  "fact-checker": Search
};

export interface Attachment {
  type: "image" | "video" | "document";
  mimeType: string;
  data: string;
  name?: string;
}

export interface DebateMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
  timestamp: Date;
  agentName?: string;
  agentIcon?: string;
}

interface DebateChatProps {
  messages: DebateMessage[];
  isStreaming: boolean;
  topic: string;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-2 h-2 rounded-full bg-primary"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">Athena is thinking…</span>
    </div>
  );
}

function AthenaBubble({ content, isLast, agentName, agentIcon }: { content: string; isLast: boolean; agentName?: string; agentIcon?: string }) {
  const Icon = (agentIcon && AGENT_ICONS[agentIcon]) || Sparkles;
  return (
    <div className="flex gap-3 max-w-[85%] md:max-w-[70%]">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0 mt-1">
        <Icon className="h-4 w-4 text-primary" />
      </div>

      <div className="glass-card px-5 py-4 rounded-2xl rounded-tl-md flex-1 overflow-hidden">
        <p className="text-xs text-primary font-display font-semibold mb-2">{agentName || "Athena"}</p>
        <div className="text-sm text-foreground/90 leading-relaxed max-w-none">
          {content ? (
            <p className="whitespace-pre-wrap">{stripMarkdownSymbols(content)}</p>
          ) : isLast ? (
            <TypingDots />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function UserBubble({ content, attachments }: { content: string; attachments?: Attachment[] }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] md:max-w-[70%] bg-primary text-primary-foreground rounded-2xl rounded-br-md px-5 py-4 shadow-lg">
        {attachments && attachments.length > 0 && (
          <div className="flex flex-col gap-2 mb-3">
            {attachments.map((att, i) => (
              <div key={i} className="rounded-lg overflow-hidden bg-black/20 border border-white/10">
                {att.type === "image" && (
                  <img src={att.data} alt={att.name || "Upload"} className="max-h-64 w-full object-contain" />
                )}
                {att.type === "video" && (
                  <video controls src={att.data} className="max-h-64 w-full" />
                )}
                {att.type === "document" && (
                  <div className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate text-white">{att.name || "Document"}</p>
                      <p className="text-[10px] text-white/60">PDF / Text File</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

export function DebateChat({ messages, isStreaming, topic }: DebateChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-5">
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Ready to debate?</h2>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-1">
            Topic: <span className="text-foreground font-medium">"{topic}"</span>
          </p>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            State your position and Athena will take the opposing side. Type or tap the mic to begin.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-6 overflow-x-hidden">
      <AnimatePresence initial={false}>
        {messages.map((msg, idx) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {msg.role === "user" ? (
              <UserBubble content={msg.content} attachments={msg.attachments} />
            ) : (
              <AthenaBubble
                content={msg.content}
                isLast={idx === messages.length - 1 && isStreaming}
                agentName={msg.agentName}
                agentIcon={msg.agentIcon}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  );
}
