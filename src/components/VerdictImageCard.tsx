import { forwardRef } from "react";
import logo from "@/assets/logo.png";
import type { JudgeVerdict, Persona, PersonaRating } from "@/types/debate";

interface VerdictImageCardProps {
  topic: string;
  verdict: JudgeVerdict;
  ratings: PersonaRating[];
  personas: Persona[];
  /** Shown at the bottom of the card so viewers know where to go. */
  url: string;
  /** Square (1080x1080) suits IG/FB; wide (1200x675) suits X/LinkedIn/Reddit. */
  shape: "square" | "wide";
}

const STYLES: Record<string, { color: string; label: string; emoji: string }> = {
  GO: { color: "#22c55e", label: "GO", emoji: "🚀" },
  MAYBE: { color: "#eab308", label: "MAYBE", emoji: "⚠️" },
  "NO-GO": { color: "#ef4444", label: "NO-GO", emoji: "❌" },
};

function clamp(text: string, max: number) {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/**
 * Fixed-pixel card rendered off-screen and rasterized with html2canvas.
 * Inline styles only — html2canvas does not resolve Tailwind custom properties.
 */
const VerdictImageCard = forwardRef<HTMLDivElement, VerdictImageCardProps>(
  ({ topic, verdict, ratings, personas, url, shape }, ref) => {
    const s = STYLES[verdict.verdict] ?? STYLES["MAYBE"]!;
    const wide = shape === "wide";
    const width = wide ? 1200 : 1080;
    const height = wide ? 675 : 1080;
    const top = [...ratings].sort((a, b) => b.score - a.score).slice(0, wide ? 4 : 6);

    return (
      <div
        ref={ref}
        style={{
          width,
          height,
          background: "#0f172a",
          color: "#ffffff",
          fontFamily: "'Inter', system-ui, sans-serif",
          padding: wide ? "56px 64px" : "72px 64px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle at 85% 10%, ${s.color}26 0%, rgba(15,23,42,0) 55%)`,
          }}
        />

        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: wide ? 28 : 44 }}>
            <img src={logo} alt="" width={56} height={56} style={{ height: 56, width: 56 }} crossOrigin="anonymous" />
            <span
              style={{
                fontSize: 18,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.45)",
              }}
            >
              Startup Jury AI · Verdict
            </span>
          </div>

          <div
            style={{
              fontSize: wide ? 30 : 36,
              lineHeight: 1.35,
              color: "rgba(255,255,255,0.82)",
              marginBottom: wide ? 26 : 44,
              maxWidth: wide ? 900 : "100%",
            }}
          >
            “{clamp(topic, wide ? 130 : 170)}”
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: 32, marginBottom: wide ? 24 : 44 }}>
            <div>
              <div
                style={{
                  fontSize: 16,
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.4)",
                  marginBottom: 6,
                }}
              >
                Verdict
              </div>
              <div style={{ fontSize: wide ? 92 : 110, fontWeight: 800, color: s.color, lineHeight: 1 }}>
                {s.label} {s.emoji}
              </div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: wide ? 72 : 86, fontWeight: 800, color: "#ffffff", lineHeight: 1 }}>
                {verdict.overallScore}
                <span style={{ fontSize: wide ? 32 : 40, color: "rgba(255,255,255,0.4)" }}>/10</span>
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "rgba(255,255,255,0.5)",
                  marginTop: 8,
                }}
              >
                {verdict.percentile}th percentile
              </div>
            </div>
          </div>

          {!wide && verdict.topPraise && (
            <div
              style={{
                borderLeft: `4px solid ${s.color}`,
                paddingLeft: 20,
                fontSize: 30,
                lineHeight: 1.45,
                color: "rgba(255,255,255,0.78)",
                marginBottom: 36,
              }}
            >
              {clamp(verdict.topPraise, 180)}
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {top.map((r) => {
              const persona = personas.find((p) => p.id === r.personaId);
              const c = r.score >= 8 ? "#22c55e" : r.score >= 6 ? "#eab308" : "#ef4444";
              return (
                <div
                  key={r.personaId}
                  style={{
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 12,
                    padding: "12px 18px",
                    fontSize: 20,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "rgba(255,255,255,0.65)",
                  }}
                >
                  {persona?.name?.split(" ")[0] ?? "Juror"}{" "}
                  <span style={{ color: c, fontWeight: 700 }}>{r.score}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            paddingTop: 24,
            fontSize: 20,
            fontFamily: "'JetBrains Mono', monospace",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          <span>{url.replace(/^https?:\/\//, "")}</span>
          <span style={{ color: "#f97316" }}>{ratings.length || 8} AI jurors · 4 rounds</span>
        </div>
      </div>
    );
  }
);

VerdictImageCard.displayName = "VerdictImageCard";

export default VerdictImageCard;
