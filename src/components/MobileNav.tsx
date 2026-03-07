import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, Zap, LayoutDashboard, Mail, LogOut, Crown } from "lucide-react";
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const navItems = [
    ...(currentPage !== "dashboard"
      ? [{ label: "Dashboard", icon: LayoutDashboard, onClick: () => navigate("/dashboard") }]
      : []),
    ...(currentPage !== "debate"
      ? [{ label: "New Debate", icon: Zap, onClick: () => (onNewDebate ? onNewDebate() : navigate("/debate")) }]
      : []),
    { label: "Contact Us", icon: Mail, onClick: () => navigate("/app/contact") },
    { label: "Sign Out", icon: LogOut, onClick: handleSignOut },
  ];

  return (
    <>
      {/* Mobile hamburger — visible only on small screens */}
      <div className="flex items-center gap-2 md:hidden">
        {isPro ? (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/15 border border-primary/25 text-[10px] font-mono font-bold text-primary uppercase tracking-wider">
            <Crown className="w-3 h-3" />
            Pro
          </span>
        ) : onUpgradeClick ? (
          <button
            onClick={onUpgradeClick}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-mono font-semibold text-primary hover:bg-primary/20 transition-colors"
          >
            <Zap className="w-3 h-3" />
            Upgrade
          </button>
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Desktop nav — hidden on mobile */}
      <div className="hidden md:flex items-center gap-2">
        {isPro ? (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/25 text-xs font-mono font-bold text-primary uppercase tracking-wider mr-1">
            <Crown className="w-3.5 h-3.5" />
            Pro
          </span>
        ) : onUpgradeClick ? (
          <button
            onClick={onUpgradeClick}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-mono font-semibold text-primary hover:bg-primary/20 transition-colors mr-1"
          >
            <Zap className="w-3.5 h-3.5" />
            Upgrade
          </button>
        ) : null}
        {navItems.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            size="sm"
            onClick={item.onClick}
            className="text-muted-foreground"
          >
            <item.icon className="w-4 h-4 mr-1.5" />
            {item.label}
          </Button>
        ))}
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 border-b border-border bg-card md:hidden">
          <div className="px-4 py-2 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
