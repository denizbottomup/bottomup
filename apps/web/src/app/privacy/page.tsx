import Link from 'next/link';
import type { Metadata } from 'next';
import { LegalFooterNav, LegalHeader } from '@/app/terms/page';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'BottomUP Privacy Policy.',
};

const LAST_UPDATED = 'April 25, 2026';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg">
      <LegalHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 md:px-8 md:py-16">
        <div className="mono-label">Legal</div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-xs text-fg-dim">Effective: {LAST_UPDATED}</p>

        <Section id="who" title="1. Who is the controller">
          <p>
            BottomUP, Inc., a Delaware corporation (&ldquo;BottomUP&rdquo;),
            is the controller of personal data collected through{' '}
            <a href="https://bupcore.ai" className="text-brand hover:underline">
              bupcore.ai
            </a>{' '}
            and the BottomUP mobile apps (together, the &ldquo;Service&rdquo;).
          </p>
        </Section>

        <Section id="what" title="2. What we collect">
          <ul>
            <li>
              <strong>Account data</strong> — email, phone number, name,
              avatar, provider ID (Google, Apple, phone), and anything you
              add to your profile.
            </li>
            <li>
              <strong>Trading data</strong> — setups you clap or watchlist,
              trades executed through a connected exchange API, subscription
              and Credits activity. For connected OKX accounts we store the
              API key, secret, and passphrase encrypted at rest, plus your
              exchange UID.
            </li>
            <li>
              <strong>Device &amp; usage data</strong> — IP address, user
              agent, country/region (derived from IP), page views, feature
              interactions, approximate load times. Used for analytics and
              security.
            </li>
            <li>
              <strong>Cookies &amp; similar</strong> — essential cookies
              (session), preference cookies (theme, language), and analytics
              tags. See §7 below.
            </li>
            <li>
              <strong>Communications</strong> — messages you post in
              community channels and support tickets.
            </li>
          </ul>
          <p>
            We do not knowingly collect personal data from children under 16.
            If you believe a child has provided us data, contact{' '}
            <a href="mailto:privacy@bottomup.app" className="text-brand hover:underline">
              privacy@bottomup.app
            </a>
            .
          </p>
        </Section>

        <Section id="why" title="3. Why we process it">
          <ul>
            <li>To provide the Service you requested (contract).</li>
            <li>
              To prevent fraud, sanctions breaches, and market manipulation
              (legitimate interests / legal obligation).
            </li>
            <li>
              To show you relevant signals and creators (legitimate
              interests).
            </li>
            <li>To bill subscriptions and Credits (contract).</li>
            <li>
              To send transactional and (with consent) marketing email or
              push notifications.
            </li>
            <li>
              To comply with tax, audit, and record-keeping obligations
              (legal obligation).
            </li>
          </ul>
        </Section>

        <Section id="share" title="4. Who we share with">
          <ul>
            <li>
              <strong>Infrastructure providers</strong> — Railway (hosting),
              Postgres/Redis on Railway, Firebase (auth, messaging,
              Firestore), Cloudflare (DNS/edge). Each is bound by a data
              processing agreement.
            </li>
            <li>
              <strong>Analytics</strong> — Google Tag Manager / Google
              Analytics 4 for aggregated usage statistics. You can opt out
              with a GPC signal or cookie banner.
            </li>
            <li>
              <strong>AI provider</strong> — Anthropic (Claude) processes
              anonymised setup metadata for Foxy AI verdicts. No personal
              identifiers are sent.
            </li>
            <li>
              <strong>Third-party exchange</strong> — OKX. If you connect an
              OKX account, we send API requests on your behalf for reading
              balances and placing orders.
            </li>
            <li>
              <strong>Law enforcement</strong> — when compelled by a valid
              legal process, limited to what is required.
            </li>
          </ul>
          <p>
            <strong>We never sell personal data.</strong> We never share your
            OKX credentials with any third party, including AI providers.
          </p>
        </Section>

        <Section id="where" title="5. Where we store data">
          <p>
            Primary storage is in Railway&rsquo;s Europe-West region; some
            Firebase data resides in the United States (europe-west1 and
            us-central1). By using the Service from outside these regions you
            consent to the transfer and processing of your data in those
            locations. Transfers from the EEA / UK rely on the European
            Commission&rsquo;s Standard Contractual Clauses.
          </p>
        </Section>

        <Section id="retention" title="6. How long we keep it">
          <ul>
            <li>Account data: until you delete your account, plus 30 days.</li>
            <li>
              Trading &amp; billing data: 7 years to meet tax and
              record-keeping requirements.
            </li>
            <li>Community messages: until you delete them or close the account.</li>
            <li>Security &amp; fraud logs: up to 24 months.</li>
          </ul>
        </Section>

        <Section id="cookies" title="7. Cookies &amp; tracking">
          <p>
            We use strictly necessary cookies for authentication and security;
            functional cookies for your preferences; and analytics cookies
            (via Google Tag Manager) to understand aggregate usage.
            You can disable non-essential cookies at any time using the
            cookie banner or your browser controls. We honour the Global
            Privacy Control (GPC) signal as a request to opt out of sale /
            sharing under the California Consumer Privacy Act (CCPA).
          </p>
        </Section>

        <Section id="rights" title="8. Your rights">
          <p>
            Depending on where you live, you may have the right to:
          </p>
          <ul>
            <li>access, correct, delete, or port your personal data;</li>
            <li>object to or restrict certain processing;</li>
            <li>withdraw consent at any time for consent-based processing;</li>
            <li>
              (California residents) know what categories of data we
              collected, to whom we disclosed it, and to opt out of &ldquo;sale&rdquo;
              or &ldquo;sharing&rdquo; — we do not sell, and you can opt out of
              analytics-based sharing via the cookie banner or a GPC signal;
            </li>
            <li>
              (EEA / UK) lodge a complaint with your local supervisory
              authority.
            </li>
          </ul>
          <p>
            To exercise any right, email{' '}
            <a href="mailto:privacy@bottomup.app" className="text-brand hover:underline">
              privacy@bottomup.app
            </a>
            . We respond within the deadlines required by GDPR (30 days) and
            CCPA (45 days).
          </p>
        </Section>

        <Section id="security" title="9. Security">
          <p>
            Access to production systems is restricted, logged, and secured
            with MFA. All traffic is TLS-encrypted. OKX credentials are
            stored encrypted at rest. No system is perfectly secure; if we
            learn of a breach affecting you, we will notify you without
            undue delay as required by law.
          </p>
        </Section>

        <Section id="changes" title="10. Changes">
          <p>
            We may update this Policy. Material changes will be announced on
            the Service and by email. The effective date will be updated at
            the top of this page.
          </p>
        </Section>

        <Section id="contact" title="11. Contact">
          <p>
            Privacy inquiries:{' '}
            <a href="mailto:privacy@bottomup.app" className="text-brand hover:underline">
              privacy@bottomup.app
            </a>
            .<br />
            Postal: BottomUP, Inc., Corporation Trust Center, 1209 Orange
            Street, Wilmington, Delaware 19801, USA.
          </p>
        </Section>

        <LegalFooterNav />
      </main>
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-10">
      <h2 className="text-xl font-bold tracking-tight text-fg md:text-2xl">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-fg-muted [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_strong]:text-fg">
        {children}
      </div>
    </section>
  );
}
