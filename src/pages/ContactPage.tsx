import { useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Send, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be under 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be under 255 characters"),
  message: z.string().trim().min(1, "Message is required").max(2000, "Message must be under 2000 characters"),
});

const SUPPORT_EMAIL = "info@startupjuryai.com";

/**
 * Public Contact page. Signed-in users submit through the app (stored + emailed);
 * signed-out visitors get a sign-in prompt plus a direct email fallback.
 */
export default function ContactPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = contactSchema.safeParse({ name, email: email || user?.email || "", message });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!user) {
      window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
        `Startup Jury AI — message from ${result.data.name}`
      )}&body=${encodeURIComponent(result.data.message)}`;
      return;
    }

    setSending(true);
    const { error } = await supabase.from("contact_messages").insert({
      user_id: user.id,
      name: result.data.name,
      email: result.data.email,
      message: result.data.message,
    });

    if (error) {
      toast({ title: "Error sending message", description: error.message, variant: "destructive" });
      setSending(false);
      return;
    }

    try {
      await supabase.functions.invoke("send-contact-email", {
        body: { name: result.data.name, email: result.data.email, message: result.data.message },
      });
    } catch (emailErr) {
      console.error("Email notification failed:", emailErr);
    }

    toast({ title: "Message sent", description: "We'll get back to you soon." });
    setName("");
    setMessage("");
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-lg w-full mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Contact Us</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Questions about credits, plans, or the jury? Send us a note and we'll reply by email.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 rounded-lg border border-border bg-card p-4 sm:p-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="contact-name" className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Name</label>
            <Input
              id="contact-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="bg-muted/50 border-border"
              maxLength={100}
            />
            {errors["name"] && <p className="text-xs text-destructive">{errors["name"]}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="contact-email" className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Email</label>
            <Input
              id="contact-email"
              type="email"
              value={email || user?.email || ""}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="bg-muted/50 border-border"
              maxLength={255}
            />
            {errors["email"] && <p className="text-xs text-destructive">{errors["email"]}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="contact-message" className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Message</label>
            <Textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="How can we help?"
              className="bg-muted/50 border-border min-h-[120px] resize-none"
              maxLength={2000}
            />
            {errors["message"] && <p className="text-xs text-destructive">{errors["message"]}</p>}
          </div>

          <Button
            type="submit"
            disabled={sending || loading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : user ? (
              <Send className="w-4 h-4 mr-2" />
            ) : (
              <Mail className="w-4 h-4 mr-2" />
            )}
            {user ? "Send Message" : "Send via Email"}
          </Button>

          {!loading && !user && (
            <p className="text-xs text-muted-foreground text-center">
              Prefer in-app support?{" "}
              <button type="button" onClick={() => navigate("/auth")} className="text-primary hover:underline">
                Sign in
              </button>{" "}
              to send and track your message, or email us at{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>.
            </p>
          )}
        </form>
      </main>

      <SiteFooter />
    </div>
  );
}
