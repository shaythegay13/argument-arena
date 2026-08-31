import { useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be under 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be under 255 characters"),
  message: z.string().trim().min(1, "Message is required").max(2000, "Message must be under 2000 characters"),
});

const Contact = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = contactSchema.safeParse({ name, email, message });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err: { path: (string | number | symbol)[]; message: string }) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("contact_messages").insert({
      user_id: user!.id,
      name: result.data.name,
      email: result.data.email,
      message: result.data.message,
    });

    if (error) {
      toast({ title: "Error sending message", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Send email notification
    try {
      await supabase.functions.invoke("send-contact-email", {
        body: { name: result.data.name, email: result.data.email, message: result.data.message },
      });
    } catch (emailErr) {
      console.error("Email notification failed:", emailErr);
      // Message is saved in DB regardless, so don't block the user
    }

    toast({ title: "Message sent", description: "We'll get back to you soon." });
    setName("");
    setMessage("");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="text-base sm:text-lg font-semibold text-foreground tracking-tight">Contact Us</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-4 sm:p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="bg-muted/50 border-border"
              maxLength={100}
            />
            {errors["name"] && <p className="text-xs text-destructive">{errors["name"]}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="bg-muted/50 border-border"
              maxLength={255}
            />
            {errors["email"] && <p className="text-xs text-destructive">{errors["email"]}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Message</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="How can we help?"
              className="bg-muted/50 border-border min-h-[120px] resize-none"
              maxLength={2000}
            />
            {errors["message"] && <p className="text-xs text-destructive">{errors["message"]}</p>}
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Send Message
          </Button>
        </form>
      </main>
    </div>
  );
};

export default Contact;
