import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  Users,
  BadgeCheck,
  Link2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PanelistAvatar from "@/components/PanelistAvatar";
import { PERSONAS, PERSONA_MAP } from "@/data/personas";
import { getPersonaColors } from "@/data/personaColors";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  PANELIST_LIMITS,
  deletePanelist,
  emptyPanelist,
  fetchPanelists,
  panelistHeadline,
  resolvePhotoUrls,
  savePanelist,
  uploadPanelistPhoto,
  type Panelist,
  type PanelistDraft,
} from "@/lib/panelists";
import PanelistLibraryPanel from "@/components/PanelistLibraryPanel";
import { usePanelistSlots } from "@/hooks/usePanelistSlots";

export default function PanelistsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [panelists, setPanelists] = useState<Panelist[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<PanelistDraft | null>(null);
  const [expertiseInput, setExpertiseInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async (userId: string) => {
    setLoading(true);
    try {
      const rows = await fetchPanelists(userId);
      setPanelists(rows);
      setPhotoUrls(await resolvePhotoUrls(rows.map((r) => r.photo_url)));
    } catch (err) {
      toast({
        title: "Couldn't load your panelists",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) void load(user.id);
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const slotState = usePanelistSlots(user?.id, panelists.length);

  const draftPhotoUrl = useMemo(() => {
    if (!draft?.photo_url) return null;
    return photoUrls[draft.photo_url] ?? null;
  }, [draft?.photo_url, photoUrls]);

  const baseArchetype = draft ? PERSONA_MAP[draft.base_persona_id] ?? PERSONAS[0]! : null;

  const startNew = () => {
    if (slotState.atLimit) {
      toast({
        title: "No panelist slots left",
        description: `Your plan includes ${slotState.totalSlots} panelist slot${slotState.totalSlots === 1 ? "" : "s"}. Buy a slot or upgrade to add more.`,
        variant: "destructive",
      });
      return;
    }
    setDraft(emptyPanelist());
    setExpertiseInput("");
  };

  const startEdit = (p: Panelist) => {
    setDraft({ ...p });
    setExpertiseInput("");
  };

  const handlePhoto = async (file: File) => {
    if (!user?.id || !draft) return;
    setUploading(true);
    try {
      const path = await uploadPanelistPhoto(user.id, file);
      const urls = await resolvePhotoUrls([path]);
      setPhotoUrls((prev) => ({ ...prev, ...urls }));
      setDraft({ ...draft, photo_url: path });
      toast({ title: "Photo uploaded", description: "Save the panelist to keep it." });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Please try a different image.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addExpertise = () => {
    if (!draft) return;
    const tag = expertiseInput.trim();
    if (!tag || draft.expertise.includes(tag) || draft.expertise.length >= 12) {
      setExpertiseInput("");
      return;
    }
    setDraft({ ...draft, expertise: [...draft.expertise, tag] });
    setExpertiseInput("");
  };

  const handleSave = async () => {
    if (!user?.id || !draft) return;
    if (!draft.id && slotState.atLimit) {
      toast({
        title: "No panelist slots left",
        description: "Buy a custom panelist slot or upgrade your plan to save another panelist.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const saved = await savePanelist(user.id, draft);
      setPanelists((prev) => {
        const exists = prev.some((p) => p.id === saved.id);
        return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [...prev, saved];
      });
      setPhotoUrls((prev) => ({ ...prev, ...(saved.photo_url && photoUrls[saved.photo_url] ? {} : {}) }));
      if (saved.photo_url && !photoUrls[saved.photo_url]) {
        setPhotoUrls((prev) => ({ ...prev, ...( { } ) }));
        const urls = await resolvePhotoUrls([saved.photo_url]);
        setPhotoUrls((prev) => ({ ...prev, ...urls }));
      }
      setDraft(null);
      void slotState.refresh();
      toast({ title: "Panelist saved", description: `${saved.name} is ready to seat on a jury.` });
    } catch (err) {
      toast({
        title: "Couldn't save panelist",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Panelist) => {
    if (!user?.id) return;
    try {
      await deletePanelist(user.id, p.id);
      setPanelists((prev) => prev.filter((x) => x.id !== p.id));
      if (draft?.id === p.id) setDraft(null);
      void slotState.refresh();
      toast({ title: "Panelist removed", description: `${p.name} is off your roster.` });
    } catch (err) {
      toast({
        title: "Couldn't remove panelist",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Panelist Database — Build Your Real Jury | Startup Jury AI</title>
        <meta
          name="description"
          content="Create and edit real panelists with photos, credentials and track records, then seat them on your jury in the director console."
        />
        <link rel="canonical" href="https://www.startupjuryai.com/panelists" />
        <meta property="og:title" content="Panelist Database — Startup Jury AI" />
        <meta property="og:description" content="Maintain a roster of real panelists with photos and credentials." />
      </Helmet>

      <SiteHeader />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" /> Panelist Database
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Profiles of real investors you add — name, firm, credentials, track record, headshot.
              Seat them by name on a custom jury and the AI debates in their voice.
            </p>
          </div>
          <Button onClick={startNew} className="font-semibold">
            <Plus className="w-4 h-4 mr-2" /> New panelist
          </Button>
        </div>

        <div className="rounded-[12px] border border-primary/30 bg-primary/5 p-4 text-sm text-foreground space-y-2">
          <p className="font-semibold flex items-center gap-2">
            <span className="text-primary">ℹ️</span> What is this, and how is it different from the AI jury?
          </p>
          <p className="text-muted-foreground">
            By default every debate runs on our <strong>built-in AI jury</strong> — 16 expert
            archetypes where Gemini auto-selects the 8 best fit for your pitch. You don't touch this
            database for that.
          </p>
          <p className="text-muted-foreground">
            This database is an <strong>optional override layer</strong>. The records here are
            <strong> profiles you create</strong> — fictional or composite investor characters you
            author (name, firm, credentials, track record, voice). When you seat one on a custom
            panel, the AI debates <em>as that character</em> using the background you wrote, instead
            of a generic archetype. Think of it like writing a role for a fictional judge.
          </p>
          <p className="text-[12px] text-muted-foreground">
            <strong className="text-foreground">Use responsibly:</strong> only model real, named
            people if you have their permission. Do not use this feature to impersonate, defame, or
            put words in a real person's mouth. You are solely responsible for the profiles you
            create and any statements the AI generates from them.
          </p>
        </div>

        {!user && (
          <div className="rounded-[14px] border border-border bg-card p-6 text-sm text-muted-foreground">
            Sign in to build your panelist roster.
          </div>
        )}

        {user && (
          <PanelistLibraryPanel
            userId={user.id}
            existingNames={panelists.map((p) => p.name)}
            totalSlots={slotState.totalSlots}
            usedSlots={slotState.usedSlots}
            remaining={slotState.remaining}
            atLimit={slotState.atLimit}
            tier={slotState.slots?.tier ?? "free"}
            slotsLoading={slotState.loading}
            purchasing={slotState.purchasing}
            onPurchase={async (qty) => {
              try {
                await slotState.purchase(qty ?? 1);
              } catch (err) {
                toast({
                  title: "Checkout failed",
                  description: err instanceof Error ? err.message : "Please try again.",
                  variant: "destructive",
                });
              }
            }}
            onImported={async (created) => {
              if (created.length) {
                setPanelists((prev) => [...prev, ...created]);
                setPhotoUrls(await resolvePhotoUrls([...panelists, ...created].map((p) => p.photo_url)));
              }
              void slotState.refresh();
            }}
          />
        )}

        {/* Editor */}
        {user && draft && baseArchetype && (
          <section className="rounded-[14px] border border-primary/30 bg-card p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">
                {draft.id ? `Edit ${draft.name || "panelist"}` : "New panelist"}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setDraft(null)} aria-label="Close editor">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-5">
              {/* Photo */}
              <div className="flex flex-col items-center gap-2">
                <PanelistAvatar
                  photoUrl={draftPhotoUrl}
                  emoji={baseArchetype.emoji}
                  name={draft.name || "New panelist"}
                  size={112}
                />
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handlePhoto(file);
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-2" />}
                  Photo
                </Button>
                {draft.photo_url && (
                  <button
                    type="button"
                    className="text-[11px] text-muted-foreground hover:underline"
                    onClick={() => setDraft({ ...draft, photo_url: null })}
                  >
                    Remove photo
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Full name" htmlFor="p-name">
                    <Input
                      id="p-name"
                      value={draft.name}
                      maxLength={PANELIST_LIMITS.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      placeholder="Ex: Priya Raman"
                      className="bg-muted/40 border-border"
                    />
                  </Field>
                  <Field label="Title" htmlFor="p-title">
                    <Input
                      id="p-title"
                      value={draft.title ?? ""}
                      maxLength={PANELIST_LIMITS.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                      placeholder="Ex: General Partner"
                      className="bg-muted/40 border-border"
                    />
                  </Field>
                  <Field label="Firm / company" htmlFor="p-firm">
                    <Input
                      id="p-firm"
                      value={draft.firm ?? ""}
                      maxLength={PANELIST_LIMITS.firm}
                      onChange={(e) => setDraft({ ...draft, firm: e.target.value })}
                      placeholder="Ex: Northbound Capital"
                      className="bg-muted/40 border-border"
                    />
                  </Field>
                  <Field label="LinkedIn / profile URL" htmlFor="p-linkedin">
                    <Input
                      id="p-linkedin"
                      value={draft.linkedin_url ?? ""}
                      maxLength={PANELIST_LIMITS.linkedin_url}
                      onChange={(e) => setDraft({ ...draft, linkedin_url: e.target.value })}
                      placeholder="https://linkedin.com/in/…"
                      className="bg-muted/40 border-border"
                    />
                  </Field>
                </div>

                <Field label="Credentials" htmlFor="p-credentials">
                  <Textarea
                    id="p-credentials"
                    value={draft.credentials ?? ""}
                    maxLength={PANELIST_LIMITS.credentials}
                    onChange={(e) => setDraft({ ...draft, credentials: e.target.value })}
                    placeholder="Ex: 14 years investing; 41 seed checks; 2 IPOs; Stanford MBA; former CFO of a $180M ARR SaaS."
                    className="bg-muted/40 border-border min-h-[70px] resize-none"
                  />
                </Field>

                <Field label="Short bio" htmlFor="p-bio">
                  <Textarea
                    id="p-bio"
                    value={draft.bio ?? ""}
                    maxLength={PANELIST_LIMITS.bio}
                    onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                    placeholder="Who they are in two or three sentences."
                    className="bg-muted/40 border-border min-h-[80px] resize-none"
                  />
                </Field>

                <Field label="Background & track record" htmlFor="p-background">
                  <Textarea
                    id="p-background"
                    value={draft.background ?? ""}
                    maxLength={PANELIST_LIMITS.background}
                    onChange={(e) => setDraft({ ...draft, background: e.target.value })}
                    placeholder="Specific deals, companies, numbers, industries and hard lessons this panelist should cite in debate."
                    className="bg-muted/40 border-border min-h-[100px] resize-none"
                  />
                </Field>

                <Field label="Voice & signature style" htmlFor="p-style">
                  <Textarea
                    id="p-style"
                    value={draft.signature_style ?? ""}
                    maxLength={PANELIST_LIMITS.signature_style}
                    onChange={(e) => setDraft({ ...draft, signature_style: e.target.value })}
                    placeholder="Ex: Opens with the number that worries them, short sentences, zero buzzwords."
                    className="bg-muted/40 border-border min-h-[70px] resize-none"
                  />
                </Field>

                {/* Expertise tags */}
                <Field label="Areas of expertise" htmlFor="p-expertise">
                  <div className="flex gap-2">
                    <Input
                      id="p-expertise"
                      value={expertiseInput}
                      onChange={(e) => setExpertiseInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addExpertise();
                        }
                      }}
                      placeholder="Ex: marketplaces — press Enter"
                      className="bg-muted/40 border-border"
                    />
                    <Button type="button" variant="outline" onClick={addExpertise}>
                      Add
                    </Button>
                  </div>
                  {draft.expertise.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {draft.expertise.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setDraft({ ...draft, expertise: draft.expertise.filter((t) => t !== tag) })}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border bg-muted/40 text-[11px] text-foreground hover:border-destructive/50"
                        >
                          {tag} <X className="w-2.5 h-2.5" />
                        </button>
                      ))}
                    </div>
                  )}
                </Field>

                {/* Archetype */}
                <Field label="Scoring archetype" htmlFor="p-archetype">
                  <select
                    id="p-archetype"
                    value={draft.base_persona_id}
                    onChange={(e) => setDraft({ ...draft, base_persona_id: e.target.value })}
                    className="w-full rounded-[10px] bg-muted/40 border border-border px-3 py-2 text-sm text-foreground"
                  >
                    {PERSONAS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.emoji} {p.subtitle} — {p.scoringWeights.map((w) => w.label).join(" / ")}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Sets the rubric this panelist grades with. Their identity, credentials and voice stay yours.
                  </p>
                </Field>

                <div className="flex items-center gap-2 pt-1">
                  <Switch
                    id="p-active"
                    checked={draft.is_active}
                    onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
                  />
                  <label htmlFor="p-active" className="text-sm text-muted-foreground">
                    Available to seat on juries
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button onClick={handleSave} disabled={saving || !draft.name.trim()} className="font-semibold">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save panelist
                  </Button>
                  <Button variant="ghost" onClick={() => setDraft(null)} disabled={saving}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Roster */}
        {user && (
          <section className="space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Your roster {panelists.length > 0 && `(${panelists.length})`}
            </h2>

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading panelists…
              </div>
            ) : panelists.length === 0 ? (
              <div className="rounded-[14px] border border-dashed border-border bg-card/50 p-8 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  No panelists yet. Add the investors, operators and experts you actually want in the room.
                </p>
                <Button onClick={startNew} variant="outline">
                  <Plus className="w-4 h-4 mr-2" /> Add your first panelist
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {panelists.map((p) => {
                  const archetype = PERSONA_MAP[p.base_persona_id] ?? PERSONAS[0]!;
                  const colors = getPersonaColors(archetype.colorKey);
                  return (
                    <article
                      key={p.id}
                      className="rounded-[14px] border border-border bg-card p-4 space-y-3 flex flex-col"
                    >
                      <div className="flex items-start gap-3">
                        <PanelistAvatar
                          photoUrl={p.photo_url ? photoUrls[p.photo_url] ?? null : null}
                          emoji={archetype.emoji}
                          name={p.name}
                          size={52}
                        />
                        <div className="min-w-0">
                          <h3 className={`font-semibold text-sm truncate ${colors.text}`}>{p.name}</h3>
                          <p className="text-[11px] text-muted-foreground truncate">{panelistHeadline(p)}</p>
                          <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground/70 mt-0.5">
                            {archetype.subtitle} rubric
                          </p>
                        </div>
                      </div>

                      {p.credentials && (
                        <p className="text-[11px] text-foreground/80 flex gap-1.5">
                          <BadgeCheck className="w-3.5 h-3.5 text-verdict-go shrink-0 mt-[1px]" />
                          <span className="line-clamp-3">{p.credentials}</span>
                        </p>
                      )}
                      {p.bio && <p className="text-[11px] text-muted-foreground line-clamp-3">{p.bio}</p>}

                      {p.expertise.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {p.expertise.slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 rounded-full bg-muted/50 border border-border text-[10px] text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1 mt-auto">
                        <Button size="sm" variant="outline" onClick={() => startEdit(p)}>
                          Edit
                        </Button>
                        {p.linkedin_url && (
                          <a
                            href={p.linkedin_url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-muted-foreground hover:text-foreground"
                            aria-label={`Open ${p.name}'s profile`}
                          >
                            <Link2 className="w-4 h-4" />
                          </a>
                        )}
                        {!p.is_active && (
                          <span className="text-[10px] font-mono uppercase text-muted-foreground">benched</span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-auto text-muted-foreground hover:text-destructive"
                          onClick={() => void handleDelete(p)}
                          aria-label={`Remove ${p.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
