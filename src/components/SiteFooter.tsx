import { Link } from "@tanstack/react-router";

/**
 * Shared footer shown on every page, signed in or out.
 * All three destinations are public routes so they render for any visitor.
 */
export default function SiteFooter() {
  const linkClass = "hover:text-foreground underline underline-offset-2 transition-colors";

  return (
    <footer className="border-t border-border px-4 sm:px-6 py-6 mt-auto">
      <nav
        aria-label="Legal and support"
        className="max-w-[1200px] mx-auto flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground"
      >
        <Link to="/contact" className={linkClass} activeProps={{ className: "text-foreground" }}>
          Contact Us
        </Link>
        <span aria-hidden="true">·</span>
        <Link to="/terms" className={linkClass} activeProps={{ className: "text-foreground" }}>
          Terms &amp; Conditions
        </Link>
        <span aria-hidden="true">·</span>
        <Link to="/privacy" className={linkClass} activeProps={{ className: "text-foreground" }}>
          Privacy Policy
        </Link>
      </nav>
    </footer>
  );
}
