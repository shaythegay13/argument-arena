import { useEffect } from "react";
import { useNavigate } from "@/lib/router-compat";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Coins, Crown, Sparkles, Target, MessageSquareWarning, Award, Quote } from "lucide-react";
import logo from "@/assets/logo.png";
import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CREDIT_PACKS, STRIPE_PRO, STRIPE_STUDIO, SINGLE_EVAL } from "@/data/pricing";

const freeFeatures = [
  "2 full jury evaluations",
  "8 AI expert judges (AI Auto-Select panel)",
  "4-round debate format",
  "GO / MAYBE / NO-GO verdict",
  "Judge-by-judge score breakdowns",
  "Read-only shareable result link",
  "Shareable verdict image card",
];

const proFeatures = [
  "15 evaluations per month",
  "Curated + fully custom jury panels",
  "Downloadable jury reports (PDF, Markdown, JSON)",
  "Idea iteration tracking across re-pitches",
  "Pitch simulation mode with founder rebuttals",
  "Priority processing",
  "Unused credits roll over 1 month",
];

const studioFeatures = [
  "Unlimited jury evaluations",
  "Everything in Pro",
  "All curated + custom jury panels",
  "Advanced jury reports and exports",
  "Full idea iteration history",
  "Early access to new features",
];

const benefits = [
  {
    icon: Target,
    title: "Real Investor Simulation",
    description: "Experience what it feels like to pitch your startup to investors, operators, and industry experts.",
  },
  {
    icon: MessageSquareWarning,
    title: "Brutally Honest Feedback",
    description: "Judges debate each other and challenge your assumptions to surface real risks.",
  },
  {
    icon: Award,
    title: "Clear Verdicts",
    description: "Receive a structured score, verdict, and actionable insights for improving your startup.",
  },
];

const testimonials = [
  { quote: "I thought my idea was great until the Skeptic judge destroyed it.", author: "Early-stage founder" },
  { quote: "The panel surfaced risks I hadn't considered.", author: "Solo founder" },
  { quote: "It's the closest thing to pitching investors without actually raising money.", author: "First-time founder" },
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
    a: "Yes. Cancel anytime from your account settings. Your Pro or Studio access continues until the end of your billing period.",
  },
  {
    q: "Is my startup idea kept private?",
    a: "By default, submissions are private and only visible to you. You can optionally share them on the public leaderboard.",
  },
  {
    q: "What's the difference between Pro and Studio?",
    a: "Pro gives you 15 monthly evaluations with full features. Studio is unlimited and includes idea iteration tracking plus early access to new features — ideal for accelerators and power users.",
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
    setMeta('meta[name="description"]', "Stress-test your startup idea with 8 expert AI judges. Start free with 2 evaluations. Credit packs from $3 or subscribe from $19/month.");
    setMeta('meta[property="og:title"]', "Pricing — Startup Jury AI");
    setMeta('meta[property="og:description"]', "Pitch your startup to an AI investor panel. Start free with 2 evaluations.");
    setMeta('meta[property="og:url"]', "https://startupjuryai.com/pricing");
    setMeta('meta[name="twitter:title"]', "Pricing — Startup Jury AI");
    setMeta('meta[name="twitter:description"]', "Pitch your startup to an AI investor panel. Start free.");
    setLink("canonical", "https://startupjuryai.com/pricing");
    return () => {
      document.title = "Startup Jury AI - Validate Your Startup Idea with AI Judges";
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Pricing — Startup Jury AI | Free, Credits & Unlimited Plans</title>
        <meta name="description" content="Compare Startup Jury AI plans: 2 free evaluations, pay-as-you-go credit packs, or unlimited monthly access for $8.99." />
        <link rel="canonical" href="https://www.startupjuryai.com/pricing" />
        <meta property="og:title" content="Pricing — Startup Jury AI" />
        <meta property="og:description" content="Free trial, credit packs, and unlimited plans for AI startup validation." />
        <meta property="og:url" content="https://www.startupjuryai.com/pricing" />
      </Helmet>
      <header className="border-b border-border px-4 sm:px-6 py-4 sticky top-0 z-50 bg-background/90 backdrop-blur-md">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <a href="/"><img src={logo} alt="Startup Jury AI" className="h-28 sm:h-40 md:h-48 -my-8 sm:-my-12" width={307} height={305} loading="lazy" /></a>
          <div className="flex items-center gap-2 sm:gap-3">
            <a href="/about" className="hidden sm:block text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5">About</a>
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-muted-foreground hover:text-foreground text-xs sm:text-sm">Sign In</Button>
            <Button size="sm" onClick={() => navigate("/auth")} className="font-semibold text-xs sm:text-sm rounded-[10px]">Get Started</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 sm:py-28 text-center space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-foreground tracking-tight leading-[1.1]">
            Pitch Your Startup to an<br className="hidden sm:block" /> AI Investor Panel
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
            Stress-test your startup idea with 8 expert AI judges across multiple rounds of debate.
            Identify risks, uncover blind spots, and see if your idea actually holds up.
          </p>
        </motion.div>
      </section>

      {/* Value Propositions */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center space-y-3 px-4"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                <b.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-sm font-bold text-foreground">{b.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{b.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Plans: Free + Pro + Studio */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Free */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="rounded-[14px] border border-border bg-card p-7 space-y-6">
            <div className="space-y-2">
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">Free</div>
              <div className="text-4xl font-bold text-foreground">$0</div>
              <div className="text-sm text-muted-foreground">2 evaluations, forever free</div>
            </div>
            <Button variant="outline" size="lg" onClick={() => navigate("/auth")} className="w-full h-11 rounded-[10px]">Start Free Evaluation</Button>
            <ul className="space-y-2.5">
              {freeFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-verdict-go flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Pro — Highlighted */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="rounded-[14px] border-2 border-primary/40 bg-primary/5 p-7 space-y-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="text-[10px] font-mono font-bold px-3 py-1 rounded-full bg-primary text-primary-foreground whitespace-nowrap">
                MOST FOUNDERS CHOOSE THIS
              </span>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-primary flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" /> Pro
              </div>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-foreground">${STRIPE_PRO.price}</span>
                <span className="text-base text-muted-foreground mb-1">/month</span>
              </div>
              <div className="text-sm text-muted-foreground">{STRIPE_PRO.monthlyCredits} evaluations/month</div>
              <div className="text-xs text-muted-foreground/70">≈ ${(STRIPE_PRO.price / STRIPE_PRO.monthlyCredits).toFixed(2)} per evaluation</div>
            </div>
            <Button size="lg" onClick={() => navigate("/auth")} className="w-full h-11 rounded-[10px] font-semibold">
              Start Pro <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <ul className="space-y-2.5">
              {proFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-verdict-go flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Studio */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="rounded-[14px] border border-border bg-card p-7 space-y-6">
            <div className="space-y-2">
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Studio
              </div>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-foreground">${STRIPE_STUDIO.price}</span>
                <span className="text-base text-muted-foreground mb-1">/month</span>
              </div>
              <div className="text-sm text-muted-foreground">Unlimited evaluations</div>
            </div>
            <Button variant="outline" size="lg" onClick={() => navigate("/auth")} className="w-full h-11 rounded-[10px]">
              Start Studio <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <ul className="space-y-2.5">
              {studioFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-verdict-go flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Credit Packs */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
        <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10 space-y-3">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-primary flex items-center justify-center gap-1.5">
            <Coins className="w-3.5 h-3.5" /> Credit Packs
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Buy credits, no subscription needed</h2>
          <p className="text-muted-foreground text-sm">Credits never expire. Each full 4-round evaluation consumes 1 credit.</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {/* Single eval */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-[14px] border border-border bg-card p-6 space-y-4 text-center"
          >
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">Single Evaluation</p>
              <p className="text-3xl font-bold text-foreground mt-2">${SINGLE_EVAL.price}</p>
              <p className="text-sm text-muted-foreground mt-1">1 evaluation</p>
            </div>
            <Button variant="outline" onClick={() => navigate("/auth")} className="w-full rounded-[10px]">Buy Now</Button>
          </motion.div>

          {CREDIT_PACKS.map((pack, i) => (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (i + 1) * 0.1 }}
              className={`rounded-[14px] border p-6 space-y-4 text-center ${
                pack.popular ? "border-primary/50 bg-primary/5 relative" : "border-border bg-card"
              }`}
            >
              {pack.popular && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground whitespace-nowrap">BEST VALUE</span>
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

      {/* Social Proof */}
      <section className="bg-card/60 border-y border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
          <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-10">
            <div className="text-center space-y-3">
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-primary">Social Proof</div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Why founders use Startup Jury</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {testimonials.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-[14px] border border-border bg-card p-6 space-y-4"
                >
                  <Quote className="w-5 h-5 text-primary/40" />
                  <p className="text-sm text-foreground leading-relaxed italic">"{t.quote}"</p>
                  <p className="text-xs text-muted-foreground font-medium">— {t.author}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-28">
        <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-10">
          <div className="text-center space-y-3">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-primary">FAQ</div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Common questions</h2>
          </div>
          <div className="rounded-[14px] border border-border bg-card overflow-hidden">
            <Accordion type="single" collapsible>
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className={i === faqs.length - 1 ? "border-b-0" : ""}>
                  <AccordionTrigger className="px-4 sm:px-6 text-sm font-medium text-foreground text-left hover:no-underline">{faq.q}</AccordionTrigger>
                  <AccordionContent className="px-4 sm:px-6 text-sm text-muted-foreground leading-relaxed">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 sm:py-28 text-center">
        <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">Test your idea before you build it.</h2>
          <p className="text-muted-foreground text-base font-light max-w-lg mx-auto">No credit card. No commitment. Just honest feedback from an AI investor panel.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" onClick={() => navigate("/auth")} className="font-semibold px-10 h-12 rounded-[10px]">
              Start Free Evaluation <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate("/about")} className="px-8 h-12 rounded-[10px]">
              See How It Works
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Questions? Email <a href="mailto:info@startupjuryai.com" className="text-primary hover:underline">info@startupjuryai.com</a>
          </p>
        </motion.div>
      </section>

      <footer className="border-t border-border px-4 sm:px-6 py-10">
        <div className="max-w-[1200px] mx-auto flex flex-col items-center gap-4 text-xs text-muted-foreground">
          <img src={logo} alt="Startup Jury AI" className="h-24 sm:h-32 -my-8 sm:-my-10" width={307} height={305} loading="lazy" />
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
