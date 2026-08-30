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
        <p className="text-muted-foreground text-sm">Last updated: February 22, 2026</p>

        <section className="space-y-4 mt-8 text-muted-foreground text-sm leading-relaxed">
          <h2 className="text-foreground text-base font-semibold">1. Information We Collect</h2>
          <p>We collect information you provide directly, including your email address when you create an account, and the startup ideas and topics you submit for evaluation. We also collect usage data such as session history, debate interactions, and scoring results.</p>

          <h2 className="text-foreground text-base font-semibold">2. How We Use Your Information</h2>
          <p>We use your information to provide and improve the Startup Jury AI service, including generating AI-powered evaluations, maintaining your session history, and personalizing your experience. We may also use aggregated, anonymized data for research and service improvement.</p>

          <h2 className="text-foreground text-base font-semibold">3. Data Storage and Security</h2>
          <p>Your data is stored securely using industry-standard encryption and security practices. We retain your account data and session history for as long as your account is active. You may request deletion of your data at any time by contacting us.</p>

          <h2 className="text-foreground text-base font-semibold">4. Information Sharing</h2>
          <p>We do not sell, trade, or rent your personal information to third parties. We may share anonymized, aggregated data for analytical purposes. We may disclose information if required by law or to protect our rights and safety.</p>

          <h2 className="text-foreground text-base font-semibold">5. Cookies and Tracking</h2>
          <p>We use essential cookies to maintain your authentication session. We do not use third-party tracking or advertising cookies. You can manage cookie preferences through your browser settings.</p>

          <h2 className="text-foreground text-base font-semibold">6. Third-Party Services</h2>
          <p>We use third-party AI models to generate debate responses and evaluations. The content you submit may be processed by these services. We do not share your personal identity with AI providers — only the content necessary for evaluation.</p>

          <h2 className="text-foreground text-base font-semibold">7. Your Rights</h2>
          <p>You have the right to access, correct, or delete your personal data. You may export your session history or request complete account deletion. To exercise these rights, please contact us through the application.</p>

          <h2 className="text-foreground text-base font-semibold">8. Children's Privacy</h2>
          <p>Startup Jury AI is not intended for use by individuals under the age of 13. We do not knowingly collect personal information from children.</p>

          <h2 className="text-foreground text-base font-semibold">9. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page with an updated revision date.</p>

          <h2 className="text-foreground text-base font-semibold">10. Contact</h2>
          <p>If you have questions about this Privacy Policy, please visit our <button onClick={() => navigate("/app/contact")} className="text-primary hover:underline">Contact Us</button> page.</p>
        </section>
      </main>
    </div>
  );
};

export default PrivacyPolicyAuthenticated;
