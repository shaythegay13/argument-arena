import { Crown, Check, Zap, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence, useDragControls, PanInfo } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useState, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  isPro?: boolean;
  subscriptionEnd?: string | null;
  onCheckout: () => Promise<void>;
  onManage?: () => Promise<void>;
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

export default function UpgradeModal({ open, onClose, isPro, subscriptionEnd, onCheckout, onManage }: UpgradeModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();
  const dragControls = useDragControls();

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 300) {
      onClose();
    }
  }, [onClose]);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      await onCheckout();
      toast({
        title: "Checkout opened",
        description: "Complete payment in the new tab to activate Pro.",
      });
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleManage = async () => {
    setLoading(true);
    try {
      await onManage?.();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
        >
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            drag={isMobile ? "y" : false}
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="relative w-full sm:max-w-lg rounded-t-[20px] sm:rounded-[14px] border border-border bg-card shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col touch-none sm:touch-auto"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Drag handle on mobile */}
            <div
              className="flex justify-center pt-3 pb-0 sm:hidden cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="overflow-y-auto flex-1">
              <div className="px-5 sm:px-6 pt-6 sm:pt-8 pb-4 text-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground">
                  {isPro ? "Pro Plan Active" : "Upgrade to Pro"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {isPro
                    ? `Your subscription renews ${subscriptionEnd ? new Date(subscriptionEnd).toLocaleDateString() : "soon"}`
                    : "Unlock unlimited evaluations and advanced features"}
                </p>
              </div>

              <div className="px-5 sm:px-6 pb-4">
                {/* Mobile: Pro plan first, stacked. Desktop: side-by-side */}
                <div className="flex flex-col-reverse sm:grid sm:grid-cols-2 gap-3">
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
                      {isPro ? "Free Tier" : "Current Plan"}
                    </Button>
                  </div>

                  <div className="rounded-[14px] border-2 border-primary/50 bg-primary/5 p-4 space-y-3 relative">
                    {isPro && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                          YOUR PLAN
                        </span>
                      </div>
                    )}
                    {!isPro && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                          RECOMMENDED
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary">Pro</p>
                      <div className="flex items-baseline gap-1 mt-1">
                        <p className="text-2xl font-bold text-foreground">$8.99</p>
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
                    {isPro ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full rounded-[10px]"
                        onClick={handleManage}
                        disabled={loading}
                      >
                        <Settings className="w-3.5 h-3.5 mr-1.5" />
                        Manage
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full font-semibold rounded-[10px]"
                        onClick={handleUpgrade}
                        disabled={loading}
                      >
                        <Zap className="w-3.5 h-3.5 mr-1.5" />
                        {loading ? "Loading…" : "Upgrade Now"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 sm:px-6 py-3 border-t border-border bg-muted/20 text-center shrink-0">
              <p className="text-[10px] text-muted-foreground">
                Cancel anytime · No long-term commitment · Secure payment via Stripe
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
