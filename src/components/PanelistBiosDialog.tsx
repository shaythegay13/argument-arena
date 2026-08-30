import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, Trash2, UserPen, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PERSONAS } from "@/data/personas";
import { getPersonaColors } from "@/data/personaColors";
import { useToast } from "@/hooks/use-toast";
import {
  PANELIST_FIELD_LIMITS,
  deletePanelistProfile,
  isProfileFilled,
  savePanelistProfile,
  type PanelistProfile,
  type PanelistProfileMap,
} from "@/lib/panelistProfiles";

const EMPTY: Omit<PanelistProfile, "persona_id"> = {
  display_name: "",
  title: "",
  bio: "",
  background: "",
  signature_style: "",
};

/**
 * Editor for real panelist bios. Whatever the founder writes here is folded
 * into that judge's prompt, so debate and closing statements come from a
 * specific person with a specific track record.
 */
export default function PanelistBiosDialog({
  open,
  onOpenChange,
  userId,
  profiles,
  onProfilesChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  profiles: PanelistProfileMap;
  onProfilesChange: (next: PanelistProfileMap) => void;
}) {
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string>(PERSONAS[0]?.id ?? "");
  const [draft, setDraft] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const persona = useMemo(() => PERSONAS.find((p) => p.id === activeId), [activeId]);

  useEffect(() => {
    const existing = profiles[activeId];
    setDraft({
      display_name: existing?.display_name ?? "",
      title: existing?.title ?? "",
      bio: existing?.bio ?? "",
      background: existing?.background ?? "",
      signature_style: existing?.signature_style ?? "",
    });
  }, [activeId, profiles, open]);

  const handleSave = async () => {
    if (!persona) return;
    setSaving(true);
    try {
      const profile: PanelistProfile = { persona_id: persona.id, ...draft };
      await savePanelistProfile(userId, profile);
      onProfilesChange({ ...profiles, [persona.id]: profile });
      toast({
        title: "Bio saved",
        description: `${draft.display_name?.trim() || persona.name} will speak from this background in your next debate.`,
      });
    } catch (err) {
      toast({
        title: "Couldn't save bio",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!persona) return;
    setSaving(true);
    try {
      await deletePanelistProfile(userId, persona.id);
      const next = { ...profiles };
      delete next[persona.id];
      onProfilesChange(next);
      setDraft(EMPTY);
      toast({ title: "Bio removed", description: `${persona.name} is back to the default background.` });
    } catch (err) {
      toast({
        title: "Couldn't remove bio",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPen className="w-4 h-4 text-primary" /> Panelist Bios &amp; Backgrounds
          </DialogTitle>
          <DialogDescription>
            Give each judge a real name, track record and voice. Everything you write here is used in
            their debate rounds and closing statement.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4">
          {/* Judge list */}
          <div className="flex sm:flex-col gap-1.5 overflow-x-auto sm:overflow-visible sm:max-h-[52vh] sm:overflow-y-auto pb-1">
            {PERSONAS.map((p) => {
              const colors = getPersonaColors(p.colorKey);
              const filled = isProfileFilled(profiles[p.id]);
              const active = p.id === activeId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveId(p.id)}
                  aria-pressed={active}
                  className={`shrink-0 text-left px-2.5 py-2 rounded-[10px] border text-xs transition-colors ${
                    active ? "border-primary/50 bg-primary/10" : "border-border bg-muted/20 hover:bg-muted/40"
                  }`}
                >
                  <span className={`font-semibold ${colors.text}`}>
                    {profiles[p.id]?.display_name?.trim() || p.name}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    {profiles[p.id]?.title?.trim() || p.subtitle}
                  </span>
                  {filled && (
                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-mono text-verdict-go">
                      <Check className="w-2.5 h-2.5" /> custom bio
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Editor */}
          {persona && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="bio-name" className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Name
                  </label>
                  <Input
                    id="bio-name"
                    value={draft.display_name ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, display_name: e.target.value }))}
                    placeholder={persona.name}
                    maxLength={PANELIST_FIELD_LIMITS.display_name}
                    className="bg-muted/40 border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="bio-title" className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Title / Firm
                  </label>
                  <Input
                    id="bio-title"
                    value={draft.title ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    placeholder={persona.subtitle}
                    maxLength={PANELIST_FIELD_LIMITS.title}
                    className="bg-muted/40 border-border"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="bio-bio" className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Short bio
                </label>
                <Textarea
                  id="bio-bio"
                  value={draft.bio ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
                  placeholder="Ex: Led seed investing at a $400M fund for 9 years; wrote the first checks into two fintech unicorns."
                  maxLength={PANELIST_FIELD_LIMITS.bio}
                  className="bg-muted/40 border-border min-h-[80px] resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="bio-background" className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Background &amp; track record
                </label>
                <Textarea
                  id="bio-background"
                  value={draft.background ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, background: e.target.value }))}
                  placeholder="Ex: Operated a 60-person marketplace through a failed Series B; specific deals, numbers, industries and hard lessons this judge should cite."
                  maxLength={PANELIST_FIELD_LIMITS.background}
                  className="bg-muted/40 border-border min-h-[100px] resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="bio-style" className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Voice &amp; signature style
                </label>
                <Textarea
                  id="bio-style"
                  value={draft.signature_style ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, signature_style: e.target.value }))}
                  placeholder="Ex: Speaks in short sentences, always opens with the number that worries them, never uses buzzwords."
                  maxLength={PANELIST_FIELD_LIMITS.signature_style}
                  className="bg-muted/40 border-border min-h-[70px] resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button onClick={handleSave} disabled={saving} className="font-semibold">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save bio
                </Button>
                {isProfileFilled(profiles[persona.id]) && (
                  <Button variant="ghost" onClick={handleReset} disabled={saving} className="text-muted-foreground">
                    <Trash2 className="w-4 h-4 mr-2" /> Reset to default
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
