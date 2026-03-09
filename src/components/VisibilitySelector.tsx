import { Eye, EyeOff, User } from "lucide-react";

type Visibility = "private" | "anonymous" | "public";

interface VisibilitySelectorProps {
  value: Visibility;
  onChange: (v: Visibility) => void;
  disabled?: boolean;
}

const options: { value: Visibility; label: string; desc: string; icon: typeof Eye }[] = [
  { value: "private", label: "Private", desc: "Only you can see", icon: EyeOff },
  { value: "anonymous", label: "Anonymous", desc: "Public without your name", icon: Eye },
  { value: "public", label: "Public", desc: "Visible with your profile", icon: User },
];

export default function VisibilitySelector({ value, onChange, disabled }: VisibilitySelectorProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
        Leaderboard Visibility
      </p>
      <div className="flex gap-2">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={`flex-1 rounded-[10px] border px-3 py-2 text-left transition-all ${
                active
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
              } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <opt.icon className={`w-3 h-3 ${active ? "text-primary" : ""}`} />
                <span className="text-xs font-semibold">{opt.label}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
