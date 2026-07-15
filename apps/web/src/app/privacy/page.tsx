import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy | Poltica Systems",
  description:
    "Privacy Policy of the Poltica Systems SaaS platform operated by octaleads Private Limited, aligned with the Digital Personal Data Protection Act, 2023.",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      subtitle="How octaleads Private Limited handles personal data on the Poltica Systems platform."
      lastUpdated="13 July 2026"
    >
      <h2>1. Introduction</h2>
      <p>
        This Privacy Policy explains how <strong>octaleads Private Limited</strong> (“Company”,
        “we”, “us”), operator of the “Poltica Systems” platform (the “Platform”), collects, uses,
        stores, discloses and protects personal data. It is published in accordance with the
        Information Technology Act, 2000, the Information Technology (Reasonable Security Practices
        and Procedures and Sensitive Personal Data or Information) Rules, 2011, and the Digital
        Personal Data Protection Act, 2023 (“DPDP Act”). By using the Platform, you consent to the
        practices described here.
      </p>

      <h2>2. Two distinct data roles — please read carefully</h2>
      <p>
        The Platform involves two very different categories of data, with different responsibilities:
      </p>
      <ul>
        <li>
          <strong>(a) Account data — Company as Data Fiduciary.</strong> For the limited personal
          data of the Customer (account holder) that we collect to operate the Platform, the Company
          acts as the Data Fiduciary.
        </li>
        <li>
          <strong>(b) Campaign / voter / Recipient data — Customer as Data Fiduciary.</strong> For
          all contact lists, phone numbers, voter data and Recipient information that a Customer
          uploads or processes through the Platform, the <strong>Customer is the Data Fiduciary</strong>
          and the Company acts merely as a <strong>Data Processor</strong> acting on the Customer’s
          documented instructions. The Company does not determine the purpose of processing such
          data, does not use it for its own purposes, and is not responsible for how the Customer
          collected it or the lawful basis for it.
        </li>
      </ul>
      <p>
        Accordingly, the responsibility for obtaining consent from, issuing notices to, and honouring
        the rights of Recipients/voters rests <strong>solely with the Customer</strong>, not the
        Company.
      </p>

      <h2>3. Personal data we collect</h2>
      <h3>3.1 Account data (as Data Fiduciary)</h3>
      <ul>
        <li>Identity &amp; contact details: name, mobile number, constituency/area, PIN code, state.</li>
        <li>Authentication data: one-time passwords (OTP) and session information.</li>
        <li>Transaction data: Credits purchased, invoices and payment status (card/bank details are
          handled by the payment gateway, not stored by us).</li>
        <li>Technical &amp; usage data: log data, device/browser information and Platform activity.</li>
        <li>Integration credentials you choose to store (e.g., API keys), which are held in encrypted
          form.</li>
      </ul>
      <h3>3.2 Campaign / Recipient data (as Data Processor for the Customer)</h3>
      <ul>
        <li>Contact lists and Recipient phone numbers uploaded by the Customer.</li>
        <li>Message content, templates, audio/IVR scripts and delivery/response logs.</li>
      </ul>

      <h2>4. Purposes and legal basis</h2>
      <p>
        We process account data to: create and secure your account; authenticate you; provide,
        maintain and improve the Services; process payments; provide support; and comply with legal
        obligations. Our legal basis is your consent and the performance of our contract with you.
        Campaign/Recipient data is processed only to deliver the communications you initiate, on your
        instructions.
      </p>

      <h2>5. Consent and its withdrawal</h2>
      <p>
        Where processing is based on consent, you may withdraw it at any time by contacting us; this
        will not affect the lawfulness of processing before withdrawal, and may limit your ability to
        use the Services. For Recipient data, obtaining and managing consent is the Customer’s
        responsibility as Data Fiduciary.
      </p>

      <h2>6. Disclosure of personal data</h2>
      <p>We do not sell personal data. We may share it only as follows:</p>
      <ul>
        <li><strong>Service providers / processors:</strong> telecom operators and aggregators,
          WhatsApp/Meta, cloud hosting and payment gateways, strictly to provide the Services.</li>
        <li><strong>Legal and regulatory:</strong> to courts, law-enforcement, electoral, telecom or
          governmental authorities where required by law or a lawful order.</li>
        <li><strong>Corporate transactions:</strong> to a successor entity in a merger, acquisition
          or reorganisation, subject to this Policy.</li>
      </ul>

      <h2>7. Data security</h2>
      <p>
        We implement reasonable security practices and procedures as required under Section 43A of
        the IT Act and the DPDP Act, including encryption of sensitive credentials, access controls,
        rate-limiting, audit logging and transport security. However, no method of transmission or
        storage is completely secure, and we cannot guarantee absolute security. You are responsible
        for keeping your account credentials confidential.
      </p>

      <h2>8. Data retention</h2>
      <p>
        We retain account data for as long as your account is active and thereafter as required to
        comply with legal, tax, accounting or regulatory obligations, or to resolve disputes.
        Campaign/Recipient data is retained per the Customer’s instructions and deleted or returned
        on termination, save where retention is legally required.
      </p>

      <h2>9. Your rights as a Data Principal</h2>
      <p>Subject to applicable law, including the DPDP Act, you may:</p>
      <ul>
        <li>request access to a summary of your personal data and its processing;</li>
        <li>request correction, completion, updating or erasure of your personal data;</li>
        <li>withdraw consent and nominate another individual to exercise your rights;</li>
        <li>raise a grievance with our Grievance Officer, and escalate to the Data Protection Board
          of India as provided under the DPDP Act.</li>
      </ul>
      <p>
        Requests may be made to the contact below. Recipients/voters wishing to exercise rights over
        campaign data should contact the relevant Customer (the Data Fiduciary for that data); we
        will assist the Customer as a processor where required.
      </p>

      <h2>10. Cookies and similar technologies</h2>
      <p>
        We use strictly necessary cookies and local browser storage to keep you signed in and to
        operate the Platform securely. We do not use them to track you across third-party websites.
      </p>

      <h2>11. Children</h2>
      <p>
        The Platform is not directed to, and may not be used by, individuals under 18 years of age.
        We do not knowingly collect personal data of children.
      </p>

      <h2>12. Data transfers</h2>
      <p>
        Personal data is primarily processed in India. Where any transfer outside India occurs
        (for example, via a cloud or messaging provider), it will be carried out in accordance with
        applicable law.
      </p>

      <h2>13. Grievance Officer / Data Protection contact</h2>
      <p>
        For any privacy question, request or grievance, contact:
      </p>
      <ul>
        <li><strong>Name:</strong> [Grievance / Data Protection Officer Name]</li>
        <li><strong>Email:</strong> privacy@poltica.in</li>
        <li><strong>Address:</strong> octaleads Private Limited, [Registered Address, City, State, PIN]</li>
      </ul>
      <p>We will acknowledge and address grievances within the timelines prescribed by applicable law.</p>

      <h2>14. Changes to this Policy</h2>
      <p>
        We may update this Policy from time to time. The revised version takes effect when posted on
        the Platform, and material changes may be notified to you. Your continued use constitutes
        acceptance.
      </p>

      <h2>15. Governing law</h2>
      <p>
        This Policy is governed by the laws of India, and any dispute is subject to the jurisdiction
        specified in our <a href="/terms">Terms &amp; Conditions</a>.
      </p>
    </LegalPage>
  );
}
