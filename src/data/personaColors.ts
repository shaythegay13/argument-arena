/**
 * Centralized persona color classes — single source of truth.
 * Every component that needs persona colors imports from here.
 */
export interface PersonaColorSet {
  text: string;
  bg: string;
  border: string;
  glow: string;
  barBg: string; // raw HSL for chart bars
}

export const personaColors: Record<string, PersonaColorSet> = {
  // Original 8 (remapped)
  angel:        { text: "text-persona-angel",        bg: "bg-persona-angel",        border: "persona-glow-angel",        glow: "shadow-[0_0_20px_hsl(25_95%_53%/0.3)]",   barBg: "hsl(25, 95%, 53%)" },
  vc:           { text: "text-persona-vc",           bg: "bg-persona-vc",           border: "persona-glow-vc",           glow: "shadow-[0_0_20px_hsl(199_89%_60%/0.3)]",  barBg: "hsl(199, 89%, 60%)" },
  customer:     { text: "text-persona-customer",     bg: "bg-persona-customer",     border: "persona-glow-customer",     glow: "shadow-[0_0_20px_hsl(142_71%_45%/0.3)]",  barBg: "hsl(142, 71%, 45%)" },
  operator:     { text: "text-persona-operator",     bg: "bg-persona-operator",     border: "persona-glow-operator",     glow: "shadow-[0_0_20px_hsl(142_60%_50%/0.3)]",  barBg: "hsl(142, 60%, 50%)" },
  skeptic:      { text: "text-persona-skeptic",      bg: "bg-persona-skeptic",      border: "persona-glow-skeptic",      glow: "shadow-[0_0_20px_hsl(0_84%_60%/0.3)]",    barBg: "hsl(0, 84%, 60%)" },
  quant:        { text: "text-persona-quant",        bg: "bg-persona-quant",        border: "persona-glow-quant",        glow: "shadow-[0_0_20px_hsl(215_16%_65%/0.3)]",  barBg: "hsl(215, 16%, 65%)" },
  insider:      { text: "text-persona-insider",      bg: "bg-persona-insider",      border: "persona-glow-insider",      glow: "shadow-[0_0_20px_hsl(25_75%_50%/0.3)]",   barBg: "hsl(25, 75%, 50%)" },
  visionary:    { text: "text-persona-visionary",    bg: "bg-persona-visionary",    border: "persona-glow-visionary",    glow: "shadow-[0_0_20px_hsl(280_55%_55%/0.3)]",  barBg: "hsl(280, 55%, 55%)" },
  // New 8
  accelerator:  { text: "text-persona-accelerator",  bg: "bg-persona-accelerator",  border: "persona-glow-accelerator",  glow: "shadow-[0_0_20px_hsl(45_90%_50%/0.3)]",   barBg: "hsl(45, 90%, 50%)" },
  growth:       { text: "text-persona-growth",       bg: "bg-persona-growth",       border: "persona-glow-growth",       glow: "shadow-[0_0_20px_hsl(330_70%_55%/0.3)]",  barBg: "hsl(330, 70%, 55%)" },
  scout:        { text: "text-persona-scout",        bg: "bg-persona-scout",        border: "persona-glow-scout",        glow: "shadow-[0_0_20px_hsl(170_60%_45%/0.3)]",  barBg: "hsl(170, 60%, 45%)" },
  strategist:   { text: "text-persona-strategist",   bg: "bg-persona-strategist",   border: "persona-glow-strategist",   glow: "shadow-[0_0_20px_hsl(220_50%_55%/0.3)]",  barBg: "hsl(220, 50%, 55%)" },
  marketplace:  { text: "text-persona-marketplace",  bg: "bg-persona-marketplace",  border: "persona-glow-marketplace",  glow: "shadow-[0_0_20px_hsl(15_80%_55%/0.3)]",   barBg: "hsl(15, 80%, 55%)" },
  ux:           { text: "text-persona-ux",           bg: "bg-persona-ux",           border: "persona-glow-ux",           glow: "shadow-[0_0_20px_hsl(300_50%_60%/0.3)]",  barBg: "hsl(300, 50%, 60%)" },
  tech:         { text: "text-persona-tech",         bg: "bg-persona-tech",         border: "persona-glow-tech",         glow: "shadow-[0_0_20px_hsl(190_70%_50%/0.3)]",  barBg: "hsl(190, 70%, 50%)" },
  institutional:{ text: "text-persona-institutional", bg: "bg-persona-institutional", border: "persona-glow-institutional", glow: "shadow-[0_0_20px_hsl(250_45%_55%/0.3)]",  barBg: "hsl(250, 45%, 55%)" },
};

/** Safe lookup — returns a neutral default if colorKey is unknown */
export function getPersonaColors(colorKey: string): PersonaColorSet {
  return personaColors[colorKey] ?? personaColors.quant;
}
