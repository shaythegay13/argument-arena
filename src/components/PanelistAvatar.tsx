import { useState } from "react";

/**
 * Shows a real panelist's headshot when one exists, and falls back to the
 * archetype emoji so the debate console never renders an empty slot.
 */
export default function PanelistAvatar({
  photoUrl,
  emoji,
  name,
  size = 28,
  className = "",
}: {
  photoUrl?: string | null | undefined;
  emoji: string;
  name?: string;
  size?: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const dimension = { width: size, height: size };

  if (photoUrl && !broken) {
    return (
      <img
        src={photoUrl}
        alt={name ? `${name} headshot` : "Panelist headshot"}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setBroken(true)}
        style={dimension}
        className={`rounded-full object-cover border border-border shrink-0 ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{ ...dimension, fontSize: Math.round(size * 0.62), lineHeight: 1 }}
      className={`inline-flex items-center justify-center rounded-full bg-muted/50 shrink-0 ${className}`}
    >
      {emoji}
    </span>
  );
}
