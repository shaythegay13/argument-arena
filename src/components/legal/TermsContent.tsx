interface LegalContentProps {
  contactPath: string;
  onNavigate: (path: string) => void;
}

export const LEGAL_LAST_UPDATED = "August 31, 2026";

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-foreground text-base font-semibold">{children}</h2>
);

const TermsContent = ({ contactPath, onNavigate }: LegalContentProps) => (
  <section className="space-y-4 mt-8 text-muted-foreground text-sm leading-relaxed">
    <H>1. Acceptance of Terms</H>
    <p>By accessing or using Startup Jury AI, you agree to be bound by these Terms and Conditions. If you do not agree, you may not use the service. You must be at least 13 years old (and old enough to form a binding contract where you live) to hold an account.</p>

    <H>2. Description of Service</H>
    <p>Startup Jury AI evaluates startup pitches through simulated expert panel debates. A debate runs across multiple rounds in which AI personas question your pitch, followed by a host recap, panel grades, and a final verdict. The service may also generate audio recaps, shareable verdict images, exports (JSON, Markdown, PDF), and leaderboard entries.</p>
    <p>Everything the panel produces is AI-generated simulation. It is not investment, legal, financial, tax, or professional business advice, and no persona on the panel is a real advisor, investor, or fiduciary acting on your behalf.</p>

    <H>3. AI Personas and the Panelist Profile Library</H>
    <p>The default jury is a set of fictional AI archetypes authored by us. On Pro and Studio plans you may additionally create <strong>panelist profiles</strong> — records containing a name, photo, credentials, focus areas, and links — that the AI uses as a character brief in place of a default archetype.</p>
    <p>These profiles are <strong>fictional or composite investor characters</strong>. They are not the real people they may resemble, are not endorsed by, affiliated with, or reviewed by any real person, and their statements are machine-generated fiction. You agree that:</p>
    <ul className="list-disc pl-5 space-y-2">
      <li>You are solely responsible for every profile you create and for all content you upload with it, including photos and biographical text.</li>
      <li>You will only model a profile on a real, identifiable person if you have that person's permission, and you will not use a profile to imply their endorsement, participation, or investment interest.</li>
      <li>You will not upload images, logos, trademarks, or copyrighted text you do not have the right to use.</li>
      <li>You will not use profiles to impersonate anyone, to defame or harass anyone, or to mislead investors, customers, employees, or the public — including by presenting generated output as a real person's opinion.</li>
      <li>You will not publish, share, or export generated output in a way that presents it as a statement by a real individual or firm.</li>
    </ul>
    <p>We may remove any profile, photo, or generated content and may suspend accounts that we believe violate this section, with or without notice. You agree to indemnify and hold us harmless from claims arising out of profiles you create — including claims of defamation, false endorsement, right of publicity or personality, privacy, or intellectual property infringement.</p>

    <H>4. User Accounts</H>
    <p>You are responsible for the confidentiality of your credentials, whether you sign in with email and password or a supported third-party sign-in provider. You agree to provide accurate registration information and to notify us promptly of unauthorized account use. You are responsible for all activity under your account, including activity by connected AI agents.</p>

    <H>5. Credits, Plans, and Payments</H>
    <p>Debates are metered in evaluation credits. New accounts receive a limited number of free credits; additional credits, subscription plans (Pro and Studio), and add-ons such as custom panelist slots are sold through our payment processor. Prices are shown before purchase.</p>
    <p>One complete debate consumes one evaluation credit; retries and continued rounds inside the same session are not charged again. Credits are consumed when compute is performed, have no cash value, are non-transferable, and are generally non-refundable except where required by law or where we fail to deliver a paid evaluation. Subscriptions renew automatically until cancelled and cancellation takes effect at the end of the current billing period. We may change pricing prospectively.</p>

    <H>6. Acceptable Use</H>
    <p>You agree not to submit content that is unlawful, infringing, deceptive, harassing, hateful, sexually exploitative, or that contains other people's confidential or personal information without a lawful basis. You may not attempt to reverse engineer, scrape at scale, resell access to, overload, or circumvent metering, authentication, or rate limits of the service, and you may not use the output to train competing models.</p>

    <H>7. Your Content and Our Content</H>
    <p>You retain ownership of the pitches, documents, and profile text you submit. You grant us a limited licence to host, process, transmit, and display that content for the purpose of operating the service, and to use de-identified, aggregated data to improve it. You own the AI output generated for your pitch and may use it commercially, subject to these Terms; AI output is not unique and similar output may be generated for others. We retain all rights in the platform, personas, prompts, branding, and software.</p>

    <H>8. Public Sharing and Leaderboard</H>
    <p>Permalinks, verdict images, and leaderboard entries are optional. When you copy a share link or publish a run, the selected pitch summary, scores, and verdict become publicly viewable and may be indexed by search engines or previewed by social platforms. You can request removal by contacting us. Do not share a run that contains confidential information.</p>

    <H>9. Agent and API Access</H>
    <p>If you connect an external AI agent or client to your account, you authorize it to read and create data on your behalf within the scopes you approve, including listing debates, reading debates, and creating panelist profiles. Actions taken by a connected agent are treated as your actions, including credit consumption. You may revoke access at any time.</p>

    <H>10. Disclaimer of Warranties</H>
    <p>The service is provided "as is" and "as available" without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, non-infringement, and accuracy. AI output may be wrong, biased, outdated, or fabricated and must not be your sole basis for any decision.</p>

    <H>11. Limitation of Liability</H>
    <p>To the maximum extent permitted by law, we are not liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, lost funding, lost data, or business interruption. Our total aggregate liability for any claim is limited to the greater of the amount you paid us in the twelve months before the claim or USD 100.</p>

    <H>12. Termination</H>
    <p>You may stop using the service and delete your account at any time. We may suspend or terminate access for breach of these Terms, suspected fraud or chargeback abuse, or legal requirement. Unused credits are forfeited on termination for breach.</p>

    <H>13. Modifications</H>
    <p>We may modify these Terms. Material changes will be reflected in the "last updated" date on this page and, where required, notified in-app. Continued use after changes constitutes acceptance.</p>

    <H>14. Governing Law</H>
    <p>These Terms are governed by the laws of the State of New York, United States, without regard to conflict-of-law rules. The courts located in New York shall have exclusive jurisdiction, except where mandatory local consumer law provides otherwise.</p>

    <H>15. Contact</H>
    <p>
      Questions about these Terms? Visit our{" "}
      <button onClick={() => onNavigate(contactPath)} className="text-primary hover:underline">Contact Us</button>{" "}
      page.
    </p>
  </section>
);

export default TermsContent;
