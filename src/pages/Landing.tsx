import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, Users, Star, ArrowRight, Shield, Brain, MessageSquare, BarChart3, Share2, CheckCircle2, ExternalLink } from "lucide-react";
import logo from "@/assets/logo.png";
import { motion } from "framer-motion";

// Set to a public result URL (e.g. "/result/your-demo-id") to enable the live example CTA
const DEMO_RESULT_URL = "";

const features = [
  {
    icon: Users,
    title: "8 Expert Personas",
    description: "Angel investors, VCs, skeptics, operators — each with unique scoring criteria and industry expertise.",
  },
  {
    icon: Brain,
    title: "4-Round Deep Dive",
    description: "Progressive debate rounds with decreasing word limits force panelists to sharpen their takes.",
  },
  {
    icon: Star,
    title: "Weighted Scoring",
    description: "Each judge scores on unique metrics — TAM, grit, timing, risk — for a multi-dimensional verdict.",
  },
  {
    icon: Shield,
    title: "Session History",
    description: "Every debate is saved. Revisit scores, verdicts, and judge feedback anytime from your dashboard.",
  },
];

const steps = [
  {
    number: "01",
    icon: MessageSquare,
    title: "Describe Your Idea",
    description: "Enter your startup concept in plain language. No pitch deck needed — just tell us what you're building and why.",
  },
  {
    number: "02",
    icon: Users,
    title: "The Jury Deliberates",
    description: "8 AI personas debate your idea across 4 rounds. They challenge assumptions, find strengths, and probe weaknesses.",
  },
  {
    number: "03",
    icon: BarChart3,
    title: "Get Your Verdict",
    description: "Receive a GO / MAYBE / NO-GO verdict with weighted scores, judge-by-judge breakdowns, and actionable insights.",
  },
  {
    number: "04",
    icon: Share2,
    title: "Share & Iterate",
    description: "Share your results with co-founders and advisors. Refine your pitch and re-submit for a better score.",
  },
];

const testimonials = [
  {
    quote: "Got more useful feedback in 5 minutes than from 3 weeks of coffee chats with investors.",
    author: "Sarah K.",
    role: "Solo Founder",
  },
  {
    quote: "The skeptic persona found a fatal flaw I'd been blind to. Saved me months of wasted effort.",
    author: "Marcus T.",
    role: "Serial Entrepreneur",
  },
  {
    quote: "We use it before every board meeting to pressure-test new initiatives.",
    author: "Priya R.",
    role: "Head of Product",
  },
];

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border px-4 sm:px-6 py-4 sticky top-0 z-50 bg-background/90 backdrop-blur-md">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <img src={logo} alt="Startup Jury AI" className="h-28 sm:h-40 md:h-48 -my-8 sm:-my-12" width={193} height={192} fetchPriority="high" decoding="async" />
          <div className="flex items-center gap-2 sm:gap-3">
            <a href="/about" className="hidden sm:block text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5">About</a>
            <a href="/pricing" className="hidden sm:block text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5">Pricing</a>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/auth")}
              className="text-muted-foreground hover:text-foreground text-xs sm:text-sm"
            >
              Sign In
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/auth")}
              className="font-semibold text-xs sm:text-sm rounded-[10px]"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-[1200px] mx-auto px-6 py-20 sm:py-32 text-center space-y-10">
        <div className="space-y-6">
          <span className="inline-block text-xs font-mono uppercase tracking-[0.2em] text-primary px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10">
            AI-Powered Startup Validation
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.08] tracking-tight">
            Pitch Your Startup
            <br />
            <span className="text-primary">to the AI Jury</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light">
            8 AI expert personas — investors, operators, and skeptics — debate your idea across 4 rounds and deliver a scored{" "}
            <span className="text-verdict-go font-medium">GO</span>{" / "}
            <span className="text-verdict-maybe font-medium">MAYBE</span>{" / "}
            <span className="text-verdict-nogo font-medium">NO-GO</span>{" "}
            verdict in minutes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="font-semibold text-sm sm:text-base px-8 w-full sm:w-auto h-12 rounded-[10px]"
          >
            <Zap className="w-5 h-5 mr-2" />
            Start Free Evaluation
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
            className="font-medium text-sm sm:text-base px-8 w-full sm:w-auto h-12 rounded-[10px] border-accent text-accent hover:bg-accent/10"
          >
            Learn More
          </Button>
          {DEMO_RESULT_URL && (
            <Button
              variant="ghost"
              size="lg"
              onClick={() => window.open(DEMO_RESULT_URL, "_blank")}
              className="font-medium text-sm sm:text-base px-6 w-full sm:w-auto h-12 rounded-[10px] text-muted-foreground hover:text-foreground gap-1.5"
            >
              <ExternalLink className="w-4 h-4" />
              See Live Example
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          2 free evaluations · No credit card required
        </p>

        {/* Social proof strip */}
        <div className="flex items-center justify-center gap-8 sm:gap-12 pt-4 flex-wrap">
          {[
            { value: "2,400+", label: "Ideas Evaluated" },
            { value: "< 5 min", label: "Per Verdict" },
            { value: "8", label: "AI Judges" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Mock verdict preview — shows users what output looks like before signing up */}
        <div className="mt-8 max-w-2xl mx-auto text-left">
          <p className="text-center text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mb-4">Sample Output</p>
          <div className="rounded-[14px] border border-verdict-go/30 bg-verdict-go/5 p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5">
              <span className="text-4xl">🚀</span>
              <div className="flex-1">
                <div className="text-2xl font-bold text-verdict-go">GO</div>
                <div className="text-xs text-muted-foreground">AI-powered onboarding tool for SaaS companies</div>
              </div>
              <div className="rounded-[10px] border border-verdict-go/20 bg-card/50 px-4 py-2 text-center">
                <div className="text-xs text-muted-foreground font-mono">Score</div>
                <div className="text-2xl font-bold text-verdict-go">74<span className="text-sm text-muted-foreground">/100</span></div>
              </div>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">
              Strong market timing — SaaS churn is a $1.6T problem and onboarding is the #1 lever. The AI angle is differentiated. Main risk is enterprise sales cycle length vs. your runway.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[10px] border border-verdict-go/20 bg-verdict-go/5 p-3">
                <div className="text-[10px] font-mono uppercase text-verdict-go font-semibold mb-1.5">Strengths</div>
                <ul className="space-y-1">
                  {["Clear, quantifiable pain point", "Viral product-led growth loop", "Defensible data moat over time"].map(s => (
                    <li key={s} className="flex items-start gap-1.5 text-xs text-foreground/75">
                      <span className="w-1 h-1 rounded-full bg-verdict-go mt-1.5 shrink-0" />{s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[10px] border border-verdict-nogo/20 bg-verdict-nogo/5 p-3">
                <div className="text-[10px] font-mono uppercase text-verdict-nogo font-semibold mb-1.5">Risks</div>
                <ul className="space-y-1">
                  {["Crowded market — Appcues, Pendo, Intercom", "High enterprise CAC vs. SMB LTV", "Integration complexity slows GTM"].map(r => (
                    <li key={r} className="flex items-start gap-1.5 text-xs text-foreground/75">
                      <span className="w-1 h-1 rounded-full bg-verdict-nogo mt-1.5 shrink-0" />{r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { name: "Elena Ramirez", role: "Angel", score: 82, color: "text-primary" },
                { name: "Marcus Thornton", role: "VC", score: 74, color: "text-accent" },
                { name: "Victor Volkov", role: "Skeptic", score: 61, color: "text-verdict-nogo" },
                { name: "Priya Shah", role: "Analyst", score: 78, color: "text-muted-foreground" },
              ].map(j => (
                <div key={j.name} className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1">
                  <span className={`text-xs font-semibold ${j.color}`}>{j.score}</span>
                  <span className="text-xs text-muted-foreground">{j.role}</span>
                </div>
              ))}
              <div className="flex items-center rounded-full border border-border bg-card px-3 py-1">
                <span className="text-xs text-muted-foreground">+4 more judges</span>
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-3">
            Your real verdict will reflect your actual idea — submit yours free →{" "}
            <button onClick={() => navigate("/auth")} className="text-primary hover:underline font-medium">Get started</button>
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-card/60 border-y border-border">
        <div className="max-w-[1200px] mx-auto px-6 py-20 sm:py-28">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14 sm:mb-20 space-y-4"
          >
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-accent">How It Works</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              From idea to verdict in 4 steps
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto font-light">
              No pitch deck, no warm intros, no waiting. Just describe your idea and let the jury deliberate.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="relative rounded-[14px] border border-border bg-card p-6 space-y-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-primary/25 font-mono">{step.number}</span>
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-base">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-[1200px] mx-auto px-6 py-20 sm:py-28">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14 space-y-4"
        >
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-accent">Features</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            Built for founders who move fast
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="rounded-[14px] border border-border bg-card p-6 sm:p-7 space-y-3 hover:border-primary/30 transition-colors"
            >
              <feature.icon className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground text-base">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Verdict Demo */}
      <section className="bg-card/60 border-y border-border">
        <div className="max-w-[1200px] mx-auto px-6 py-20 sm:py-28">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14 space-y-4"
          >
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-accent">The Verdict</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              Clear, actionable outcomes
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto font-light">
              Your idea shows strong potential but faces serious execution risks. Here's the breakdown.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
            {[
              { label: "GO", desc: "High Potential", bg: "bg-verdict-go", emoji: "🚀" },
              { label: "MAYBE", desc: "Needs Work", bg: "bg-verdict-maybe", emoji: "⚠️" },
              { label: "NO-GO", desc: "High Risk", bg: "bg-verdict-nogo", emoji: "❌" },
            ].map((v, i) => (
              <motion.div
                key={v.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.4 }}
                className="rounded-[14px] border border-border bg-card p-6 text-center space-y-3"
              >
                <div className="text-3xl">{v.emoji}</div>
                <span className={`inline-block ${v.bg} text-foreground font-bold text-sm px-4 py-1.5 rounded-full`}>
                  {v.label}
                </span>
                <p className="text-sm text-muted-foreground">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-[1200px] mx-auto px-6 py-20 sm:py-28">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14 space-y-4"
        >
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-accent">Testimonials</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            Founders love the brutal honesty
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.author}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="rounded-[14px] border border-border bg-card p-6 sm:p-7 space-y-5"
            >
              <p className="text-sm text-foreground leading-relaxed italic">"{t.quote}"</p>
              <div>
                <div className="text-sm font-semibold text-foreground">{t.author}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-card/60 border-y border-border">
        <div className="max-w-[1200px] mx-auto px-6 py-20 sm:py-28">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-[14px] border border-primary/30 bg-primary/5 p-8 sm:p-14 text-center space-y-8"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">Start validating for free</h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
              <div className="space-y-2">
                <div className="text-4xl font-bold text-foreground">$0</div>
                <div className="text-sm text-muted-foreground">2 free evaluations</div>
              </div>
              <div className="sm:hidden w-2/3 h-px bg-border" />
              <div className="hidden sm:block w-px h-14 bg-border" />
              <div className="space-y-2">
                <div className="text-4xl font-bold text-primary">$19<span className="text-base font-normal text-muted-foreground">/mo</span></div>
                <div className="text-sm text-muted-foreground">15 evaluations · Pro</div>
              </div>
              <div className="sm:hidden w-2/3 h-px bg-border" />
              <div className="hidden sm:block w-px h-14 bg-border" />
              <div className="space-y-2">
                <div className="text-4xl font-bold text-primary">$79<span className="text-base font-normal text-muted-foreground">/mo</span></div>
                <div className="text-sm text-muted-foreground">Unlimited · Studio</div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="font-semibold px-10 h-12 rounded-[10px]"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <div className="flex items-center gap-5 text-xs text-muted-foreground pt-2">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-verdict-go" /> No credit card</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-verdict-go" /> Cancel anytime</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-10">
        <div className="max-w-[1200px] mx-auto flex flex-col items-center gap-4 text-xs text-muted-foreground">
          <img src={logo} alt="Startup Jury AI" className="h-24 sm:h-32 -my-8 sm:-my-10" width={129} height={128} loading="lazy" decoding="async" />
          <span className="font-light">Validate your idea before you build.</span>
          <div className="flex items-center gap-3">
            <a
              href="/terms"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Terms & Conditions
            </a>
            <span>·</span>
            <a
              href="/privacy"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
