import { useNavigate } from "@/lib/router-compat";

/**
 * Shared footer shown on every page, signed in or out.
 * Contact routes to the in-app contact page (redirects to auth when signed out).
 */
export default function SiteFooter() {
  const navigate = useNavigate();

  return (
    <footer className="border-t border-border px-4 sm:px-6 py-6 mt-auto">
      <div className="max-w-[1200px] mx-auto flex items-center justify-center gap-3 text-xs text-muted-foreground">
        <button onClick={() => navigate("/app/contact")} className="hover:text-foreground underline underline-offset-2 transition-colors">
          Contact Us
        </button>
        <span>·</span>
        <button onClick={() => navigate("/terms")} className="hover:text-foreground underline underline-offset-2 transition-colors">
          Terms & Conditions
        </button>
        <span>·</span>
        <button onClick={() => navigate("/privacy")} className="hover:text-foreground underline underline-offset-2 transition-colors">
          Privacy Policy
        </button>
      </div>
    </footer>
  );
}
