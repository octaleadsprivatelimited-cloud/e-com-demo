import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms & Conditions | Poltica Systems",
  description:
    "Terms & Conditions governing use of the Poltica Systems SaaS platform operated by octaleads Private Limited.",
  robots: { index: false, follow: false },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      subtitle="Please read these Terms carefully before using the Poltica Systems platform."
      lastUpdated="13 July 2026"
    >
      <h2>1. Acceptance of these Terms</h2>
      <p>
        These Terms &amp; Conditions (“Terms”) constitute a legally binding agreement between you
        (“Customer”, “User”, “you”) and <strong>octaleads Private Limited</strong>, a company
        incorporated under the Companies Act, 2013, having its registered office at
        [Registered Address, City, State, PIN] (“Company”, “we”, “us”, “our”), which operates the
        software platform and brand “Poltica Systems” (the “Platform”). By registering for,
        accessing, purchasing credits on, or using the Platform, you confirm that you have read,
        understood and agree to be bound by these Terms. If you do not agree, you must not use the
        Platform.
      </p>
      <p>
        This document is an electronic record under the Information Technology Act, 2000 and the
        rules made thereunder, and does not require any physical or digital signature.
      </p>

      <h2>2. Definitions</h2>
      <ul>
        <li><strong>“Platform” / “Services”</strong> means the self-service software tools provided
          by the Company on a Software-as-a-Service (SaaS) basis, including tools to compose and
          dispatch SMS, WhatsApp Business API messages, and automated voice/IVR calls, and related
          dashboards and analytics.</li>
        <li><strong>“Customer Content”</strong> means all data, contact lists, phone numbers,
          messages, scripts, audio, images, sender identities, templates and other material that
          you upload, configure, generate or transmit through the Platform.</li>
        <li><strong>“Recipients”</strong> means the individuals to whom you direct communications
          using the Platform.</li>
        <li><strong>“Credits”</strong> means the prepaid balance you purchase in advance to use the
          Services.</li>
      </ul>

      <h2>3. Nature of the Service — Tool Provider Only</h2>
      <p>
        The Company provides <strong>technology tools only</strong>. The Platform is a neutral,
        automated, self-service facility that transmits communications composed, configured and
        initiated entirely by you. The Company does <strong>not</strong> author, originate, select,
        endorse, verify, edit, approve or control any Customer Content, nor the identity of
        Recipients, nor the purpose of any campaign. You alone decide what to send, to whom, when
        and why.
      </p>
      <p>
        The Company acts as an “intermediary” within the meaning of Section 2(1)(w) of the
        Information Technology Act, 2000, and merely provides access to a communication system over
        which information made available by you is transmitted, stored or hosted. The relationship
        between you and the Company is strictly that of an independent service provider and its
        customer. Nothing in these Terms creates any partnership, joint venture, agency, employment
        or political association between the parties.
      </p>

      <h2>4. No Political Affiliation, Endorsement or Involvement</h2>
      <p>
        The Company is a technology vendor and is <strong>politically neutral</strong>. The Company
        has no affiliation with, and does not support, sponsor, endorse or participate in, any
        candidate, party, campaign, ideology or message transmitted through the Platform. Any
        reference, branding, manifesto, claim or communication is that of the Customer alone. The
        Company’s provision of tools shall never be construed as involvement in, or association
        with, your political or campaign activity.
      </p>

      <h2>5. Eligibility and Account Registration</h2>
      <ul>
        <li>You must be at least 18 years of age and competent to contract under the Indian
          Contract Act, 1872.</li>
        <li>You represent that you are duly authorised to run the campaigns you conduct and to
          upload and process the data you provide, and that all registration information you
          provide is true, accurate and current.</li>
        <li>You are responsible for maintaining the confidentiality of your account credentials and
          for all activity that occurs under your account. You must notify us immediately of any
          unauthorised use.</li>
      </ul>

      <h2>6. Prepaid Credits, Fees, Taxes and No-Refund Policy</h2>
      <ul>
        <li>The Services are offered on a <strong>prepaid basis</strong>. You must purchase Credits
          in advance before availing the Services. Delivery of Services is contingent on a cleared
          payment.</li>
        <li>All fees are exclusive of applicable taxes (including GST), which shall be borne by you
          and charged at prevailing rates.</li>
        <li>Except where a refund is expressly required by applicable law, all payments and Credits
          are <strong>non-refundable and non-transferable</strong>, including where campaigns are
          suspended, cancelled, blocked or rejected by telecom operators, regulators or authorities,
          or terminated for breach of these Terms. Credits have no monetary value outside the
          Platform.</li>
        <li>Payments are processed by third-party payment gateways. The Company does not store your
          full card or banking credentials.</li>
      </ul>

      <h2>7. Customer’s Sole Responsibility and Compliance Obligations</h2>
      <p>
        You acknowledge and agree that you are the <strong>sole and exclusive party responsible</strong>
        for every communication you send and every dataset you use through the Platform, and for
        ensuring full compliance with all applicable laws. Without limitation, you are solely
        responsible for the following, at your own cost, risk and liability:
      </p>

      <h3>7.1 Content lawfulness</h3>
      <p>
        Ensuring that all Customer Content is truthful, lawful, and does not violate any law or the
        rights of any person; and is not defamatory, obscene, misleading, fraudulent, seditious,
        or likely to incite hatred, violence, communal disharmony or enmity between groups.
      </p>

      <h3>7.2 Telecom &amp; DLT compliance</h3>
      <p>
        Obtaining and maintaining all required registrations and approvals under the Telecom
        Commercial Communications Customer Preference Regulations, 2018 (TCCCPR) and TRAI norms,
        including registration on the DLT (Distributed Ledger Technology) platform, registration of
        Headers/Sender IDs, and approval of message templates and voice content. You are responsible
        for all consequences of using unregistered or non-compliant headers, templates or content.
      </p>

      <h3>7.3 Consent, DND and anti-spam</h3>
      <p>
        Ensuring that you have a valid legal basis and, where required, the prior consent of each
        Recipient to be contacted; honouring “Do Not Disturb” (DND) preferences and opt-outs; and
        not using the Platform for unsolicited, spam, bulk-unauthorised or scraped-contact
        communications.
      </p>

      <h3>7.4 Electoral law compliance</h3>
      <p>
        Complying with all electoral laws and directions, including the Representation of the People
        Act, 1951, the Election Commission of India (ECI) Model Code of Conduct, applicable
        pre-certification requirements of the Media Certification and Monitoring Committee (MCMC),
        rules on political advertising, silence periods, expenditure limits and disclosure, and any
        directions of the ECI or Returning Officers. You are responsible for including any legally
        required disclaimers or publisher/promoter identifications in your communications.
      </p>

      <h3>7.5 Data protection — you are the Data Fiduciary</h3>
      <p>
        In respect of Recipient and voter data you upload or process, <strong>you are the Data
        Fiduciary</strong> under the Digital Personal Data Protection Act, 2023 (“DPDP Act”), and the
        Company acts only as a Data Processor processing such data on your documented instructions.
        You are solely responsible for the lawful collection of such data, for having a valid legal
        basis/consent, for issuing required notices, and for honouring data-principal rights. See
        our <a href="/privacy">Privacy Policy</a> for further detail.
      </p>

      <h3>7.6 Prohibited use</h3>
      <p>You must not use the Platform to: impersonate any person or entity; transmit malware; send
        content that is unlawful under Rule 3 of the IT (Intermediary Guidelines and Digital Media
        Ethics Code) Rules, 2021; interfere with elections unlawfully; or violate any third-party
        intellectual property, privacy or other rights.</p>

      <h2>8. Intermediary Status &amp; Disclaimer of Responsibility for Content</h2>
      <p>
        Consistent with Section 79 of the Information Technology Act, 2000 and the IT (Intermediary
        Guidelines and Digital Media Ethics Code) Rules, 2021, the Company shall not be liable for
        any Customer Content or third-party information transmitted, stored or hosted through the
        Platform, where the Company’s role is limited to providing access to a communication system
        and it does not initiate the transmission, select the receiver, or select or modify the
        information contained in the transmission. The Company does not endorse and is not
        responsible for the accuracy, legality or consequences of any Customer Content.
      </p>

      <h2>9. Customer is the Responsible Party for All Legal Consequences</h2>
      <p>
        You agree that <strong>you alone are answerable and liable for any legal issue, notice,
        complaint, claim, dispute, inquiry, penalty or proceeding</strong> — whether civil,
        criminal, regulatory, electoral, telecom, taxation or otherwise — arising out of or in
        connection with your use of the Platform, your Customer Content, your campaigns, your data,
        or your Recipients. You shall respond to, defend, and bear the entire cost and consequence of
        any such matter in your own name and at your own expense. The Company shall not be made a
        party to, and disclaims all responsibility for, any such matter, and its role remains limited
        to that of a neutral tool provider.
      </p>

      <h2>10. Indemnification</h2>
      <p>
        You shall indemnify, defend and hold harmless the Company, its directors, officers,
        employees, agents and affiliates from and against any and all claims, demands, actions,
        suits, proceedings, losses, liabilities, damages, fines, penalties, costs and expenses
        (including reasonable legal fees) arising out of or relating to: (a) your Customer Content
        or campaigns; (b) your breach of these Terms or of any applicable law (including telecom,
        electoral, data-protection, consumer, defamation or criminal law); (c) your data,
        Recipients or the manner in which you obtained or used any contact information; or (d) any
        third-party claim connected with your use of the Platform. This obligation survives
        termination.
      </p>

      <h2>11. Limitation of Liability &amp; “As-Is” Service</h2>
      <p>
        The Platform is provided on an “as-is” and “as-available” basis without warranties of any
        kind, whether express or implied, including as to merchantability, fitness for a particular
        purpose, uninterrupted availability, or deliverability of messages (which depends on telecom
        operators, DLT scrubbing, device status and factors outside the Company’s control).
      </p>
      <p>
        To the maximum extent permitted by applicable law, the Company shall not be liable for any
        indirect, incidental, special, consequential, punitive or exemplary damages, or for loss of
        profits, goodwill, votes, opportunity or data. To the extent the Company is held liable
        notwithstanding the foregoing, its aggregate liability arising out of or relating to the
        Services shall not exceed the total fees actually paid by you to the Company for the
        Services in the three (3) months immediately preceding the event giving rise to the claim.
        Nothing in these Terms excludes any liability that cannot be excluded under applicable law.
      </p>

      <h2>12. Suspension and Termination</h2>
      <p>
        The Company may suspend or terminate your access, with or without notice, if it reasonably
        believes you have breached these Terms or any law, if required by a telecom operator,
        regulator, court or authority, for non-payment, or to protect the integrity or security of
        the Platform. Upon termination, your right to use the Services ceases immediately;
        provisions that by their nature should survive (including Sections 7, 9, 10, 11, 13 and 18)
        shall survive.
      </p>

      <h2>13. Cooperation with Authorities &amp; Lawful Disclosure</h2>
      <p>
        The Company may preserve and disclose Customer Content, account details, logs and related
        information to law-enforcement, regulatory, electoral or governmental authorities where
        required by law or a lawful order, or where it believes in good faith that such disclosure
        is necessary. You consent to such disclosure and agree that the Company shall bear no
        liability for complying with any such lawful request.
      </p>

      <h2>14. Intellectual Property</h2>
      <p>
        All rights, title and interest in the Platform, its software, design and trademarks
        (including “Poltica Systems”) belong to the Company. You retain ownership of your Customer
        Content and grant the Company a limited licence to host, process and transmit it solely to
        provide the Services.
      </p>

      <h2>15. Third-Party Services</h2>
      <p>
        The Platform integrates third-party services (including telecom operators, WhatsApp/Meta,
        payment gateways and cloud providers). Your use of such services may be subject to their own
        terms. The Company is not responsible for the acts, omissions, availability or policies of
        such third parties.
      </p>

      <h2>16. Grievance Redressal</h2>
      <p>
        In accordance with the IT (Intermediary Guidelines and Digital Media Ethics Code) Rules,
        2021, the Grievance Officer for the Platform is:
      </p>
      <ul>
        <li><strong>Name:</strong> [Grievance Officer Name]</li>
        <li><strong>Email:</strong> grievance@poltica.in</li>
        <li><strong>Address:</strong> [Registered Address, City, State, PIN]</li>
      </ul>
      <p>
        Grievances will be acknowledged within 24 hours and resolved within the timelines prescribed
        under applicable law.
      </p>

      <h2>17. Governing Law and Jurisdiction</h2>
      <p>
        These Terms are governed by the laws of India. Subject to any applicable law, the courts at
        [City], [State] shall have exclusive jurisdiction over any dispute arising out of or in
        connection with these Terms or the Services.
      </p>

      <h2>18. Force Majeure</h2>
      <p>
        The Company shall not be liable for any failure or delay caused by events beyond its
        reasonable control, including acts of God, network or telecom failures, regulatory action,
        internet outages, strikes, or governmental restrictions.
      </p>

      <h2>19. Amendments</h2>
      <p>
        The Company may update these Terms from time to time. The revised Terms take effect when
        posted on the Platform. Your continued use after such posting constitutes acceptance.
      </p>

      <h2>20. Severability, Waiver, Assignment &amp; Entire Agreement</h2>
      <p>
        If any provision is held invalid, the remaining provisions continue in effect. A failure to
        enforce any provision is not a waiver. You may not assign these Terms without the Company’s
        consent; the Company may assign them to an affiliate or successor. These Terms, together with
        the Privacy Policy, constitute the entire agreement between the parties regarding the
        Services.
      </p>

      <h2>21. Contact</h2>
      <p>
        Questions about these Terms may be sent to <a href="mailto:support@poltica.in">support@poltica.in</a>.
      </p>
    </LegalPage>
  );
}
