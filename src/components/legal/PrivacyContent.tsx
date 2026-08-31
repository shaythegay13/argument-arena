interface LegalContentProps {
  contactPath: string;
  onNavigate: (path: string) => void;
}

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-foreground text-base font-semibold">{children}</h2>
);

const PrivacyContent = ({ contactPath, onNavigate }: LegalContentProps) => (
  <section className="space-y-4 mt-8 text-muted-foreground text-sm leading-relaxed">
    <H>1. Information We Collect</H>
    <ul className="list-disc pl-5 space-y-2">
      <li><strong>Account data:</strong> email address, authentication identifiers, and — if you sign in with a third-party provider — the basic profile that provider returns.</li>
      <li><strong>Pitch and debate data:</strong> the ideas, descriptions, and answers you submit, plus generated rounds, host recaps, grades, verdicts, and audio recaps.</li>
      <li><strong>Panelist profiles:</strong> names, photos, credentials, focus areas, and links you enter when creating custom panelist profiles.</li>
      <li><strong>Billing data:</strong> plan status, credit balances, and charge records. Card details are handled by our payment processor and never reach our servers.</li>
      <li><strong>Usage and diagnostics:</strong> session history, feature events, share and leaderboard activity, and technical logs such as timestamps and error details.</li>
      <li><strong>Support messages:</strong> anything you send through the contact form.</li>
    </ul>

    <H>2. How We Use Your Information</H>
    <p>To run debates and generate evaluations, keep your session history and dashboards, meter and bill credits, operate the leaderboard and share links you enable, answer support requests, detect abuse and fraud, and improve the service using de-identified, aggregated data. We do not use your pitches to train our own foundation models.</p>

    <H>3. Panelist Profiles and Personal Data About Others</H>
    <p>If you enter information about a real person into a panelist profile, you are the controller of that data and confirm you have a lawful basis and that person's permission. Profiles are stored in your account, are visible to you (and to agents you authorize), and are used only as a character brief for generated fiction. We do not verify identities, do not contact the people described, and will remove any profile on a valid request from you or from the person described. Do not enter sensitive categories of personal data (health, religion, political views, government IDs) into a profile.</p>

    <H>4. Data Storage and Security</H>
    <p>Data is stored on managed cloud infrastructure with encryption in transit and at rest, row-level access rules that scope records to your account, and privileged operations restricted to server-side functions. Uploaded photos are stored in a dedicated file bucket. No system is perfectly secure; please avoid submitting information you cannot risk disclosing.</p>

    <H>5. Retention</H>
    <p>Account, session, and billing records are retained while your account is active and for as long as needed for legal, tax, and dispute purposes. Deleting a debate removes it from your account; publicly shared copies are removed when you unpublish or ask us to. Deleting your account removes your pitches, profiles, uploads, and session history, apart from records we must keep by law.</p>

    <H>6. Sharing and Processors</H>
    <p>We do not sell, trade, or rent personal information. We share the minimum necessary with service providers who process data on our behalf: our cloud database, authentication, storage and serverless hosting provider; AI model providers that generate debate content; a text-to-speech provider for audio recaps; and a payment processor for purchases and subscriptions. We may disclose data where required by law or to protect rights and safety.</p>

    <H>7. AI Providers</H>
    <p>Pitch text and panel context are sent to third-party AI models to generate responses, grades, and recaps. We send only the content needed for evaluation and do not send your account identity or email. Do not include secrets, credentials, or personal data about others in a pitch.</p>

    <H>8. Public Content</H>
    <p>Share permalinks, verdict images, and leaderboard entries are public by design once you enable them; they can be viewed by anyone with the link, previewed by social platforms, and indexed by search engines. Leaderboard votes are anonymous. Keep runs private if they contain confidential material.</p>

    <H>9. Cookies and Local Storage</H>
    <p>We use essential cookies and browser storage to keep you signed in, remember an in-progress debate so you can resume after a refresh, and deduplicate leaderboard votes. We do not run third-party advertising or cross-site tracking cookies.</p>

    <H>10. Connected Agents</H>
    <p>If you authorize an external AI agent or client, it can access the data covered by the scopes you approve, such as your debates, panelist profiles, and credit balance. You can revoke that access at any time, which stops future access.</p>

    <H>11. Your Rights</H>
    <p>Depending on where you live, you may request access, correction, deletion, a portable copy, or restriction of your personal data, and may object to certain processing. You can export debates from the app and delete your account from settings, or contact us and we will respond within the period required by applicable law. You can withdraw consent at any time by deleting the relevant content.</p>

    <H>12. International Transfers</H>
    <p>Our providers may process data in the United States and other countries. Where required, transfers rely on appropriate safeguards such as standard contractual clauses.</p>

    <H>13. Children's Privacy</H>
    <p>The service is not intended for anyone under 13, and we do not knowingly collect their personal information. If you believe a child has provided data, contact us and we will delete it.</p>

    <H>14. Changes to This Policy</H>
    <p>We may update this policy. Material changes will be posted here with a new revision date and, where required, notified in-app.</p>

    <H>15. Contact</H>
    <p>
      Questions about this Privacy Policy? Visit our{" "}
      <button onClick={() => onNavigate(contactPath)} className="text-primary hover:underline">Contact Us</button>{" "}
      page.
    </p>
  </section>
);

export default PrivacyContent;
