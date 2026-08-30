import { useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X, Zap, Trophy, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.png";

/**
 * Session-aware site header for public pages (Landing, About, Pricing, Contact).
 * Always shows About + Pricing. Signed-out visitors get Sign In / Get Started;
 * signed-in users get New Debate / Leaderboard / Sign Out. While the session is
 * still resolving we render a neutral placeholder so neither menu flashes.
 */
export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const publicLinks = [
    { label: "About", href: "/about" },
    { label: "Pricing", href: "/pricing" },
  ];

  const authedItems = [
    { label: "New Debate", icon: Zap, onClick: () => navigate("/debate") },
    { label: "Leaderboard", icon: Trophy, onClick: () => navigate("/leaderboard") },
    { label: "Sign Out", icon: LogOut, onClick: handleSignOut },
  ];

  return (
    <header className="border-b border-border px-4 sm:px-6 py-4 sticky top-0 z-50 bg-background/90 backdrop-blur-md relative">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between">
        <Link to="/" aria-label="Startup Jury AI home">
          <img src={logo} alt="Startup Jury AI" className="h-28 sm:h-40 md:h-48 -my-8 sm:-my-12 w-auto" width={307} height={305} fetchPriority="high" decoding="async" />
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main" className="hidden sm:flex items-center gap-2 sm:gap-3">
          {publicLinks.map((l) => (
            <Link
              key={l.label}
              to={l.href}
              className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5"
              activeProps={{ className: "text-foreground font-semibold", "aria-current": "page" }}
            >
              {l.label}
            </Link>
          ))}
          {loading ? (
            <div
              className="flex items-center gap-2"
              role="status"
              aria-live="polite"
              aria-label="Checking your session"
              data-testid="header-auth-loading"
            >
              <span className="h-8 w-20 rounded-[10px] bg-muted/60 animate-pulse" />
              <span className="h-8 w-24 rounded-[10px] bg-muted/60 animate-pulse" />
            </div>
          ) : user ? (
            authedItems.map((item) => (
              <Button key={item.label} variant="ghost" size="sm" onClick={item.onClick} className="text-muted-foreground hover:text-foreground text-xs sm:text-sm">
                <item.icon className="w-4 h-4 mr-1.5" aria-hidden="true" />
                {item.label}
              </Button>
            ))
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-muted-foreground hover:text-foreground text-xs sm:text-sm">
                Sign In
              </Button>
              <Button size="sm" onClick={() => navigate("/auth")} className="font-semibold text-xs sm:text-sm rounded-[10px]">
                Get Started
              </Button>
            </>
          )}
        </nav>

        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground sm:hidden"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="site-header-mobile-menu"
        >
          {open ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
        </Button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <nav
          id="site-header-mobile-menu"
          aria-label="Mobile"
          className="absolute top-full left-0 right-0 z-50 border-b border-border bg-card sm:hidden"
        >
          <div className="px-4 py-2 space-y-1">
            {publicLinks.map((l) => (
              <Link
                key={l.label}
                to={l.href}
                onClick={() => setOpen(false)}
                aria-current={pathname === l.href ? "page" : undefined}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-colors hover:bg-muted/50 ${
                  pathname === l.href ? "text-foreground font-semibold bg-muted/40" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            ))}
            {loading ? (
              <div className="px-3 py-3" role="status" aria-live="polite" aria-label="Checking your session">
                <span className="block h-5 w-28 rounded bg-muted/60 animate-pulse" />
              </div>
            ) : user ? (
              authedItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    setOpen(false);
                    item.onClick();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <item.icon className="w-4 h-4" aria-hidden="true" />
                  {item.label}
                </button>
              ))
            ) : (
              <>
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate("/auth");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate("/auth");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
