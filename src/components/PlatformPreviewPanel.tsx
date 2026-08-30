import { Check, Copy, ExternalLink, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export interface PlatformPreviewPanelProps {
  /** Network the preview is simulating. */
  platformLabel: string;
  /** Exact text that will be posted (body + hashtags, already joined). */
  postText: string;
  /** Character budget for the network, if it enforces one. */
  charLimit: number | null;
  /** Hashtag count and the network's recommended maximum. */
  hashtagCount: number;
  maxHashtags: number;
  /** URL the crawler fetches for the link preview (server-rendered HTML). */
  crawlerUrl: string;
  /** Human-facing transcript URL the crawler URL redirects to. */
  permalink: string;
  /** Absolute OG image URL the platform will download. */
  ogImageUrl: string;
  /** Title/description the server-rendered head will advertise. */
  previewTitle: string;
  previewDescription: string;
}

/**
 * Shows exactly what a given network will render: the final post text, its
 * character/hashtag budget, the link-preview card, and the precise OG image URL
 * the platform's crawler fetches.
 */
const PlatformPreviewPanel = ({
  platformLabel,
  postText,
  charLimit,
  hashtagCount,
  maxHashtags,
  crawlerUrl,
  permalink,
  ogImageUrl,
  previewTitle,
  previewDescription,
}: PlatformPreviewPanelProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState<null | "image" | "crawler">(null);

  const over = charLimit != null && postText.length > charLimit;
  const overTags = hashtagCount > maxHashtags;
  const remaining = charLimit != null ? charLimit - postText.length : null;

  const copy = async (value: string, which: "image" | "crawler") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      toast({ title: "Couldn't copy that URL", variant: "destructive" });
    }
  };

  return (
    <div className="rounded-lg border border-border bg-muted/10 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          {platformLabel} preview
        </span>
        <span
          className={`text-[10px] font-mono ${over ? "text-destructive" : "text-muted-foreground"}`}
        >
          {postText.length}
          {charLimit != null ? ` / ${charLimit}` : " chars"}
          {remaining != null ? ` · ${remaining} left` : ""}
        </span>
      </div>

      {/* Final post text, exactly as it will be submitted */}
      <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-border bg-background p-2 text-[11px] leading-relaxed text-foreground/85 font-sans">
        {postText || "Your caption will appear here."}
      </pre>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono">
        <span className={overTags ? "text-destructive" : "text-muted-foreground"}>
          Hashtags {hashtagCount}/{maxHashtags}
        </span>
        <span className={over ? "text-destructive" : "text-muted-foreground"}>
          {over ? `Over ${platformLabel}'s limit` : "Within limits"}
        </span>
      </div>

      {/* Simulated link-preview card */}
      <div className="overflow-hidden rounded-md border border-border bg-background">
        <img
          src={ogImageUrl}
          alt={`Link preview image shown on ${platformLabel}`}
          width={1200}
          height={630}
          loading="lazy"
          className="w-full aspect-[1200/630] object-cover bg-muted"
        />
        <div className="p-2 space-y-0.5">
          <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
            startupjuryai.com
          </p>
          <p className="text-xs font-semibold leading-snug line-clamp-2">{previewTitle}</p>
          <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
            {previewDescription}
          </p>
        </div>
      </div>

      {/* The exact URLs the crawler touches */}
      <div className="space-y-2">
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> URL {platformLabel} fetches
          </span>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={crawlerUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 rounded-md border border-border bg-background px-2 py-1 text-[10px] font-mono text-foreground/80"
            />
            <Button size="sm" variant="outline" onClick={() => copy(crawlerUrl, "crawler")}>
              {copied === "crawler" ? (
                <Check className="w-3 h-3" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Server-rendered tags for crawlers; visitors are redirected to {permalink}
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1">
            <ImageIcon className="w-3 h-3" /> og:image it downloads
          </span>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={ogImageUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 rounded-md border border-border bg-background px-2 py-1 text-[10px] font-mono text-foreground/80"
            />
            <Button size="sm" variant="outline" onClick={() => copy(ogImageUrl, "image")}>
              {copied === "image" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">1200×630 PNG · summary_large_image</p>
        </div>
      </div>
    </div>
  );
};

export default PlatformPreviewPanel;
