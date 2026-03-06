import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Zap, Loader2, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import VoiceInputButton from "@/components/VoiceInputButton";
import { motion, AnimatePresence } from "framer-motion";

interface IdeaFormData {
  problem: string;
  solution: string;
  targetMarket: string;
  monetization: string;
}

interface IdeaSubmissionFormProps {
  onTopicChange: (topic: string) => void;
  disabled?: boolean;
}

function formatTopic(data: IdeaFormData): string {
  const parts: string[] = [];
  if (data.problem.trim()) parts.push(`**Problem:** ${data.problem.trim()}`);
  if (data.solution.trim()) parts.push(`**Solution:** ${data.solution.trim()}`);
  if (data.targetMarket.trim()) parts.push(`**Target Market:** ${data.targetMarket.trim()}`);
  if (data.monetization.trim()) parts.push(`**Monetization:** ${data.monetization.trim()}`);
  return parts.join("\n\n");
}

export default function IdeaSubmissionForm({ onTopicChange, disabled }: IdeaSubmissionFormProps) {
  const [form, setForm] = useState<IdeaFormData>({
    problem: "",
    solution: "",
    targetMarket: "",
    monetization: "",
  });
  const [showOptional, setShowOptional] = useState(false);
  const [activeVoiceField, setActiveVoiceField] = useState<keyof IdeaFormData | null>(null);

  const update = (field: keyof IdeaFormData, value: string) => {
    const next = { ...form, [field]: value };
    setForm(next);
    onTopicChange(formatTopic(next));
  };

  const completeness = [form.problem, form.solution, form.targetMarket, form.monetization].filter(
    (v) => v.trim().length > 10
  ).length;

  const suggestions: string[] = [];
  if (!form.problem.trim()) suggestions.push("Describe the problem you're solving");
  if (!form.solution.trim()) suggestions.push("Explain your proposed solution");
  if (form.problem.trim() && form.solution.trim() && !form.targetMarket.trim())
    suggestions.push("Add your target market for better analysis");
  if (form.problem.trim() && form.solution.trim() && !form.monetization.trim())
    suggestions.push("Add a monetization strategy for a complete evaluation");

  return (
    <div className="space-y-4">
      {/* Completeness indicator */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-8 h-1.5 rounded-full transition-colors ${
                i < completeness ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">
          {completeness}/4 sections filled
        </span>
      </div>

      {/* Problem — required */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
          Problem <span className="text-destructive">*</span>
        </label>
        <Textarea
          placeholder="What pain point or gap exists? e.g. 'Small business owners waste 10+ hrs/week on manual bookkeeping'"
          value={form.problem}
          onChange={(e) => update("problem", e.target.value)}
          disabled={disabled}
          className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground min-h-[60px] resize-none focus:ring-1 focus:ring-primary"
        />
        <VoiceInputButton
          onTranscript={(text) => update("problem", form.problem + (form.problem ? " " : "") + text)}
          className="mt-1"
        />
      </div>

      {/* Solution — required */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
          Solution <span className="text-destructive">*</span>
        </label>
        <Textarea
          placeholder="How does your product solve this? e.g. 'AI-powered bookkeeping that auto-categorizes expenses from bank feeds'"
          value={form.solution}
          onChange={(e) => update("solution", e.target.value)}
          disabled={disabled}
          className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground min-h-[60px] resize-none focus:ring-1 focus:ring-primary"
        />
        <VoiceInputButton
          onTranscript={(text) => update("solution", form.solution + (form.solution ? " " : "") + text)}
          className="mt-1"
        />
      </div>

      {/* Optional fields toggle */}
      <button
        type="button"
        onClick={() => setShowOptional(!showOptional)}
        className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
      >
        {showOptional ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {showOptional ? "Hide" : "Show"} optional fields (Target Market, Monetization)
      </button>

      <AnimatePresence>
        {showOptional && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            {/* Target Market */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
                Target Market
              </label>
              <Input
                placeholder="e.g. 'Solo founders and freelancers earning $50K-$200K/year'"
                value={form.targetMarket}
                onChange={(e) => update("targetMarket", e.target.value)}
                disabled={disabled}
                className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Monetization */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
                Monetization Strategy
              </label>
              <Input
                placeholder="e.g. '$29/mo SaaS subscription, freemium with premium features'"
                value={form.monetization}
                onChange={(e) => update("monetization", e.target.value)}
                disabled={disabled}
                className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline suggestions */}
      {suggestions.length > 0 && completeness < 4 && completeness > 0 && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-[10px] bg-primary/5 border border-primary/15">
          <Lightbulb className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground">
            <span className="text-primary font-medium">Tip:</span> {suggestions[0]}
          </p>
        </div>
      )}
    </div>
  );
}
