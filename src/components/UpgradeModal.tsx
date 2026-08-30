import { Crown, Check, Zap, X, Settings, Coins, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence, useDragControls, PanInfo } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useState, useCallback, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { CREDIT_PACKS, STRIPE_PRO, STRIPE_STUDIO, SINGLE_EVAL } from "@/data/pricing";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  isPro?: boolean;
  isStudio?: boolean;
  tier?: string | null;
  credits?: number;
  subscriptionEnd?: string | null;
  reason?: "default" | "out_of_credits";
  onCheckout: (plan?: string) => Promise<void>;
  onPurchaseCredits: (pack: string) => Promise<void>;
  onManage?: () => Promise<void>;
}


const PRO_FEATURES = [
  "15 evaluations / month",
  "All jury panels",
  "Startup Verdict Cards",
  "Downloadable Jury Reports",
  "Pitch Simulation Mode",
  "Priority processing",
  "Unused credits roll over 1 month",
];

const STUDIO_FEATURES = [
  "Unlimited jury evaluations",
  "All jury panels",
  "Advanced jury reports",
  "Pitch simulation mode",
  "Idea iteration tracking",
  "Early access to new features",
];

export default function UpgradeModal({ open, onClose, isPro, isStudio, tier, credits = 0, subscriptionEnd, reason = "default", onCheckout, onPurchaseCredits, onManage }: UpgradeModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const dragControls = useDragControls();
  const [tab, setTab] = useState<"credits" | "pro" | "studio">("credits");
  const outOfCredits = reason === "out_of_credits";

  useEffect(() => {
    if (open && outOfCredits) setTab("credits");
  }, [open, outOfCredits]);


  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 300) {
      onClose();
    }
  }, [onClose]);

  const handleUpgrade = async (plan: string = "pro") => {
    setLoading(plan);
    try {
      await onCheckout(plan);
      toast({ title: "Checkout opened", description: "Complete payment in the new tab." });
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleBuyPack = async (packId: string) => {
    setLoading(packId);
    try {
      await onPurchaseCredits(packId);
      toast({ title: "Checkout opened", description: "Complete payment to add credits." });
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleManage = async () => {
    setLoading("manage");
    try {
      await onManage?.();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const hasSubscription = isPro || isStudio;

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
            className="relative w-full sm:max-w-xl rounded-t-[20px] sm:rounded-[14px] border border-border bg-card shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col touch-none sm:touch-auto"
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-10">
              <X className="w-5 h-5" />
            </button>

            <div className="flex justify-center pt-3 pb-0 sm:hidden cursor-grab active:cursor-grabbing" onPointerDown={(e) => dragControls.start(e)}>
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="overflow-y-auto flex-1">
              <div className="px-5 sm:px-6 pt-6 sm:pt-8 pb-4 text-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  {isStudio ? <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-primary" /> : isPro ? <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-primary" /> : <Coins className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />}
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground">
                  {outOfCredits && !hasSubscription
                    ? "You're out of evaluation credits"
                    : isStudio ? "Studio Plan Active" : isPro ? "Pro Plan Active" : "Get More Evaluations"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {outOfCredits && !hasSubscription
                    ? "The jury needs 1 credit to run a full 4-round evaluation. Buy credits below to continue."
                    : hasSubscription
                    ? `Renews ${subscriptionEnd ? new Date(subscriptionEnd).toLocaleDateString() : "soon"} · ${isStudio ? "Unlimited" : `${credits} credits remaining`}`
                    : `You have ${credits} credit${credits !== 1 ? "s" : ""} remaining`}
                </p>

              </div>

              {/* Tab selector */}
              {!hasSubscription && (
                <div className="px-5 sm:px-6 pb-4">
                  <div className="flex items-center gap-1 p-1 rounded-[14px] bg-muted/40 border border-border">
                    <button
                      onClick={() => setTab("credits")}
                      className={`flex-1 px-2 py-1.5 rounded-[10px] text-xs font-medium transition-all ${
                        tab === "credits" ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Coins className="w-3 h-3 inline mr-1" />
                      Credits
                    </button>
                    <button
                      onClick={() => setTab("pro")}
                      className={`flex-1 px-2 py-1.5 rounded-[10px] text-xs font-medium transition-all ${
                        tab === "pro" ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Crown className="w-3 h-3 inline mr-1" />
                      Pro
                    </button>
                    <button
                      onClick={() => setTab("studio")}
                      className={`flex-1 px-2 py-1.5 rounded-[10px] text-xs font-medium transition-all ${
                        tab === "studio" ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Sparkles className="w-3 h-3 inline mr-1" />
                      Studio
                    </button>
                  </div>
                </div>
              )}

              <div className="px-5 sm:px-6 pb-4">
                {/* Credit Packs */}
                {(tab === "credits" && !hasSubscription) && (
                  <div className="space-y-2.5">
                    {/* Single evaluation */}
                    <div className="rounded-[14px] border border-border p-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{SINGLE_EVAL.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">1 evaluation · ${SINGLE_EVAL.price}/each</p>
                      </div>
                      <Button size="sm" variant="outline" className="rounded-[10px] shrink-0" onClick={() => handleBuyPack("single")} disabled={!!loading}>
                        {loading === "single" ? "Loading…" : `$${SINGLE_EVAL.price}`}
                      </Button>
                    </div>
                    {CREDIT_PACKS.map((pack) => (
                      <div
                        key={pack.id}
                        className={`rounded-[14px] border p-4 flex items-center justify-between gap-3 ${
                          pack.popular ? "border-primary/50 bg-primary/5" : "border-border"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{pack.name}</p>
                            {pack.popular && (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                                BEST VALUE
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {pack.credits} evaluations · ${pack.perCredit.toFixed(2)}/each
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={pack.popular ? "default" : "outline"}
                          className="rounded-[10px] shrink-0"
                          onClick={() => handleBuyPack(pack.id)}
                          disabled={!!loading}
                        >
                          {loading === pack.id ? "Loading…" : `$${pack.price}`}
                        </Button>
                      </div>
                    ))}
                    <p className="text-[10px] text-muted-foreground text-center pt-1">Credits never expire</p>
                  </div>
                )}

                {/* Pro Subscription */}
                {(tab === "pro" || (hasSubscription && !isStudio)) && (
                  <div className="rounded-[14px] border-2 border-primary/50 bg-primary/5 p-5 space-y-4 relative">
                    {isPro && !isStudio && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">YOUR PLAN</span>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary">Startup Jury Pro</p>
                      <div className="flex items-baseline gap-1 mt-1">
                        <p className="text-2xl font-bold text-foreground">${STRIPE_PRO.price}</p>
                        <p className="text-xs text-muted-foreground">/month</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">≈ ${(STRIPE_PRO.price / STRIPE_PRO.monthlyCredits).toFixed(2)} per evaluation</p>
                    </div>
                    <ul className="space-y-1.5">
                      {PRO_FEATURES.map((f) => (
                        <li key={f} className="flex items-start gap-1.5 text-xs text-foreground/80">
                          <Check className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {isPro && !isStudio ? (
                      <Button size="sm" variant="outline" className="w-full rounded-[10px]" onClick={handleManage} disabled={!!loading}>
                        <Settings className="w-3.5 h-3.5 mr-1.5" />
                        Manage Subscription
                      </Button>
                    ) : (
                      <Button size="sm" className="w-full font-semibold rounded-[10px]" onClick={() => handleUpgrade("pro")} disabled={!!loading}>
                        <Zap className="w-3.5 h-3.5 mr-1.5" />
                        {loading === "pro" ? "Loading…" : "Subscribe to Pro"}
                      </Button>
                    )}
                  </div>
                )}

                {/* Studio Subscription */}
                {(tab === "studio" || isStudio) && (
                  <div className="rounded-[14px] border-2 border-primary/50 bg-primary/5 p-5 space-y-4 relative">
                    {isStudio && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">YOUR PLAN</span>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary">Startup Jury Studio</p>
                      <div className="flex items-baseline gap-1 mt-1">
                        <p className="text-2xl font-bold text-foreground">${STRIPE_STUDIO.price}</p>
                        <p className="text-xs text-muted-foreground">/month</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Unlimited evaluations</p>
                    </div>
                    <ul className="space-y-1.5">
                      {STUDIO_FEATURES.map((f) => (
                        <li key={f} className="flex items-start gap-1.5 text-xs text-foreground/80">
                          <Check className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {isStudio ? (
                      <Button size="sm" variant="outline" className="w-full rounded-[10px]" onClick={handleManage} disabled={!!loading}>
                        <Settings className="w-3.5 h-3.5 mr-1.5" />
                        Manage Subscription
                      </Button>
                    ) : (
                      <Button size="sm" className="w-full font-semibold rounded-[10px]" onClick={() => handleUpgrade("studio")} disabled={!!loading}>
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                        {loading === "studio" ? "Loading…" : "Subscribe to Studio"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 sm:px-6 py-3 border-t border-border bg-muted/20 text-center shrink-0">
              <p className="text-[10px] text-muted-foreground">
                Cancel anytime · Secure payment via Stripe
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
