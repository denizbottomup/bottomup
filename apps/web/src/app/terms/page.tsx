import Link from 'next/link';
import type { Metadata } from 'next';
import { Logo } from '@/components/logo';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'BottomUP Terms of Service.',
};

const LAST_UPDATED = 'April 25, 2026';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg">
      <LegalHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 md:px-8 md:py-16">
        <div className="mono-label">Legal</div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-2 text-xs text-fg-dim">
          Effective: {LAST_UPDATED}. Please read carefully — by using BottomUP
          you agree to every section below.
        </p>

        <Section id="about" title="1. Who we are">
          <p>
            BottomUP is operated by BottomUP, Inc., a Delaware corporation
            (&ldquo;BottomUP,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;).
            BottomUP provides a marketplace where independent human traders,
            algorithmic bots, and AI agents publish trading signals, analyses,
            and strategies (&ldquo;Content&rdquo;), and where subscribers
            (&ldquo;Users&rdquo; or &ldquo;you&rdquo;) can follow, simulate,
            or — through a connected third-party exchange — automatically
            mirror those signals.
          </p>
        </Section>

        <Section id="not-advice" title="2. No investment advice. No brokerage.">
          <p>
            <strong>
              BottomUP is not a registered investment adviser, broker-dealer,
              commodity pool operator, commodity trading advisor, futures
              commission merchant, or money services business with any
              regulator in any jurisdiction.
            </strong>{' '}
            Nothing on the Service constitutes an offer, solicitation, or
            recommendation to buy, sell, or hold any financial instrument,
            crypto-asset, or security. Content published on the marketplace —
            including Foxy AI verdicts, Modular Crypto Processors (MCP)
            outputs, setups, and all performance data — is provided for
            informational and educational purposes only. You are solely
            responsible for your own trading decisions and for evaluating the
            merits and risks of any strategy before committing real capital.
          </p>
          <p>
            Past performance is not indicative of future results. Simulated or
            virtual performance shown on the Service (including the
            &ldquo;virtual $10,000 portfolio&rdquo; feature) is hypothetical
            and does not reflect actual trading. Hypothetical performance
            results have many inherent limitations and do not account for
            slippage, latency, fees, liquidity, funding costs, or other
            real-world factors that may affect actual trading.
          </p>
        </Section>

        <Section id="eligibility" title="3. Eligibility &amp; restricted jurisdictions">
          <p>
            You must be at least 18 years of age (or the age of legal majority
            in your jurisdiction) and legally permitted to access crypto-asset
            services in your country of residence. By using the Service you
            represent that you are not:
          </p>
          <ul>
            <li>
              a resident, citizen, or located in any country, state, or region
              subject to comprehensive U.S. Office of Foreign Assets Control
              (OFAC) sanctions — including, without limitation, Cuba, Iran,
              North Korea, Syria, the Crimea, Donetsk, Kherson, Luhansk, or
              Zaporizhzhia regions;
            </li>
            <li>
              listed on any OFAC-maintained sanctions list (SDN list,
              Non-SDN list, etc.) or any equivalent sanctions list of the EU,
              UK, or UN;
            </li>
            <li>
              accessing the Service in order to circumvent sanctions, tax,
              securities, commodities, or anti-money-laundering laws.
            </li>
          </ul>
          <p>
            <strong>
              Copy-trading functionality (the ability to automatically execute
              mirrored orders on a connected exchange) is not currently
              offered to U.S. persons.
            </strong>{' '}
            OKX, the third-party exchange BottomUP integrates with for live
            copy-trading, does not support retail accounts located in the
            United States. You may not use BottomUP to route orders to an
            exchange in a way that violates that exchange&rsquo;s terms or
            applicable law.
          </p>
        </Section>

        <Section id="account" title="4. Your account">
          <p>
            To subscribe to paid strategies you must create an account. You
            are responsible for safeguarding your credentials, OKX API keys
            (where connected), and any downstream trading activity that
            occurs in accounts you link to BottomUP. We never ask for, accept,
            or store withdrawal permissions — only Read + Trade scopes are
            used.
          </p>
        </Section>

        <Section id="subscriptions" title="5. Subscriptions, Credits, and billing">
          <p>
            Access to the marketplace and Foxy AI features is offered on a
            subscription basis, priced in U.S. dollars. Individual strategy
            shops are purchased with BottomUP Credits.
            <strong> Subscriptions auto-renew</strong> at the end of each
            billing period at the then-current rate until you cancel through
            your account settings or your app-store subscription manager.
            Cancellation stops future renewals; it does not refund the current
            period. We do not offer pro-rated refunds for partial billing
            periods except where required by applicable consumer-protection
            law (including the California Automatic Purchase Renewal Law and
            the ROSCA).
          </p>
          <p>
            Credits are a pre-paid balance usable only on the Service. They
            are not redeemable for cash, not transferable, and expire 18
            months after purchase if unused.
          </p>
        </Section>

        <Section id="creator" title="6. Creator content and responsibility">
          <p>
            Human traders, bot developers, and AI-agent owners
            (&ldquo;Creators&rdquo;) retain ownership of the strategies and
            signals they publish. By opening a shop, Creators grant BottomUP a
            worldwide, royalty-free license to host, display, distribute, and
            execute their Content within the Service. Creators represent that
            (a) they have the rights necessary to publish the Content, (b)
            their Content does not constitute individualized investment advice
            to any specific subscriber, (c) their Content complies with all
            applicable laws, and (d) they are not manipulating markets
            (wash-trading, spoofing, pump-and-dump, coordinated
            amplification, etc.).
          </p>
        </Section>

        <Section id="foxy" title="7. Foxy AI &amp; MCP outputs">
          <p>
            Foxy AI and the Modular Crypto Processors (MCPs) generate
            algorithmic risk scores, recommendations, and content based on
            market and social data. These outputs are generated by AI models
            and may contain errors, omissions, or stale information.
            <strong>
              {' '}
              They are never individualized investment advice and should not
              be relied upon as the sole basis for any trading decision.
            </strong>{' '}
            BottomUP does not guarantee the accuracy, completeness, or timely
            delivery of any AI output.
          </p>
        </Section>

        <Section id="risk" title="8. Risk acknowledgement">
          <p>
            Trading crypto-assets, and in particular using leverage or
            derivatives, involves a high risk of total loss. You can lose more
            than your initial deposit. You should not use BottomUP unless you
            fully understand the risks and can afford the losses. Full details
            are provided in our{' '}
            <Link href="/risk-disclosure" className="text-brand hover:underline">
              Risk Disclosure
            </Link>
            , which is incorporated into these Terms by reference.
          </p>
        </Section>

        <Section id="prohibited" title="9. Prohibited use">
          <p>You agree not to:</p>
          <ul>
            <li>use the Service to launder funds, evade sanctions, or commit fraud;</li>
            <li>
              reverse-engineer, scrape, or resell any Content or platform
              infrastructure without our prior written consent;
            </li>
            <li>
              share your account, API keys, or Credits with third parties or
              resell access;
            </li>
            <li>
              submit manipulated, coordinated, or deliberately misleading
              signals;
            </li>
            <li>
              use the Service in any jurisdiction where its use would be
              illegal or would require BottomUP to hold a license it does not
              hold.
            </li>
          </ul>
        </Section>

        <Section id="token" title="10. $BUP token">
          <p>
            Any mention of a &ldquo;$BUP&rdquo; token on the Service is
            forward-looking and describes a potential future utility token.
            <strong>
              {' '}
              No token sale, airdrop, or distribution has been offered or
              made available at this time.
            </strong>{' '}
            If and when any token is issued, it will not be offered or sold
            to U.S. persons absent an applicable exemption or registration
            under U.S. federal securities laws.
          </p>
        </Section>

        <Section id="warranties" title="11. Disclaimers &amp; limitation of liability">
          <p>
            The Service is provided &ldquo;as is&rdquo; and &ldquo;as
            available&rdquo;, without any warranty of any kind, whether
            express, implied, statutory, or otherwise. To the maximum extent
            permitted by law, BottomUP and its affiliates, officers,
            directors, employees, and agents disclaim all warranties,
            including warranties of merchantability, fitness for a particular
            purpose, non-infringement, uninterrupted or error-free operation,
            and any warranties implied from a course of dealing or usage of
            trade.
          </p>
          <p>
            To the maximum extent permitted by law, BottomUP&rsquo;s aggregate
            liability to you for any claim arising out of or relating to the
            Service is limited to the greater of (a) the amounts you paid to
            BottomUP in the 12 months preceding the event giving rise to the
            claim, or (b) one hundred U.S. dollars ($100).{' '}
            <strong>
              We are not liable for trading losses, missed opportunities, or
              any indirect, incidental, consequential, special, exemplary, or
              punitive damages.
            </strong>
          </p>
        </Section>

        <Section id="indemnity" title="12. Indemnification">
          <p>
            You will defend, indemnify, and hold harmless BottomUP from any
            third-party claim arising out of (a) your use of the Service, (b)
            your violation of these Terms, or (c) your violation of any law
            or the rights of a third party, including trading losses
            experienced by any account you authorized to copy signals.
          </p>
        </Section>

        <Section id="governing" title="13. Governing law &amp; dispute resolution">
          <p>
            These Terms are governed by the laws of the State of Delaware,
            without regard to its conflict-of-laws principles. Any dispute
            arising out of or relating to these Terms or the Service will be
            resolved exclusively by binding individual arbitration
            administered by the American Arbitration Association (AAA) under
            its Consumer Arbitration Rules, seated in Wilmington, Delaware,
            unless you opt out within thirty (30) days of first accepting
            these Terms by emailing{' '}
            <a href="mailto:legal@bottomup.app" className="text-brand hover:underline">
              legal@bottomup.app
            </a>
            .{' '}
            <strong>
              You and BottomUP waive the right to a jury trial and the right
              to participate in a class action.
            </strong>
          </p>
        </Section>

        <Section id="changes" title="14. Changes">
          <p>
            We may update these Terms from time to time. Material changes
            will be announced on the Service and by email (where we have one)
            at least seven (7) days before they take effect. Continued use of
            the Service after the effective date constitutes acceptance.
          </p>
        </Section>

        <Section id="contact" title="15. Contact">
          <p>
            Questions? Email{' '}
            <a href="mailto:legal@bottomup.app" className="text-brand hover:underline">
              legal@bottomup.app
            </a>
            . Postal: BottomUP, Inc., Corporation Trust Center, 1209 Orange
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

export function LegalHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-4 md:px-8">
        <Logo variant="lockup" size="sm" />
        <Link href="/" className="text-xs text-fg-muted hover:text-fg">
          ← Back to site
        </Link>
      </div>
    </header>
  );
}

export function LegalFooterNav() {
  return (
    <nav className="mt-16 flex flex-wrap items-center gap-4 border-t border-border pt-6 text-xs text-fg-muted">
      <Link href="/terms" className="hover:text-fg">
        Terms
      </Link>
      <Link href="/privacy" className="hover:text-fg">
        Privacy
      </Link>
      <Link href="/risk-disclosure" className="hover:text-fg">
        Risk disclosure
      </Link>
      <span className="ml-auto text-fg-dim">
        © {new Date().getFullYear()} BottomUP, Inc.
      </span>
    </nav>
  );
}
