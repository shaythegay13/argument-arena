import { Crown, Check, Zap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

const FREE_FEATURES = [
  "2 startup evaluations",
  "Basic verdict (GO / MAYBE / NO-GO)",
  "4 rounds of debate",
];

const PRO_FEATURES = [
  "Unlimited debates",
  "Full judge scorecards & metrics",
  "Shareable result pages",
  "Downloadable PDF reports",
  "Advanced analysis & insights",
  "Priority AI processing",
];

export default function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const { toast } = useToast();

  const handleUpgrade = () => {
    localStorage.setItem("startup_jury_pro", "true");
    toast({
      title: "Welcome to Pro! 🎉",
      description: "You now have unlimited access to all features.",
    });
    onClose();
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative w-full max-w-lg rounded-[14px] border border-border bg-card shadow-2xl overflow-hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="px-6 pt-8 pb-4 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center mx-auto mb-4">
                <Crown className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Upgrade to Pro</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Unlock unlimited evaluations and advanced features
              </p>
            </div>

            <div className="px-6 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[14px] border border-border p-4 space-y-3">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">Free</p>
                    <p className="text-2xl font-bold text-foreground mt-1">$0</p>
                    <p className="text-[10px] text-muted-foreground">forever</p>
                  </div>
                  <ul className="space-y-1.5">
                    {FREE_FEATURES.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Check className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" size="sm" className="w-full rounded-[10px]" disabled>
                    Current Plan
                  </Button>
                </div>

                <div className="rounded-[14px] border-2 border-primary/50 bg-primary/5 p-4 space-y-3 relative">
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                      RECOMMENDED
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary">Pro</p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <p className="text-2xl font-bold text-foreground">$19</p>
                      <p className="text-xs text-muted-foreground">/month</p>
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {PRO_FEATURES.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-foreground/80">
                        <Check className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    size="sm"
                    className="w-full font-semibold rounded-[10px]"
                    onClick={handleUpgrade}
                  >
                    <Zap className="w-3.5 h-3.5 mr-1.5" />
                    Upgrade Now
                  </Button>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-border bg-muted/20 text-center">
              <p className="text-[10px] text-muted-foreground">
                Cancel anytime · No long-term commitment · Secure payment
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
