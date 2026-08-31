import PrivacyContent from "@/components/legal/PrivacyContent";
import { LEGAL_LAST_UPDATED } from "@/components/legal/TermsContent";
import { useNavigate } from "@/lib/router-compat";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const PrivacyPolicyAuthenticated = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="text-base sm:text-lg font-semibold text-foreground tracking-tight">Privacy Policy</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 prose prose-invert prose-sm">
        <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm">Last updated: {LEGAL_LAST_UPDATED}</p>

        <PrivacyContent contactPath="/app/contact" onNavigate={navigate} />
      </main>
    </div>
  );
};

export default PrivacyPolicyAuthenticated;
