import { useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Facebook,
  Image as ImageIcon,
  Instagram,
  Link2,
  Linkedin,
  Loader2,
  QrCode,
  Share2,
  Twitter,
} from "lucide-react";
import html2canvas from "html2canvas";
import QRCode from "qrcode";
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
import {
  ensurePermalink,
  permalinkFor,
  crawlerShareLinkFor,
  OG_IMAGE_URL,
} from "@/lib/shareLink";
import PlatformPreviewPanel from "@/components/PlatformPreviewPanel";
import { trackEvent } from "@/lib/analytics";
import VerdictImageCard from "@/components/VerdictImageCard";
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
  sessionId?: string | undefined;
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

/** Composer limits and hashtag conventions per network. */
export const PLATFORM_LIMITS: Record<
  SocialPlatform,
  { charLimit: number | null; maxHashtags: number; suggested: string[] }
> = {
  x: { charLimit: 280, maxHashtags: 2, suggested: ["#buildinpublic", "#startups"] },
  linkedin: {
    charLimit: 3000,
    maxHashtags: 5,
    suggested: ["#startups", "#venturecapital", "#founders", "#productstrategy"],
  },
  facebook: { charLimit: 63206, maxHashtags: 3, suggested: ["#startup", "#founders"] },
  reddit: { charLimit: 40000, maxHashtags: 0, suggested: [] },
  instagram: {
    charLimit: 2200,
    maxHashtags: 30,
    suggested: [
      "#startup",
      "#founder",
      "#startupidea",
      "#entrepreneur",
      "#buildinpublic",
      "#venturecapital",
      "#startupjuryai",
    ],
  },
  copy: { charLimit: null, maxHashtags: 0, suggested: [] },
};

const HASHTAG_RE = /#[\p{L}\p{N}_]+/gu;

/** Splits a draft into body text and its trailing hashtags so both stay editable. */
export function splitCaption(text: string): { body: string; hashtags: string[] } {
  const hashtags = Array.from(text.match(HASHTAG_RE) ?? []);
  const body = text.replace(HASHTAG_RE, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return { body, hashtags };
}

export function joinCaption(body: string, hashtags: string[]): string {
  const tags = hashtags.join(" ").trim();
  return tags ? `${body.trim()}\n\n${tags}` : body.trim();
}

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
        text.split("\n")[0] ?? text
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
  const [body, setBody] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [qrUrl, setQrUrl] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"text" | "image">("text");
  const [linkCopied, setLinkCopied] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState<null | "download" | "share">(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // One canonical transcript URL, identical on every platform.
  const shareUrl = permalinkFor(sessionId);
  // Server-rendered URL handed to networks that build their preview from the link.
  const crawlerUrl = crawlerShareLinkFor(sessionId);
  // Square reads better on Instagram/Facebook; wide is the link-preview ratio elsewhere.
  const cardShape: "square" | "wide" =
    platform === "instagram" || platform === "facebook" ? "square" : "wide";

  const limits = PLATFORM_LIMITS[platform];
  const draft = joinCaption(body, hashtags);
  const overLimit = limits.charLimit != null && draft.length > limits.charLimit;
  const overTags = hashtags.length > limits.maxHashtags;

  const setDraft = (text: string) => {
    const parts = splitCaption(text);
    setBody(parts.body);
    setHashtags(parts.hashtags);
  };

  const toggleHashtag = (tag: string) => {
    setHashtags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  /** Renders the permalink as a scannable QR so it can be shared offline. */
  const buildQr = async () => {
    try {
      const url = await ensurePermalink(sessionId);
      const dataUrl = await QRCode.toDataURL(url, {
        width: 640,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: "#0f172aff", light: "#ffffffff" },
      });
      setQrUrl(dataUrl);
      setQrOpen(true);
      trackEvent("verdict_card_shared", { sessionId, method: "qr" });
    } catch {
      toast({ title: "Couldn't generate the QR code", variant: "destructive" });
    }
  };

  const downloadQr = () => {
    if (!qrUrl) return;
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `startup-jury-permalink-qr.png`;
    a.click();
  };

  /** Makes the transcript publicly viewable, then puts the permalink on the clipboard. */
  const copyPermalink = async () => {
    setLinkBusy(true);
    try {
      const url = await ensurePermalink(sessionId);
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
      trackEvent("verdict_card_shared", { sessionId, method: "permalink" });
      toast({
        title: "Permalink copied",
        description: "Anyone with this link can read the full transcript.",
      });
    } catch {
      toast({ title: "Couldn't copy the link", variant: "destructive" });
    }
    setLinkBusy(false);
  };

  /** Rasterizes the off-screen card at fixed pixel size. */
  const renderCard = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: "#0f172a",
      scale: 1,
      useCORS: true,
      logging: false,
      windowWidth: cardShape === "wide" ? 1200 : 1080,
    });
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  };

  const downloadImage = async () => {
    setImageBusy("download");
    try {
      const blob = await renderCard();
      if (!blob) throw new Error("render failed");
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `startup-jury-${verdict?.verdict.toLowerCase() ?? "verdict"}-${cardShape}.png`;
      a.click();
      URL.revokeObjectURL(href);
      trackEvent("verdict_card_downloaded", { sessionId, method: "social_card" });
      toast({ title: "Image card saved", description: "Attach it to your post." });
    } catch {
      toast({ title: "Couldn't generate the image", variant: "destructive" });
    }
    setImageBusy(null);
  };

  /** Native share sheet with the file when available; otherwise save + open composer. */
  const shareImage = async () => {
    setImageBusy("share");
    try {
      const blob = await renderCard();
      if (!blob) throw new Error("render failed");
      const url = await ensurePermalink(sessionId);
      const file = new File([blob], "startup-jury-verdict.png", { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData & { files?: File[] }) => boolean;
      };
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], text: draft, url });
        trackEvent("verdict_card_shared", { sessionId, method: "native_image" });
      } else {
        await downloadImage();
        await navigator.clipboard.writeText(draft).catch(() => {});
        const target = intentUrl(platform, draft, crawlerUrl);
        if (target) window.open(target, "_blank", "noopener,noreferrer");
        toast({
          title: "Image saved, caption copied",
          description: "Attach the downloaded card in the composer.",
        });
      }
    } catch (err) {
      if ((err as DOMException)?.name !== "AbortError") {
        toast({ title: "Couldn't share the image", variant: "destructive" });
      }
    }
    setImageBusy(null);
  };

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
    const target = intentUrl(platform, draft, crawlerUrl);
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

  // Mirrors exactly what the og-result function renders for crawlers.
  const previewScore = verdict ? Math.round(verdict.overallScore * 10) : null;
  const previewTitle = verdict
    ? `${verdict.verdict} — ${topic ? shortTopic(topic, 40) : "Startup Idea"} scored ${previewScore}/100 | Startup Jury AI`
    : "Startup Jury AI";
  const previewDescription = verdict
    ? `An AI panel of ${ratings.length || 8} investor personas debated this idea and returned ${verdict.verdict} at ${previewScore}/100. ${shortTopic(topic, 110)}`
    : "";

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
        <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono uppercase tracking-wide text-sm">
              Share your verdict
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pick a network — the post is rewritten to match how that platform reads.
            </DialogDescription>
          </DialogHeader>

          {/* Permalink: one transcript URL reused across every platform */}
          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              <Link2 className="w-3 h-3" /> Shareable permalink
            </div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-0 rounded-md border border-border bg-background px-2 py-1.5 text-xs font-mono text-foreground/80"
              />
              <Button size="sm" variant="outline" onClick={copyPermalink} disabled={linkBusy}>
                {linkBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : linkCopied ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Copying makes this debate publicly viewable so the same link opens the full transcript
              everywhere you post it.
            </p>
          </div>

          {/* Text post vs image card */}
          <div className="flex rounded-lg border border-border bg-muted/20 p-0.5">
            {([
              { id: "text" as const, label: "Post text", Icon: Copy },
              { id: "image" as const, label: "Image card", Icon: ImageIcon },
            ]).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[10px] font-mono uppercase tracking-wide transition-colors ${
                  tab === t.id
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.Icon className="w-3 h-3" />
                {t.label}
              </button>
            ))}
          </div>

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

          <PlatformPreviewPanel
            platformLabel={activeMeta.label}
            postText={draft}
            charLimit={limits.charLimit}
            hashtagCount={hashtags.length}
            maxHashtags={limits.maxHashtags}
            crawlerUrl={crawlerUrl}
            permalink={shareUrl}
            ogImageUrl={OG_IMAGE_URL}
            previewTitle={previewTitle}
            previewDescription={previewDescription}
          />

          {tab === "image" && (
            <div className="space-y-3">
              {/* Scaled preview of the exact card that gets rasterized */}
              <div className="rounded-lg border border-border bg-muted/10 p-3 overflow-hidden">
                <div
                  className="mx-auto origin-top"
                  style={{
                    width: cardShape === "wide" ? 1200 : 1080,
                    transform: `scale(${cardShape === "wide" ? 0.36 : 0.4})`,
                    height: (cardShape === "wide" ? 675 : 1080) * (cardShape === "wide" ? 0.36 : 0.4),
                  }}
                >
                  <VerdictImageCard
                    topic={topic}
                    verdict={verdict}
                    ratings={ratings}
                    personas={personas}
                    url={shareUrl}
                    shape={cardShape}
                  />
                </div>
              </div>
              <p className="text-[10px] font-mono text-muted-foreground">
                {cardShape === "square" ? "1080 × 1080 (square)" : "1200 × 675 (link preview)"} · sized
                for {activeMeta.label}
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" size="sm" onClick={downloadImage} disabled={!!imageBusy}>
                  {imageBusy === "download" ? (
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 mr-2" />
                  )}
                  Download PNG
                </Button>
                <Button size="sm" onClick={shareImage} disabled={!!imageBusy}>
                  {imageBusy === "share" ? (
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  ) : (
                    <activeMeta.Icon className="w-3.5 h-3.5 mr-2" />
                  )}
                  Share card to {activeMeta.label}
                </Button>
              </div>
            </div>
          )}

          {tab === "image" && (
            /* Off-screen full-size render source for html2canvas */
            <div
              aria-hidden
              style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none", opacity: 0 }}
            >
              <VerdictImageCard
                ref={cardRef}
                topic={topic}
                verdict={verdict}
                ratings={ratings}
                personas={personas}
                url={shareUrl}
                shape={cardShape}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Caption
            </label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="text-xs font-sans leading-relaxed bg-muted/20"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                Hashtags
              </label>
              <span
                className={`text-[10px] font-mono ${
                  overTags ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {hashtags.length}/{limits.maxHashtags} recommended for {activeMeta.label}
              </span>
            </div>
            <Textarea
              value={hashtags.join(" ")}
              onChange={(e) =>
                setHashtags((e.target.value.match(/#[\p{L}\p{N}_]+/gu) ?? []) as string[])
              }
              rows={2}
              placeholder={limits.maxHashtags === 0 ? "This network reads better without hashtags" : "#startups #founders"}
              className="text-xs font-mono leading-relaxed bg-muted/20"
            />
            {limits.suggested.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {limits.suggested.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleHashtag(tag)}
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-mono transition-colors ${
                      hashtags.includes(tag)
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span
              className={`text-[10px] font-mono ${
                overLimit ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {draft.length}
              {limits.charLimit != null ? ` / ${limits.charLimit}` : ""} characters
              {overLimit ? ` · over ${activeMeta.label}'s limit` : ""}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={buildQr} title="QR code for the permalink">
                <QrCode className="w-3.5 h-3.5" />
              </Button>
              <Button variant="outline" size="sm" onClick={copyDraft}>
                {copied ? <Check className="w-3.5 h-3.5 mr-2" /> : <Copy className="w-3.5 h-3.5 mr-2" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              {platform !== "copy" && tab === "text" && (
                <Button size="sm" onClick={postNow}>
                  <activeMeta.Icon className="w-3.5 h-3.5 mr-2" />
                  {platform === "instagram" ? "Copy caption" : `Post to ${activeMeta.label}`}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-xs bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-mono uppercase tracking-wide text-sm">
              Permalink QR code
            </DialogTitle>
            <DialogDescription className="text-xs">
              Scan to open this transcript — works on slides, printouts, or a phone across the table.
            </DialogDescription>
          </DialogHeader>
          {qrUrl && (
            <img
              src={qrUrl}
              alt="QR code linking to the debate permalink"
              width={640}
              height={640}
              className="w-full max-w-[240px] mx-auto rounded-lg bg-white p-2"
            />
          )}
          <p className="text-[10px] font-mono text-muted-foreground break-all text-center">
            {shareUrl}
          </p>
          <Button size="sm" variant="outline" onClick={downloadQr}>
            <Download className="w-3.5 h-3.5 mr-2" />
            Download QR PNG
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SocialShareButton;
