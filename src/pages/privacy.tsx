import Head from "next/head";
import Layout from "../components/Layout";

const lastUpdated = "August 20, 2026";

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy | 2Settle</title>
        <meta
          name="description"
          content="How 2Settle collects, uses, stores, and protects your personal data."
        />
      </Head>
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-10">
            Last updated: {lastUpdated}
          </p>

          <section className="mb-8">
            <p>
              This Privacy Policy explains how 2Settle (&quot;2Settle&quot;,
              &quot;we&quot;, &quot;us&quot;) collects, uses, discloses, and
              protects personal data when you use our service to send,
              receive, and spend crypto with instant fiat conversion. It
              applies to our web app, Telegram integration, and API-based
              integrations with partners.
            </p>
            <p className="mt-3 text-sm text-gray-500">
              2Settle is operated by 2SettleHQ, the data controller for the
              purposes of this policy, registered at Plot 690, Idris Gadoda
              Street, Wuye, Abuja.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">
              1. Data We Collect
            </h2>
            <p className="mb-2">
              We collect the following categories of personal data:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Identity &amp; contact data:</strong> email address
                or phone number (used for one-time-code login), name
                associated with a bank account when receiving a payout,
                Telegram account details if you use our Telegram
                integration.
              </li>
              <li>
                <strong>Financial &amp; transaction data:</strong> fiat
                amounts and currency, crypto amounts and network, deposit
                addresses, exchange rates, receiver bank name, account
                number, and account name, and transaction status/history.
              </li>
              <li>
                <strong>Wallet data:</strong> your crypto wallet address, if
                you sign in or transact using a connected wallet.
              </li>
              <li>
                <strong>Technical data:</strong> IP address, device/browser
                information, and request metadata, collected automatically
                as part of our security and audit logging.
              </li>
            </ul>
            <p className="mt-3">
              We do not collect or store card payment data (e.g. card
              number, CVV); card payments are not supported on this
              platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">
              2. How We Use Your Data
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To process and settle your transfers, gifts, payment requests, and payouts</li>
              <li>To authenticate you (one-time codes, wallet-signature login, Google Sign-In) without ever storing a password</li>
              <li>To detect and prevent fraud, and to secure our platform (rate limiting, audit logging, deposit monitoring)</li>
              <li>To communicate with you about your transactions or account</li>
              <li>To comply with legal, regulatory, and financial recordkeeping obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">
              3. Legal Basis for Processing
            </h2>
            <p>
              We process your data on the basis of: performance of a
              contract (processing the transaction you requested),
              compliance with a legal obligation (financial recordkeeping),
              and legitimate interest (fraud prevention and platform
              security). Where required, we rely on your consent, for
              example when linking an additional login method to your
              account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">
              4. Who We Share Data With
            </h2>
            <p className="mb-2">We share data only where necessary to complete your transaction or run the service:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Settlement and payout partners, to complete a bank transfer on your behalf</li>
              <li>Blockchain networks, inherently public once a transaction is broadcast on-chain</li>
              <li>Service providers who support our infrastructure (hosting, exchange-rate data)</li>
            </ul>
            <p className="mt-3">
              We do not sell your personal data. Any partner receiving data
              on our behalf is required to protect it to a standard
              consistent with this policy, transmitted only over encrypted
              connections and never shared beyond what is needed to
              complete your request.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">
              5. How We Protect Your Data
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Sensitive credentials (API secrets, one-time codes, session tokens) are never stored in plaintext, only as cryptographic hashes</li>
              <li>Wallet key material is encrypted at rest and only decrypted in memory when needed</li>
              <li>All data in transit is protected with TLS encryption</li>
              <li>Access to production systems and data is limited, logged, and reviewed regularly</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">
              6. How Long We Keep Your Data
            </h2>
            <p>
              Financial and transaction records are retained for a minimum
              of 5 years, consistent with standard financial recordkeeping
              expectations for payment businesses. Technical security logs
              are retained for 12 months on a rolling basis. Data is
              deleted or anonymized once it is no longer needed for these
              purposes, unless a longer period is required by law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">
              7. Your Rights
            </h2>
            <p className="mb-2">
              Subject to applicable law (including the Nigeria Data
              Protection Act/NDPR, and GDPR where it applies to you), you
              have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Request access to the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data, where we are not required to retain it for legal or financial recordkeeping reasons</li>
              <li>Withdraw consent, where processing is based on consent</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:compliance@2settle.io" className="underline">
                compliance@2settle.io
              </a>
              . We will respond within the timeframe required by applicable
              law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">
              8. Children&apos;s Privacy
            </h2>
            <p>
              Our service is not directed to individuals under the age of
              18, and we do not knowingly collect personal data from
              minors.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">
              9. Changes to This Policy
            </h2>
            <p>
              We may update this policy as our service evolves. Material
              changes will be reflected by updating the &quot;Last
              updated&quot; date above.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or how your
              data is handled, contact us at{" "}
              <a href="mailto:compliance@2settle.io" className="underline">
                compliance@2settle.io
              </a>
              .
            </p>
          </section>
        </div>
      </Layout>
    </>
  );
}
