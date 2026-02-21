import { Persona, PersonaRating } from "@/types/debate";
import { Star } from "lucide-react";

const personaTextColors: Record<string, string> = {
  angel: "text-persona-angel",
  vc: "text-persona-vc",
  customer: "text-persona-customer",
  operator: "text-persona-operator",
  skeptic: "text-persona-skeptic",
  quant: "text-persona-quant",
  insider: "text-persona-insider",
  visionary: "text-persona-visionary",
};

interface RatingsOverviewProps {
  personas: Persona[];
  ratings: PersonaRating[];
  isGenerating: boolean;
}

export default function RatingsOverview({ personas, ratings, isGenerating }: RatingsOverviewProps) {
  if (ratings.length === 0 && !isGenerating) return null;

  const avgRating = ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
    : null;

  return (
    <div className="rounded-lg border border-primary/20 bg-card p-6 stage-glow space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Star className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-mono uppercase tracking-widest text-primary font-semibold">
          Final Ratings
        </h3>
        {avgRating && (
          <span className="ml-auto text-2xl font-bold text-primary">{avgRating}/10</span>
        )}
      </div>

      {isGenerating ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-4/5" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ratings.map((rating) => {
            const persona = personas.find(p => p.id === rating.personaId);
            if (!persona) return null;
            const textColor = personaTextColors[persona.colorKey];
            return (
              <div key={rating.personaId} className="flex items-start gap-3 p-3 rounded-md bg-muted/30">
                <span className={`text-xl font-bold ${textColor}`}>{rating.rating}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${textColor}`}>{persona.name}</p>
                  <p className="text-xs text-muted-foreground">{rating.reason}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}