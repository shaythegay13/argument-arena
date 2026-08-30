import { useState } from "react";
import { Link2, Check, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ensurePermalink } from "@/lib/shareLink";
import { trackEvent } from "@/lib/analytics";

interface ReadOnlyLinkButtonProps {
  sessionId?: string | undefined;
  /** Compact variant for tight rows on mobile. */
  size?: "sm" | "default";
  className?: string;
}

/**
 * Copies the public read-only permalink for a debate session (/result/<id>).
 * Anyone with the link sees a view-only transcript, verdict and grades.
 */
export default function ReadOnlyLinkButton({ sessionId, size = "sm", className }: ReadOnlyLinkButtonProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  if (!sessionId) return null;

  const handleCopy = async () => {
    setBusy(true);
    try {
      const link = await ensurePermalink(sessionId);
      setUrl(link);
      await navigator.clipboard.writeText(link);
      setCopied(true);
      trackEvent("result_shared", { sessionId });
      toast({
        title: "Read-only link copied",
        description: "Anyone with this link can view the results — they can't edit or continue the debate.",
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({
        title: "Couldn't copy the link",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Button
        variant="outline"
        size={size}
        onClick={handleCopy}
        disabled={busy}
        aria-label="Copy read-only link to these results"
        className="gap-2 rounded-[10px] w-full sm:w-auto"
      >
        {busy ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : copied ? (
          <Check className="w-3.5 h-3.5 text-verdict-go" />
        ) : (
          <Link2 className="w-3.5 h-3.5" />
        )}
        {copied ? "Link copied" : "Copy read-only link"}
      </Button>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-primary hover:underline hidden sm:flex items-center gap-1"
          aria-label="Open the read-only results view in a new tab"
        >
          Open <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}
