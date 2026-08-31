import { useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/** Only allow same-origin relative paths as post-login redirect targets. */
const safeNext = (): string | null => {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("next");
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
};

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const next = safeNext();

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: next
              ? `${window.location.origin}/auth?next=${encodeURIComponent(next)}`
              : `${window.location.origin}/auth`,
          },
        });
        if (error) throw error;
        toast({
          title: "Check your email",
          description: "We sent you a confirmation link to verify your account.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (next) {
          window.location.href = next;
        } else {
          navigate("/debate");
        }
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Helmet>
        <title>{isSignUp ? "Sign Up" : "Sign In"} — Startup Jury AI</title>
        <meta name="description" content={isSignUp ? "Create your free Startup Jury AI account to validate startup ideas with 8 AI expert judges in under 5 minutes." : "Sign in to Startup Jury AI to access your past evaluations, judges, and verdicts."} />
        <link rel="canonical" href="https://www.startupjuryai.com/auth" />
        <meta property="og:title" content={isSignUp ? "Sign Up — Startup Jury AI" : "Sign In — Startup Jury AI"} />
        <meta property="og:description" content={isSignUp ? "Create a free account and start validating startup ideas." : "Sign in to access your AI jury verdicts."} />
        <meta property="og:url" content="https://www.startupjuryai.com/auth" />
      </Helmet>
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-start">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back
          </Button>
        </div>
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary shadow-md shadow-primary/30" />
            <span className="text-xl font-semibold text-foreground tracking-tight">Startup Jury AI</span>
          </div>
          <h1 className="text-sm text-muted-foreground">
            {isSignUp ? "Create your Startup Jury AI account" : "Sign in to Startup Jury AI"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-6">
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="bg-muted/50 border-border"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="bg-muted/50 border-border"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            {isSignUp ? "Sign Up" : "Sign In"}
          </Button>

          {!isSignUp && (
            <p className="text-center">
              <button type="button" onClick={() => navigate("/forgot-password")} className="text-xs text-muted-foreground hover:text-primary hover:underline">
                Forgot your password?
              </button>
            </p>
          )}

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full border-border text-foreground hover:bg-muted/50"
            onClick={async () => {
              const next = safeNext();
              const { error } = await lovable.auth.signInWithOAuth("google", {
                redirect_uri: next
                  ? `${window.location.origin}${next}`
                  : window.location.origin,
              });

              if (error) {
                toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
              }
            }}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full border-border text-foreground hover:bg-muted/50"
            onClick={async () => {
              const next = safeNext();
              const { error } = await lovable.auth.signInWithOAuth("apple", {
                redirect_uri: next
                  ? `${window.location.origin}${next}`
                  : window.location.origin,
              });

              if (error) {
                toast({ title: "Apple sign-in failed", description: error.message, variant: "destructive" });
              }
            }}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Continue with Apple
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary hover:underline font-medium"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Auth;
