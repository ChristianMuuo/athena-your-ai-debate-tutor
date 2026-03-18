import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setPending(true);

    const { error } =
      tab === "signin"
        ? await signIn(email, password)
        : await signUp(email, password);

    setPending(false);

    if (error) {
      toast.error(error);
    } else {
      toast.success(tab === "signin" ? "Welcome back!" : "Account created — welcome to ATHENA!");
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="glass-card w-full max-w-md p-8 relative" onClick={(e) => e.stopPropagation()}>
              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Logo */}
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="h-6 w-6 text-primary" />
                <span className="font-display text-xl font-bold text-foreground">ATHENA</span>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-secondary rounded-lg mb-6">
                {(["signin", "signup"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                      tab === t
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "signin" ? "Sign In" : "Create Account"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    required
                    className="w-full bg-secondary border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {/* Password */}
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    minLength={6}
                    className="w-full bg-secondary border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={pending}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-display font-semibold"
                >
                  {pending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Please wait…</>
                  ) : tab === "signin" ? "Sign In" : "Create Account"}
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground mt-6">
                Save your debate history and track progress across sessions.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
