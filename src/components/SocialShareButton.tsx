import { useState } from "react";
import {
  Check,
  Copy,
  Facebook,
  Instagram,
  Linkedin,
  Share2,
  Twitter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { JudgeVerdict, Persona, PersonaRating } from "@/types/debate";

export type SocialPlatform =
  | "x"
  | "linkedin"
  | "facebook"
  | "reddit"
  | "instagram"
  | "copy";

interface SocialShareButtonProps {
  topic: string;
  verdict: JudgeVerdict | null;
  ratings: PersonaRating[];
  personas: Persona[];
  sessionId?: string;
  className?: string;
}

const PLATFORMS: {
  id: SocialPlatform;
  label: string;
  hint: string;
  Icon: typeof Share2;
}[] = [
  { id: "x", label: "X / Twitter", hint: "Punchy, under 280 characters", Icon: Twitter },
  { id: "linkedin", label: "LinkedIn", hint: "Professional founder update", Icon: Linkedin },
  { id: "facebook", label: "Facebook", hint: "Warm, personal framing", Icon: Facebook },
  { id: "reddit", label: "Reddit", hint: "Discussion-first, no hype", Icon: Share2 },
  { id: "instagram", label: "Instagram", hint: "Caption + hashtags to paste", Icon: Instagram },
  { id: "copy", label: "Just copy", hint: "Plain text, no platform styling", Icon: Copy },
];

function shortTopic(topic: string, max = 90) {
  const clean = topic.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function verdictLine(verdict: JudgeVerdict) {
  if (verdict.verdict === "GO") return "The jury said GO 🚀";
  if (verdict.verdict === "MAYBE") return "The jury said MAYBE ⚠️";
  return "The jury said NO-GO ❌";
}

/** Builds copy that fits the norms of each network instead of one generic blurb. */
export function buildSocialPost(
  platform: SocialPlatform,
  {
    topic,
    verdict,
    ratings,
    url,
  }: { topic: string; verdict: JudgeVerdict; ratings: PersonaRating[]; url: string }
): string {
  const idea = shortTopic(topic);
  const score = `${verdict.overallScore}/10`;
  const jurors = ratings.length || 8;
  const praise = verdict.topPraise?.replace(/\s+/g, " ").trim();
  const shot = verdict.skepticKillShot?.replace(/\s+/g, " ").trim();

  switch (platform) {
    case "x":
      return [
        `I put my startup idea in front of an AI jury of ${jurors} investors.`,
        ``,
        `${verdictLine(verdict)} — ${score} (${verdict.percentile}th percentile).`,
        ``,
        `Sharpest critique: "${shot}"`,
        ``,
        `${url}`,
        `#buildinpublic #startups`,
      ].join("\n");

    case "linkedin":
      return [
        `I ran "${idea}" past an AI investment panel before pitching a real one.`,
        ``,
        `Verdict: ${verdict.verdict} · Score: ${score} · ${verdict.percentile}th percentile among ideas evaluated.`,
        ``,
        `What the panel liked: ${praise}`,
        `What they pushed back on: ${shot}`,
        `My next step: ${verdict.nextStep}`,
        ``,
        `Getting torn apart by ${jurors} AI jurors is a lot cheaper than hearing it in a real partner meeting.`,
        ``,
        `Run your own idea through it: ${url}`,
        ``,
        `#startups #venturecapital #founders #productstrategy`,
      ].join("\n");

    case "facebook":
      return [
        `Fun experiment: I had an AI jury of ${jurors} investors judge my startup idea — "${idea}".`,
        ``,
        `${verdictLine(verdict)} with a score of ${score}.`,
        ``,
        `Best compliment: ${praise}`,
        `Harshest note: ${shot}`,
        ``,
        `If you have an idea sitting in your notes app, try it here 👉 ${url}`,
      ].join("\n");

    case "reddit":
      return [
        `I had an AI panel of ${jurors} investor personas debate my idea — here's what it flagged`,
        ``,
        `Idea: ${idea}`,
        `Verdict: ${verdict.verdict} (${score}, ${verdict.percentile}th percentile)`,
        ``,
        `Strengths the panel agreed on:`,
        ...verdict.strengths.map((s) => `- ${s}`),
        ``,
        `Risks they hammered:`,
        ...verdict.risks.map((r) => `- ${r}`),
        ``,
        `Recommended next step: ${verdict.nextStep}`,
        ``,
        `Curious whether you'd score it differently. Full breakdown: ${url}`,
      ].join("\n");

    case "instagram":
      return [
        `${verdictLine(verdict)}`,
        ``,
        `Score: ${score} · ${verdict.percentile}th percentile`,
        `Idea: ${idea}`,
        ``,
        `${praise}`,
        `…but the skeptic said: "${shot}"`,
        ``,
        `Next step: ${verdict.nextStep}`,
        ``,
        `Link in bio → ${url}`,
        ``,
        `#startup #founder #startupidea #entrepreneur #buildinpublic #venturecapital #startupjuryai`,
      ].join("\n");

    default:
      return [
        `Startup Jury AI verdict`,
        `Idea: ${idea}`,
        `Verdict: ${verdict.verdict} · ${score} · ${verdict.percentile}th percentile`,
        `Top praise: ${praise}`,
        `Sharpest critique: ${shot}`,
        `Next step: ${verdict.nextStep}`,
        url,
      ].join("\n");
  }
}

function intentUrl(platform: SocialPlatform, text: string, url: string): string | null {
  switch (platform) {
    case "x":
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
    case "reddit":
      return `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(
        text.split("\n")[0]
      )}&text=${encodeURIComponent(text)}`;
    default:
      // Instagram has no web composer, and "copy" is intentionally clipboard-only.
      return null;
  }
}

const SocialShareButton = ({
  topic,
  verdict,
  ratings,
  personas,
  sessionId,
  className = "",
}: SocialShareButtonProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<SocialPlatform>("x");
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);

  const shareUrl = sessionId
    ? `${window.location.origin}/result/${sessionId}`
    : window.location.origin;

  const openWith = (next: SocialPlatform) => {
    if (!verdict) return;
    setPlatform(next);
    setDraft(buildSocialPost(next, { topic, verdict, ratings, url: shareUrl }));
    setCopied(false);
  };

  const handleOpen = () => {
    openWith(platform);
    setOpen(true);
  };

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Post copied", description: "Paste it straight into your feed." });
    } catch {
      toast({
        title: "Couldn't copy",
        description: "Select the text and copy it manually.",
        variant: "destructive",
      });
    }
  };

  const postNow = async () => {
    const target = intentUrl(platform, draft, shareUrl);
    if (!target) {
      await copyDraft();
      toast({
        title: platform === "instagram" ? "Caption copied" : "Copied",
        description:
          platform === "instagram"
            ? "Instagram has no web composer — paste this caption with your verdict image."
            : "Your post is on the clipboard.",
      });
      return;
    }
    // LinkedIn/Facebook prefill from the link preview, so keep the text handy too.
    if (platform === "linkedin" || platform === "facebook") await copyDraft();
    window.open(target, "_blank", "noopener,noreferrer");
  };

  if (!verdict) return null;

  const activeMeta = PLATFORMS.find((p) => p.id === platform)!;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className={`border-secondary/40 text-secondary hover:bg-secondary/10 font-mono text-xs uppercase tracking-wide ${className}`}
      >
        <Share2 className="w-3.5 h-3.5 mr-2" />
        Share verdict
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-mono uppercase tracking-wide text-sm">
              Share your verdict
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pick a network — the post is rewritten to match how that platform reads.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => openWith(p.id)}
                className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 transition-colors ${
                  platform === p.id
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
                }`}
              >
                <p.Icon className="w-4 h-4" />
                <span className="text-[10px] font-mono uppercase tracking-wide text-center leading-tight">
                  {p.label}
                </span>
              </button>
            ))}
          </div>

          <p className="text-[10px] font-mono text-muted-foreground">{activeMeta.hint}</p>

          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={10}
            className="text-xs font-sans leading-relaxed bg-muted/20"
          />

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10px] font-mono text-muted-foreground">
              {draft.length} characters
              {platform === "x" && draft.length > 280 ? " · over X's limit" : ""}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyDraft}>
                {copied ? <Check className="w-3.5 h-3.5 mr-2" /> : <Copy className="w-3.5 h-3.5 mr-2" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              {platform !== "copy" && (
                <Button size="sm" onClick={postNow}>
                  <activeMeta.Icon className="w-3.5 h-3.5 mr-2" />
                  {platform === "instagram" ? "Copy caption" : `Post to ${activeMeta.label}`}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SocialShareButton;
