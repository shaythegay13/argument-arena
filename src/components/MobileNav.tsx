import { useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { useRouterState } from "@tanstack/react-router";
import { Menu, X, Zap, LayoutDashboard, LogOut, Crown, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface MobileNavProps {
  currentPage: "dashboard" | "debate";
  isPro?: boolean;
  onUpgradeClick?: () => void;
  onNewDebate?: () => void;
}

export default function MobileNav({ currentPage, isPro, onUpgradeClick, onNewDebate }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const navItems = [
    ...(currentPage !== "dashboard"
      ? [{ label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", onClick: () => navigate("/dashboard") }]
      : []),
    ...(currentPage !== "debate"
      ? [{ label: "New Debate", icon: Zap, path: "/debate", onClick: () => (onNewDebate ? onNewDebate() : navigate("/debate")) }]
      : []),
    { label: "Leaderboard", icon: Trophy, path: "/leaderboard", onClick: () => navigate("/leaderboard") },
    { label: "Sign Out", icon: LogOut, path: undefined, onClick: handleSignOut },
  ];

  const isActive = (path?: string) => Boolean(path && pathname === path);

  return (
    <>
      {/* Mobile hamburger — visible only on small screens */}
      <div className="flex items-center gap-2 md:hidden">
        {isPro ? (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/15 border border-primary/25 text-[10px] font-mono font-bold text-primary uppercase tracking-wider">
            <Crown className="w-3 h-3" aria-hidden="true" />
            Pro
          </span>
        ) : onUpgradeClick ? (
          <button
            onClick={onUpgradeClick}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-mono font-semibold text-primary hover:bg-primary/20 transition-colors"
          >
            <Zap className="w-3 h-3" aria-hidden="true" />
            Upgrade
          </button>
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="app-mobile-menu"
        >
          {open ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
        </Button>
      </div>

      {/* Desktop nav — hidden on mobile */}
      <nav aria-label="Main" className="hidden md:flex items-center gap-2">
        {isPro ? (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/25 text-xs font-mono font-bold text-primary uppercase tracking-wider mr-1">
            <Crown className="w-3.5 h-3.5" aria-hidden="true" />
            Pro
          </span>
        ) : onUpgradeClick ? (
          <button
            onClick={onUpgradeClick}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-mono font-semibold text-primary hover:bg-primary/20 transition-colors mr-1"
          >
            <Zap className="w-3.5 h-3.5" aria-hidden="true" />
            Upgrade
          </button>
        ) : null}
        {navItems.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            size="sm"
            onClick={item.onClick}
            aria-current={isActive(item.path) ? "page" : undefined}
            className={
              isActive(item.path)
                ? "text-foreground font-semibold bg-muted/50"
                : "text-muted-foreground hover:text-foreground"
            }
          >
            <item.icon className="w-4 h-4 mr-1.5" aria-hidden="true" />
            {item.label}
          </Button>
        ))}
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <nav
          id="app-mobile-menu"
          aria-label="Mobile"
          className="absolute top-full left-0 right-0 z-50 border-b border-border bg-card md:hidden"
        >
          <div className="px-4 py-2 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                aria-current={isActive(item.path) ? "page" : undefined}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive(item.path)
                    ? "text-foreground font-semibold bg-muted/40"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className="w-4 h-4" aria-hidden="true" />
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
