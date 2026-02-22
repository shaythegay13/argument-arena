import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary shadow-md shadow-primary/30" />
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Startup Jury AI</h1>
          </div>
          <p className="text-sm text-muted-foreground">Reset your password</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          {sent ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-foreground">Check your email for a password reset link.</p>
              <p className="text-xs text-muted-foreground">If you don't see it, check your spam folder.</p>
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-primary">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="bg-muted/50 border-border"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Send Reset Link
              </Button>
              <p className="text-center">
                <button type="button" onClick={() => navigate("/auth")} className="text-xs text-primary hover:underline font-medium">
                  Back to sign in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
