import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Zap, Coins, Crown } from "lucide-react";
import logo from "@/assets/logo.png";
import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CREDIT_PACKS, STRIPE_PRO } from "@/data/pricing";

const freeFeatures = [
  "2 free startup evaluations",
  "8 AI expert judges",
  "4-round debate format",
  "GO / MAYBE / NO-GO verdict",
  "Judge-by-judge score breakdowns",
  "Shareable result link",
];

const proFeatures = [
  "10 evaluations per month",
  "All jury panels",
  "Downloadable PDF reports",
  "Priority AI processing",
  "Unused credits roll over 1 month",
  "Full session history",
  "Re-evaluate refined ideas",
];

const faqs = [
  {
    q: "What counts as one evaluation?",
    a: "Each time you submit a startup idea and the full 4-round jury debate completes, that counts as one evaluation credit. Refining and re-submitting counts as a new credit.",
  },
  {
    q: "Do credits expire?",
    a: "Purchased credit packs never expire. Pro subscription credits that go unused roll over for one month.",
  },
  {
    q: "Can I cancel my subscription anytime?",
    a: "Yes. Cancel anytime from your account settings. Your Pro access continues until the end of your billing period.",
  },
  {
    q: "Is my startup idea kept private?",
    a: "By default, submissions are private and only visible to you. You can optionally share them on the public leaderboard.",
  },
  {
    q: "Do you offer refunds?",
    a: "If you're not satisfied within the first 7 days, contact us at info@startupjuryai.com for a full refund.",
  },
];

const Pricing = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Pricing — Startup Jury AI";
    const setMeta = (sel: string, val: string) => {
      const el = document.querySelector(sel);
      if (el) el.setAttribute("content", val);
    };
    const setLink = (rel: string, href: string) => {
      let el = document.querySelector(`link[rel="${rel}"]`);
      if (!el) { el = document.createElement("link"); el.setAttribute("rel", rel); document.head.appendChild(el); }
      el.setAttribute("href", href);
    };
    setMeta('meta[name="description"]', "Start free with 2 evaluations. Buy credit packs from $10 or subscribe to Pro for $19/month.");
    setMeta('meta[property="og:title"]', "Pricing — Startup Jury AI");
    setMeta('meta[property="og:description"]', "Start free with 2 evaluations. Buy credit packs or subscribe to Pro.");
    setMeta('meta[property="og:url"]', "https://startupjuryai.com/pricing");
    setMeta('meta[name="twitter:title"]', "Pricing — Startup Jury AI");
    setMeta('meta[name="twitter:description"]', "Start free with 2 evaluations. Buy credit packs or subscribe to Pro.");
    setLink("canonical", "https://startupjuryai.com/pricing");
    return () => {
      document.title = "Startup Jury AI - Validate Your Startup Idea with AI Judges";
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 sm:px-6 py-4 sticky top-0 z-50 bg-background/90 backdrop-blur-md">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <a href="/"><img src={logo} alt="Startup Jury AI" className="h-28 sm:h-40 md:h-48 -my-8 sm:-my-12" width={193} height={192} loading="lazy" /></a>
          <div className="flex items-center gap-2 sm:gap-3">
            <a href="/about" className="hidden sm:block text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5">About</a>
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-muted-foreground hover:text-foreground text-xs sm:text-sm">Sign In</Button>
            <Button size="sm" onClick={() => navigate("/auth")} className="font-semibold text-xs sm:text-sm rounded-[10px]">Get Started</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-[1200px] mx-auto px-6 py-20 sm:py-28 text-center space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
            <Zap className="w-3 h-3 text-primary" />
            Pricing
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground tracking-tight leading-[1.1]">
            Pay as you pitch
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground font-light max-w-xl mx-auto">
            Start free with 2 evaluations. Buy credits when you need them, or subscribe for monthly access.
          </p>
        </motion.div>
      </section>

      {/* Free + Pro */}
      <section className="max-w-[1200px] mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="rounded-[14px] border border-border bg-card p-8 space-y-8">
            <div className="space-y-2">
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">Free</div>
              <div className="text-4xl font-bold text-foreground">$0</div>
              <div className="text-sm text-muted-foreground">2 evaluations, forever free</div>
            </div>
            <Button variant="outline" size="lg" onClick={() => navigate("/auth")} className="w-full h-11 rounded-[10px]">Get Started Free</Button>
            <ul className="space-y-3">
              {freeFeatures.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-verdict-go flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Pro */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="rounded-[14px] border border-primary/30 bg-primary/5 p-8 space-y-8">
            <div className="space-y-2">
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-primary flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" /> Pro
              </div>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-foreground">${STRIPE_PRO.price}</span>
                <span className="text-base text-muted-foreground mb-1">/month</span>
              </div>
              <div className="text-sm text-muted-foreground">{STRIPE_PRO.monthlyCredits} evaluations/month, cancel anytime</div>
            </div>
            <Button size="lg" onClick={() => navigate("/auth")} className="w-full h-11 rounded-[10px] font-semibold">
              Start Pro <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <ul className="space-y-3">
              {proFeatures.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-verdict-go flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Credit Packs */}
      <section className="max-w-[1200px] mx-auto px-6 pb-20 sm:pb-28">
        <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10 space-y-3">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-primary flex items-center justify-center gap-1.5">
            <Coins className="w-3.5 h-3.5" /> Credit Packs
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Buy credits, no subscription needed</h2>
          <p className="text-muted-foreground text-sm">Credits never expire. Use them whenever you're ready.</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {CREDIT_PACKS.map((pack, i) => (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-[14px] border p-6 space-y-4 text-center ${
                pack.popular ? "border-primary/50 bg-primary/5 relative" : "border-border bg-card"
              }`}
            >
              {pack.popular && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">BEST VALUE</span>
                </div>
              )}
              <div>
                <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">{pack.name}</p>
                <p className="text-3xl font-bold text-foreground mt-2">${pack.price}</p>
                <p className="text-sm text-muted-foreground mt-1">{pack.credits} evaluations</p>
                <p className="text-[11px] text-muted-foreground">${pack.perCredit.toFixed(2)} per evaluation</p>
              </div>
              <Button variant={pack.popular ? "default" : "outline"} onClick={() => navigate("/auth")} className="w-full rounded-[10px]">
                Buy {pack.name}
              </Button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-card/60 border-y border-border">
        <div className="max-w-2xl mx-auto px-6 py-20 sm:py-28">
          <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-10">
            <div className="text-center space-y-3">
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-primary">FAQ</div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Common questions</h2>
            </div>
            <div className="rounded-[14px] border border-border bg-card overflow-hidden">
              <Accordion type="single" collapsible>
                {faqs.map((faq, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className={i === faqs.length - 1 ? "border-b-0" : ""}>
                    <AccordionTrigger className="px-6 text-sm font-medium text-foreground text-left hover:no-underline">{faq.q}</AccordionTrigger>
                    <AccordionContent className="px-6 text-sm text-muted-foreground leading-relaxed">{faq.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[1200px] mx-auto px-6 py-20 sm:py-28 text-center">
        <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">Start with 2 free verdicts</h2>
          <p className="text-muted-foreground text-base font-light">No credit card. No commitment. Just honest feedback.</p>
          <Button size="lg" onClick={() => navigate("/auth")} className="font-semibold px-10 h-12 rounded-[10px]">
            Get Started Free <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <p className="text-xs text-muted-foreground">
            Questions? Email <a href="mailto:info@startupjuryai.com" className="text-primary hover:underline">info@startupjuryai.com</a>
          </p>
        </motion.div>
      </section>

      <footer className="border-t border-border px-6 py-10">
        <div className="max-w-[1200px] mx-auto flex flex-col items-center gap-4 text-xs text-muted-foreground">
          <img src={logo} alt="Startup Jury AI" className="h-24 sm:h-32 -my-8 sm:-my-10" width={129} height={128} loading="lazy" />
          <span className="font-light">Validate your idea before you build.</span>
          <div className="flex items-center gap-3">
            <a href="/terms" className="underline underline-offset-2 hover:text-foreground transition-colors">Terms & Conditions</a>
            <span>·</span>
            <a href="/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
