import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Users, Brain, BarChart3, Shield, MessageSquare, Share2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { motion } from "framer-motion";

const judges = [
  {
    name: "Alex Ventura",
    role: "Angel Investor",
    color: "primary" as const,
    focus: "Grit · Timing · Upside",
    description: "Backs founders, not decks. Probes your unfair advantage and 100x upside potential.",
  },
  {
    name: "Jordan Reyes",
    role: "VC Partner",
    color: "accent" as const,
    focus: "TAM · Moat · Team · Exit",
    description: "Managing a $500M fund. Demands $1B+ outcomes and a clear path to Series A.",
  },
  {
    name: "Sam Rivera",
    role: "Power User",
    color: "go" as const,
    focus: "Pain · Competitors · Retention · UX",
    description: "Only switches for a 10x better solution. Exposes UX gaps and weak retention hooks.",
  },
  {
    name: "Taylor Kim",
    role: "COO / Operator",
    color: "operator" as const,
    focus: "MVP · Resourcing · GTM · Complexity",
    description: "Scaled 5 startups to 100-person teams. Obsesses over day-30 hiring plans and burn rate.",
  },
  {
    name: "Riley Novak",
    role: "Skeptical Pessimist",
    color: "nogo" as const,
    focus: "Competition · Regs · Timing · Risk",
    description: "Seen 100+ startups fail. Assumes your idea is broken until you prove otherwise.",
  },
  {
    name: "Casey Patel",
    role: "Financial Analyst",
    color: "quant" as const,
    focus: "LTV · Growth · Breakeven · SAM",
    description: "Ex-Goldman quant. Demands your LTV:CAC math before giving your idea a passing grade.",
  },
  {
    name: "Morgan Lee",
    role: "Industry Insider",
    color: "insider" as const,
    focus: "Workflow Fit · Gatekeepers · Regs",
    description: "20-year industry veteran. Knows the unwritten rules incumbents use to block new entrants.",
  },
  {
    name: "Phoenix Quinn",
    role: "Product Visionary",
    color: "visionary" as const,
    focus: "Roadmap · Narrative · Platform · Wave",
    description: "Helped shape category leaders. Evaluates your 10-year platform potential.",
  },
];

const judgeColorMap = {
  primary:  { text: "text-primary",           border: "border-primary/30",         bg: "bg-primary/5"         },
  accent:   { text: "text-accent",             border: "border-accent/30",           bg: "bg-accent/5"          },
  go:       { text: "text-verdict-go",         border: "border-verdict-go/30",       bg: "bg-verdict-go/5"      },
  operator: { text: "text-emerald-400",        border: "border-emerald-400/30",      bg: "bg-emerald-400/5"     },
  nogo:     { text: "text-verdict-nogo",       border: "border-verdict-nogo/30",     bg: "bg-verdict-nogo/5"    },
  quant:    { text: "text-muted-foreground",   border: "border-border",              bg: "bg-card"              },
  insider:  { text: "text-orange-400",         border: "border-orange-400/30",       bg: "bg-orange-400/5"      },
  visionary:{ text: "text-purple-400",         border: "border-purple-400/30",       bg: "bg-purple-400/5"      },
} as const;

const useCases = [
  {
    icon: Users,
    title: "Solo Founders",
    description: "Pre-validate your idea in minutes before committing months to building.",
  },
  {
    icon: Brain,
    title: "Serial Entrepreneurs",
    description: "Screen multiple concepts quickly. Kill weak ideas fast, invest in strong ones.",
  },
  {
    icon: BarChart3,
    title: "Product Teams",
    description: "Pressure-test new product initiatives before presenting to leadership.",
  },
  {
    icon: Shield,
    title: "Startup Studios",
    description: "Run every venture thesis through the jury before allocating resources.",
  },
];

const About = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "About — Startup Jury AI";
    const setMeta = (sel: string, val: string) => {
      const el = document.querySelector(sel);
      if (el) el.setAttribute("content", val);
    };
    const setLink = (rel: string, href: string) => {
      let el = document.querySelector(`link[rel="${rel}"]`);
      if (!el) { el = document.createElement("link"); el.setAttribute("rel", rel); document.head.appendChild(el); }
      el.setAttribute("href", href);
    };
    setMeta('meta[name="description"]', "Meet the 8 AI expert judges behind Startup Jury AI. Learn why we built the fastest, most honest startup idea validation tool for founders.");
    setMeta('meta[property="og:title"]', "About — Startup Jury AI");
    setMeta('meta[property="og:description"]', "Meet the 8 AI expert judges behind Startup Jury AI. The fastest, most honest startup idea validation tool for founders.");
    setMeta('meta[property="og:url"]', "https://startupjuryai.com/about");
    setMeta('meta[name="twitter:title"]', "About — Startup Jury AI");
    setMeta('meta[name="twitter:description"]', "Meet the 8 AI expert judges behind Startup Jury AI. The fastest, most honest startup idea validation tool for founders.");
    setLink("canonical", "https://startupjuryai.com/about");
    return () => {
      document.title = "Startup Jury AI - Validate Your Startup Idea with AI Judges";
      setMeta('meta[name="description"]', "8 AI personas debate your startup idea across 4 rounds and deliver a GO/NO-GO verdict in minutes. Validate before you build.");
      setMeta('meta[property="og:title"]', "Startup Jury AI - Validate Your Startup Idea with AI Judges");
      setMeta('meta[property="og:description"]', "8 AI expert personas debate your startup idea across 4 rounds and deliver a GO/NO-GO verdict in minutes. Free to try — no pitch deck needed.");
      setMeta('meta[property="og:url"]', "https://startupjuryai.com/");
      setMeta('meta[name="twitter:title"]', "Startup Jury AI - Validate Your Startup Idea with AI Judges");
      setMeta('meta[name="twitter:description"]', "8 AI expert personas debate your startup idea across 4 rounds and deliver a GO/NO-GO verdict in minutes. Free to try — no pitch deck needed.");
      setLink("canonical", "https://startupjuryai.com/");
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border px-4 sm:px-6 py-4 sticky top-0 z-50 bg-background/90 backdrop-blur-md">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <a href="/">
            <img src={logo} alt="Startup Jury AI" className="h-28 sm:h-40 md:h-48 -my-8 sm:-my-12" width={193} height={192} loading="lazy" decoding="async" />
          </a>
          <div className="flex items-center gap-2 sm:gap-3">
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
      <section className="max-w-[1200px] mx-auto px-6 py-20 sm:py-28 text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
            <Zap className="w-3 h-3 text-primary" />
            About Startup Jury AI
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground tracking-tight leading-[1.1]">
            Built to give founders<br />
            <span className="text-primary">honest answers</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
            Before you quit your job, write a line of code, or raise a round — pressure-test your startup idea against 8 AI experts who won't spare your feelings.
          </p>
        </motion.div>
      </section>

      {/* Why We Built This */}
      <section className="bg-card/60 border-y border-border">
        <div className="max-w-[1200px] mx-auto px-6 py-20 sm:py-28">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-primary">Why We Built This</div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                The problem with startup validation
              </h2>
              <div className="space-y-4 text-muted-foreground text-sm sm:text-base leading-relaxed">
                <p>
                  Most startup ideas don't fail at launch — they fail much earlier, when the founder couldn't get honest feedback fast enough to change course.
                </p>
                <p>
                  Customer interviews take 2–6 weeks. Advisors have blind spots and agendas. Friends and family won't tell you the truth. Lean Canvas only grades your own homework.
                </p>
                <p>
                  We built Startup Jury AI to be the honest, fast, zero-bias first filter every founder deserves — before they invest months they don't have.
                </p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="space-y-3"
            >
              {[
                { label: "Customer interviews",  detail: "2–6 weeks, small sample, polite respondents", good: false },
                { label: "Advisor feedback",     detail: "Biased, slow, requires warm intros",           good: false },
                { label: "Friends & family",     detail: "False confidence — they won't hurt your feelings", good: false },
                { label: "Lean Canvas",          detail: "You're grading your own homework",             good: false },
                { label: "Startup Jury AI",      detail: "8 expert perspectives in under 5 minutes",     good: true  },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`flex items-start gap-4 p-4 rounded-[14px] border ${item.good ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${item.good ? "bg-verdict-go" : "bg-muted-foreground/30"}`} />
                  <div>
                    <div className={`text-sm font-semibold ${item.good ? "text-foreground" : "text-muted-foreground"}`}>{item.label}</div>
                    <div className={`text-xs mt-0.5 ${item.good ? "text-primary" : "text-muted-foreground/60"}`}>{item.detail}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* The 8 Judges */}
      <section className="max-w-[1200px] mx-auto px-6 py-20 sm:py-28">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center space-y-4 mb-14"
        >
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-primary">The Jury</div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">Meet your 8 judges</h2>
          <p className="text-muted-foreground text-base sm:text-lg font-light max-w-2xl mx-auto">
            Each judge brings a unique perspective, scoring methodology, and threshold for what makes an idea worth pursuing.
          </p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {judges.map((judge, i) => {
            const colors = judgeColorMap[judge.color];
            return (
              <motion.div
                key={judge.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className={`rounded-[14px] border ${colors.border} ${colors.bg} p-5 space-y-3`}
              >
                <div>
                  <div className={`text-sm font-semibold ${colors.text}`}>{judge.name}</div>
                  <div className="text-xs text-muted-foreground">{judge.role}</div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{judge.description}</p>
                <div className={`text-[10px] font-mono uppercase tracking-[0.15em] ${colors.text} opacity-70`}>{judge.focus}</div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-card/60 border-y border-border">
        <div className="max-w-[1200px] mx-auto px-6 py-20 sm:py-28">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-4 mb-14"
          >
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-primary">The Format</div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">How the debate works</h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { num: "01", icon: MessageSquare, title: "Describe your idea",  body: "Plain language — no pitch deck needed. Just tell the jury what you're building and why." },
              { num: "02", icon: Users,         title: "4 rounds of debate",  body: "Judges challenge assumptions, find strengths, and probe weaknesses — each round getting sharper." },
              { num: "03", icon: BarChart3,     title: "Weighted scoring",    body: "Each judge scores on their own criteria. The system aggregates into a multi-dimensional result." },
              { num: "04", icon: Share2,        title: "GO / MAYBE / NO-GO", body: "Receive a final verdict with judge-by-judge breakdowns and actionable feedback to iterate on." },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-primary">{step.num}</span>
                  <step.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Who Uses It */}
      <section className="max-w-[1200px] mx-auto px-6 py-20 sm:py-28">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center space-y-4 mb-14"
        >
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-primary">Use Cases</div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">Who uses Startup Jury AI</h2>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {useCases.map((uc, i) => (
            <motion.div
              key={uc.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-[14px] border border-border bg-card p-6 space-y-4 hover:border-primary/30 transition-colors"
            >
              <uc.icon className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">{uc.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{uc.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="bg-card/60 border-y border-border">
        <div className="max-w-[1200px] mx-auto px-6 py-14">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[
              { value: "2,400+",  label: "Ideas evaluated"  },
              { value: "< 5 min", label: "Time to verdict"  },
              { value: "8",       label: "Expert judges"    },
            ].map((stat) => (
              <div key={stat.label} className="space-y-1">
                <div className="text-3xl sm:text-4xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[1200px] mx-auto px-6 py-20 sm:py-28 text-center">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-6"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            Ready for an honest verdict?
          </h2>
          <p className="text-muted-foreground text-base font-light">2 free evaluations. No credit card required.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="font-semibold px-10 h-12 rounded-[10px]"
            >
              Start Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <a href="/pricing">
              <Button variant="outline" size="lg" className="h-12 rounded-[10px]">
                See Pricing
              </Button>
            </a>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-10">
        <div className="max-w-[1200px] mx-auto flex flex-col items-center gap-4 text-xs text-muted-foreground">
          <img src={logo} alt="Startup Jury AI" className="h-24 sm:h-32 -my-8 sm:-my-10" width={129} height={128} loading="lazy" decoding="async" />
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

export default About;
