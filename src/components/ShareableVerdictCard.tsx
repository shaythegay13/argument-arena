import { useRef, useState } from "react";
import { JudgeVerdict, PersonaRating, Persona } from "@/types/debate";
import { Button } from "@/components/ui/button";
import { Download, Share2, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import html2canvas from "html2canvas";
import logo from "@/assets/logo.png";
import { getPersonaColors } from "@/data/personaColors";

interface ShareableVerdictCardProps {
  verdict: JudgeVerdict;
  ratings: PersonaRating[];
  personas: Persona[];
  topic: string;
  sessionId?: string | undefined;
  onClose?: () => void;
}

const verdictStyles: Record<string, { emoji: string; color: string; bg: string; border: string; label: string; gradient: string }> = {
  GO: { emoji: "🚀", color: "#22c55e", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)", label: "GO", gradient: "linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.03) 100%)" },
  MAYBE: { emoji: "⚠️", color: "#eab308", bg: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.3)", label: "MAYBE", gradient: "linear-gradient(135deg, rgba(234,179,8,0.15) 0%, rgba(234,179,8,0.03) 100%)" },
  "NO-GO": { emoji: "❌", color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", label: "NO-GO", gradient: "linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.03) 100%)" },
};

function ScoreBar({ score, color }: { score: number; color: string }) {
  const pct = (score / 10) * 100;
  return (
    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

export default function ShareableVerdictCard({
  verdict,
  ratings,
  personas,
  topic,
  sessionId,
  onClose,
}: ShareableVerdictCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [shared, setShared] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const { toast } = useToast();

  const vStyle = verdictStyles[verdict.verdict] ?? verdictStyles["MAYBE"]!;
  const sortedRatings = [...ratings].sort((a, b) => b.score - a.score);
  const shareUrl = sessionId ? `${window.location.origin}/result/${sessionId}` : window.location.href;
  const shareText = `My startup idea just got a ${verdict.verdict} verdict (${verdict.overallScore * 10}/100) from Startup Jury AI! 🎯 Top ${verdict.percentile}th percentile.`;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0f1729",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `startup-verdict-${verdict.verdict.toLowerCase()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      trackEvent("verdict_card_downloaded", { sessionId, verdict: verdict.verdict });
      toast({ title: "Verdict card downloaded!" });
    } catch {
      toast({ title: "Failed to download", variant: "destructive" });
    }
    setDownloading(false);
  };

  const handleCopyLink = async () => {
    setShareLoading(true);
    try {
      if (sessionId) {
        await supabase.from("debate_sessions").update({ is_public: true } as any).eq("id", sessionId);
      }
      await navigator.clipboard.writeText(shareUrl);
      setShared(true);
      trackEvent("verdict_card_shared", { sessionId, method: "link" });
      toast({ title: "Link copied!", description: "Anyone with the link can view this result." });
      setTimeout(() => setShared(false), 3000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
    setShareLoading(false);
  };

  const handleShareTwitter = () => {
    trackEvent("verdict_card_shared", { sessionId, method: "twitter" });
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      "_blank",
      "width=550,height=420"
    );
  };

  const handleShareLinkedIn = () => {
    trackEvent("verdict_card_shared", { sessionId, method: "linkedin" });
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      "_blank",
      "width=550,height=420"
    );
  };

  return (
    <div className="space-y-4">
      {/* Close button if used as overlay */}
      {onClose && (
        <div className="flex justify-end">
          <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground">
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* === CAPTURABLE CARD === */}
      <div
        ref={cardRef}
        style={{
          background: "#0f1729",
          borderRadius: "16px",
          border: `1px solid ${vStyle.border}`,
          overflow: "hidden",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Hero section */}
        <div style={{ background: vStyle.gradient, padding: "28px 24px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <img src={logo} alt="Startup Jury AI" style={{ height: "36px" }} crossOrigin="anonymous" />
            <span style={{ fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              Startup Verdict Card
            </span>
          </div>

          {/* Topic */}
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", marginBottom: "16px", lineHeight: "1.5" }}>
            ⚡ {topic.length > 120 ? topic.slice(0, 120) + "…" : topic}
          </p>

          {/* Verdict + Score row */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontSize: "48px" }}>{vStyle.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "36px", fontWeight: 700, color: vStyle.color, letterSpacing: "-0.02em" }}>
                {vStyle.label}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.4)", marginBottom: "2px" }}>
                Score
              </div>
              <div style={{ fontSize: "32px", fontWeight: 700, color: vStyle.color }}>
                {verdict.overallScore * 10}<span style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)" }}>/100</span>
              </div>
            </div>
            <div style={{ textAlign: "center", padding: "8px 12px", borderRadius: "10px", border: `1px solid ${vStyle.border}`, background: vStyle.bg }}>
              <div style={{ fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.4)", marginBottom: "2px" }}>
                Percentile
              </div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: vStyle.color }}>
                {verdict.percentile}<span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>th</span>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Judge scores grid */}
          <div>
            <div style={{ fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.35)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "8px" }}>
              Panel Scores
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
              {sortedRatings.slice(0, 8).map((r) => {
                const persona = personas.find((p) => p.id === r.personaId);
                const sc = r.score >= 8 ? "#22c55e" : r.score >= 6 ? "#eab308" : "#ef4444";
                return (
                  <div key={r.personaId} style={{ textAlign: "center", padding: "8px 4px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
                    <div style={{ fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {persona?.name?.split(" ")[0] ?? "Judge"}
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: sc }}>
                      {r.score * 10}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strengths & Risks */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div style={{ padding: "12px", borderRadius: "10px", border: "1px solid rgba(34,197,94,0.2)", background: "rgba(34,197,94,0.05)" }}>
              <div style={{ fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "#22c55e", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600, marginBottom: "6px" }}>
                ✅ Strengths
              </div>
              {verdict.strengths.map((s, i) => (
                <div key={i} style={{ fontSize: "11px", color: "rgba(255,255,255,0.75)", marginBottom: "4px", lineHeight: "1.4", display: "flex", gap: "6px" }}>
                  <span style={{ color: "#22c55e", flexShrink: 0 }}>•</span>
                  {s}
                </div>
              ))}
            </div>
            <div style={{ padding: "12px", borderRadius: "10px", border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)" }}>
              <div style={{ fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "#ef4444", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600, marginBottom: "6px" }}>
                ⚠️ Risks
              </div>
              {verdict.risks.map((r, i) => (
                <div key={i} style={{ fontSize: "11px", color: "rgba(255,255,255,0.75)", marginBottom: "4px", lineHeight: "1.4", display: "flex", gap: "6px" }}>
                  <span style={{ color: "#ef4444", flexShrink: 0 }}>•</span>
                  {r}
                </div>
              ))}
            </div>
          </div>

          {/* Top Praise */}
          <div style={{ padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(34,197,94,0.2)", background: "rgba(34,197,94,0.05)" }}>
            <div style={{ fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "#22c55e", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600, marginBottom: "4px" }}>
              🏆 Top Praise
            </div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.85)", fontStyle: "italic", lineHeight: "1.5" }}>
              "{verdict.topPraise}"
            </div>
          </div>

          {/* Skeptic Kill Shot */}
          <div style={{ padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)" }}>
            <div style={{ fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "#ef4444", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600, marginBottom: "4px" }}>
              💀 Skeptic Kill Shot
            </div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.85)", fontStyle: "italic", lineHeight: "1.5" }}>
              "{verdict.skepticKillShot}"
            </div>
          </div>

          {/* Footer branding */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>
              startupjury.lovable.app
            </div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>
              AI-Powered Startup Evaluation
            </div>
          </div>
        </div>
      </div>

      {/* === SHARING BUTTONS (outside capture area) === */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-2 justify-center"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={downloading}
          className="gap-2 rounded-[10px]"
        >
          <Download className="w-3.5 h-3.5" />
          {downloading ? "Saving…" : "Download PNG"}
        </Button>

        <Button
          variant={shared ? "default" : "outline"}
          size="sm"
          onClick={handleCopyLink}
          disabled={shareLoading}
          className="gap-2 rounded-[10px]"
        >
          {shared ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
          {shared ? "Copied!" : "Copy Link"}
        </Button>

        <Button variant="outline" size="sm" onClick={handleShareTwitter} className="gap-2 rounded-[10px]">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Share on X
        </Button>

        <Button variant="outline" size="sm" onClick={handleShareLinkedIn} className="gap-2 rounded-[10px]">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
          Share on LinkedIn
        </Button>
      </motion.div>
    </div>
  );
}
