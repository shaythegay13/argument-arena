import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, Users, Star, ArrowRight, Shield, Brain, MessageSquare, BarChart3, Share2, CheckCircle2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { motion } from "framer-motion";

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
          <img src={logo} alt="Startup Jury AI" className="h-8 sm:h-9" />
          <div className="flex items-center gap-2 sm:gap-3">
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
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
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
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
            onClick={() => navigate("/auth")}
            className="font-medium text-sm sm:text-base px-8 w-full sm:w-auto h-12 rounded-[10px] border-accent text-accent hover:bg-accent/10"
          >
            Learn More
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-muted-foreground"
        >
          2 free evaluations · No credit card required
        </motion.p>

        {/* Social proof strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex items-center justify-center gap-8 sm:gap-12 pt-4 flex-wrap"
        >
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
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="bg-card/60 border-y border-border">
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
              <div className="hidden sm:block w-px h-14 bg-border" />
              <div className="space-y-2">
                <div className="text-4xl font-bold text-primary">$19<span className="text-base font-normal text-muted-foreground">/mo</span></div>
                <div className="text-sm text-muted-foreground">Unlimited evaluations</div>
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
          <img src={logo} alt="Startup Jury AI" className="h-7" />
          <span className="font-light">Validate your idea before you build.</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/terms")}
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Terms & Conditions
            </button>
            <span>·</span>
            <button
              onClick={() => navigate("/privacy")}
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
