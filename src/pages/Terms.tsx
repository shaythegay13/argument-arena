import TermsContent from "@/components/legal/TermsContent";
import { LEGAL_LAST_UPDATED } from "@/components/legal/TermsContent";
import { useNavigate } from "@/lib/router-compat";
import { ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import SiteFooter from "@/components/SiteFooter";

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Terms & Conditions — Startup Jury AI</title>
        <meta name="description" content="Read the Startup Jury AI Terms & Conditions covering account use, AI-generated evaluations, and your rights as a user of the platform." />
        <link rel="canonical" href="https://www.startupjuryai.com/terms" />
        <meta property="og:title" content="Terms & Conditions — Startup Jury AI" />
        <meta property="og:description" content="The rules and responsibilities for using Startup Jury AI's evaluation platform." />
        <meta property="og:url" content="https://www.startupjuryai.com/terms" />
      </Helmet>
      <header className="border-b border-border px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="text-base sm:text-lg font-semibold text-foreground tracking-tight">Terms & Conditions</span>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 prose prose-invert prose-sm">
        <h1 className="text-2xl font-bold text-foreground">Terms and Conditions</h1>
        <p className="text-muted-foreground text-sm">Last updated: {LEGAL_LAST_UPDATED}</p>

        <TermsContent contactPath="/contact" onNavigate={navigate} />
      </main>

      <SiteFooter />
    </div>
  );
};

export default Terms;
