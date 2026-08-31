import { useState } from "react";
import { CreditCard, Loader2, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import PanelistAvatar from "@/components/PanelistAvatar";
import { PANELIST_LIBRARY, type LibraryPanelist } from "@/data/panelistLibrary";
import { PERSONA_MAP } from "@/data/personas";
import { useToast } from "@/hooks/use-toast";
import { importLibraryPanelists, type Panelist } from "@/lib/panelists";

interface Props {
  userId: string;
  existingNames: string[];
  totalSlots: number;
  usedSlots: number;
  remaining: number;
  atLimit: boolean;
  tier: string;
  slotsLoading: boolean;
  purchasing: boolean;
  onPurchase: (quantity?: number) => Promise<void>;
  onImported: (created: Panelist[]) => void;
}

/**
 * The curated bench: pre-written, jury-grade experts with headshots that a
 * founder can seat in one click, plus the paid-slot meter that governs how many
 * custom panelists their plan allows.
 */
export default function PanelistLibraryPanel({
  userId,
  existingNames,
  totalSlots,
  usedSlots,
  remaining,
  atLimit,
  tier,
  slotsLoading,
  purchasing,
  onPurchase,
  onImported,
}: Props) {
  const { toast } = useToast();
  const [importing, setImporting] = useState<string | null>(null);
  const taken = new Set(existingNames.map((n) => n.trim().toLowerCase()));

  const runImport = async (drafts: LibraryPanelist[], label: string) => {
    if (atLimit) {
      toast({
        title: "No panelist slots left",
        description: "Buy a custom panelist slot or upgrade your plan to seat more experts.",
        variant: "destructive",
      });
      return;
    }
    const allowed = drafts.slice(0, remaining);
    setImporting(label);
    try {
      const created = await importLibraryPanelists(userId, allowed);
      onImported(created);
      toast({
        title: created.length ? `Added ${created.length} panelist${created.length === 1 ? "" : "s"}` : "Already on your roster",
        description: created.length
          ? "Seat them by name in the director console's Custom panel."
          : "These panelists are already in your database.",
      });
      if (allowed.length < drafts.length) {
        toast({
          title: "Slot limit reached",
          description: `Only ${allowed.length} of ${drafts.length} fit your current slots.`,
        });
      }
    } catch (err) {
      toast({
        title: "Import failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setImporting(null);
    }
  };

  const unimported = PANELIST_LIBRARY.filter((p) => !taken.has(p.name.trim().toLowerCase()));

  return (
    <section className="rounded-[14px] border border-border bg-card p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Featured jury bench
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Verified-style expert profiles with headshots, credentials and track records already written.
            Import one and they debate as themselves — no bio writing required.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Panelist slots</p>
          <p className="text-lg font-bold text-foreground">
            {slotsLoading ? "…" : `${usedSlots} / ${totalSlots}`}
          </p>
          <p className="text-[11px] text-muted-foreground capitalize">{tier} plan</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={() => runImport(unimported, "all")}
          disabled={!unimported.length || atLimit || importing !== null}
          className="font-semibold"
        >
          {importing === "all" ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Users className="w-4 h-4 mr-2" />
          )}
          Import full bench ({Math.min(unimported.length, remaining)})
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void onPurchase(1)}
          disabled={purchasing}
        >
          {purchasing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CreditCard className="w-4 h-4 mr-2" />
          )}
          Buy a slot — $9
        </Button>
        {atLimit && (
          <span className="text-xs text-destructive">
            Slot limit reached. Buy a slot or upgrade to seat more panelists.
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PANELIST_LIBRARY.map((p) => {
          const owned = taken.has(p.name.trim().toLowerCase());
          const archetype = PERSONA_MAP[p.base_persona_id];
          return (
            <article
              key={p.libraryKey}
              className="rounded-[12px] border border-border bg-background/60 p-3 flex gap-3"
            >
              <PanelistAvatar
                name={p.name}
                photoUrl={p.photo_url ?? null}
                emoji={archetype?.emoji ?? "🎙️"}
                size={44}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {[p.title, p.firm].filter(Boolean).join(" · ")}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-3">{p.credentials}</p>
                <Button
                  size="sm"
                  variant={owned ? "ghost" : "secondary"}
                  className="mt-2 h-7 text-[11px]"
                  disabled={owned || atLimit || importing !== null}
                  onClick={() => runImport([p], p.libraryKey)}
                >
                  {importing === p.libraryKey ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : null}
                  {owned ? "On your roster" : "Add to roster"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Featured bench profiles are composite industry experts built from real market patterns, not
        portrayals of specific individuals. Your own panelists always debate with your credentials.
      </p>
    </section>
  );
}
