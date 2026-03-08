export interface Panel {
  id: string;
  name: string;
  focus: string;
  description: string;
  personaIds: string[];
}

export const PANELS: Panel[] = [
  {
    id: "investor",
    name: "Investor Panel",
    focus: "Fundability",
    description: "Can this raise money and return capital? Evaluates from the investor lens.",
    personaIds: [
      "accelerator", "vc", "angel", "institutional",
      "quant", "scout", "skeptic", "strategist",
    ],
  },
  {
    id: "product",
    name: "Product & Market Panel",
    focus: "Product-Market Fit",
    description: "Does this product solve a real problem for real people?",
    personaIds: [
      "visionary", "customer", "ux", "growth",
      "operator", "insider", "tech", "skeptic",
    ],
  },
  {
    id: "operator",
    name: "Startup Operator Panel",
    focus: "Execution Reality",
    description: "Can this actually be built, shipped, and scaled?",
    personaIds: [
      "operator", "quant", "growth", "insider",
      "marketplace", "ux", "tech", "skeptic",
    ],
  },
  {
    id: "accelerator",
    name: "Accelerator Simulation",
    focus: "YC-Style Partner Meeting",
    description: "Simulates a high-intensity accelerator partner meeting.",
    personaIds: [
      "accelerator", "angel", "vc", "visionary",
      "operator", "growth", "customer", "skeptic",
    ],
  },
];

/**
 * Keywords that map to panel recommendations.
 * The AI auto-selector uses these as hints alongside the full idea text.
 */
export const PANEL_SELECTION_HINTS: Record<string, string[]> = {
  investor: [
    "fundraising", "raise", "investors", "valuation", "cap table", "series",
    "VC", "venture", "angel", "investment", "pitch", "term sheet",
  ],
  product: [
    "user experience", "UX", "design", "customer", "product", "feature",
    "retention", "engagement", "onboarding", "app", "consumer",
  ],
  operator: [
    "operations", "hiring", "scale", "logistics", "supply chain", "build",
    "team", "execute", "MVP", "launch", "go-to-market", "marketplace",
  ],
  accelerator: [
    "accelerator", "YC", "Techstars", "batch", "demo day", "early stage",
    "pre-seed", "seed", "startup", "founder",
  ],
};
