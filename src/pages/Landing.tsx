import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, Users, Star, ArrowRight, Shield, Brain } from "lucide-react";
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
    description: "Every debate is saved. Revisit scores, verdicts, and judge feedback anytime.",
  },
];

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-3 h-3 rounded-full bg-primary shadow-md shadow-primary/30 shrink-0" />
            <span className="text-base sm:text-lg font-semibold text-foreground tracking-tight truncate">Startup Jury AI</span>
          </div>
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
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs sm:text-sm"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-24 text-center space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          <span className="inline-block text-xs font-mono uppercase tracking-widest text-primary px-3 py-1 rounded-full border border-primary/30 bg-primary/10">
            AI-Powered Startup Validation
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
            Pitch Your Idea to an
            <br />
            <span className="text-primary">AI Jury of Experts</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            8 AI personas — investors, operators, skeptics — debate your startup idea across 4 rounds, then score it with weighted criteria. Get a GO / NO-GO verdict in minutes.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="flex items-center justify-center gap-3"
        >
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto"
          >
            <Zap className="w-5 h-5 mr-2" />
            Start Your Jury Trial
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-12 sm:pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }}
              className="rounded-lg border border-border bg-card p-5 space-y-2"
            >
              <feature.icon className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">{feature.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 sm:px-6 py-6">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-2 text-xs text-muted-foreground">
          <span>Startup Jury AI — Validate your idea before you build.</span>
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
