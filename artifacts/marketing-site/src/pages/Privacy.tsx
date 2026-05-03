import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

type Section = {
  id: string;
  title: string;
  blocks: Block[];
};

type Block =
  | { kind: "p"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "ul"; items: string[] };

const SECTIONS: Section[] = [
  {
    id: "introduction",
    title: "1. Introduction",
    blocks: [
      {
        kind: "p",
        text: 'Welcome to ProvenPath ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our career performance tracking platform at provenpath.app (the "Platform").',
      },
      {
        kind: "p",
        text: "By using ProvenPath, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with our policies and practices, please do not use our Platform.",
      },
    ],
  },
  {
    id: "information-we-collect",
    title: "2. Information We Collect",
    blocks: [
      { kind: "h3", text: "2.1 Information You Provide to Us" },
      { kind: "p", text: "Account Information:" },
      {
        kind: "ul",
        items: [
          "Name, email address, phone number",
          "Professional title, company name, employment history",
          "Profile photo and biographical information",
          "Login credentials (encrypted)",
        ],
      },
      { kind: "p", text: "Career Performance Data:" },
      {
        kind: "ul",
        items: [
          "Self-assessment responses",
          "Peer and manager review feedback",
          "Interview scores and evaluations",
          "Skill assessments and ratings",
          "Career goals and development plans",
          "Performance review history",
          "Promotion readiness indicators",
        ],
      },
      { kind: "p", text: "Identity Verification Data:" },
      {
        kind: "ul",
        items: [
          "Information collected through our Clear.me integration for background checks",
          "Government-issued identification (processed by Clear.me, not stored by ProvenPath)",
          "Employment verification documents",
        ],
      },
      { kind: "p", text: "Communication Data:" },
      {
        kind: "ul",
        items: [
          "Messages sent through our Platform",
          "Support requests and correspondence",
          "Feedback and survey responses",
        ],
      },
      { kind: "h3", text: "2.2 Information Collected Automatically" },
      { kind: "p", text: "Usage Data:" },
      {
        kind: "ul",
        items: [
          "IP address, browser type, device information",
          "Pages visited, time spent on pages, click data",
          "Referring/exit pages and URLs",
          "Date and time stamps of Platform usage",
        ],
      },
      { kind: "p", text: "Cookies and Tracking Technologies:" },
      {
        kind: "ul",
        items: [
          "We use cookies, web beacons, and similar technologies to enhance your experience",
          "You can control cookie preferences through your browser settings",
        ],
      },
      { kind: "h3", text: "2.3 Information from Third Parties" },
      { kind: "p", text: "Employer-Provided Data:" },
      {
        kind: "ul",
        items: [
          "Performance review data shared by your employer",
          "Organizational structure and reporting relationships",
          "Company-specific skill matrices and career levels",
        ],
      },
      { kind: "p", text: "Integration Data:" },
      {
        kind: "ul",
        items: [
          "Information from HRIS systems (BambooHR, Workday, Gusto, etc.) if your employer uses our integrations",
          "LinkedIn profile data (if you choose to connect your account)",
        ],
      },
    ],
  },
  {
    id: "how-we-use",
    title: "3. How We Use Your Information",
    blocks: [
      { kind: "p", text: "We use your information for the following purposes:" },
      { kind: "h3", text: "3.1 Platform Services" },
      {
        kind: "ul",
        items: [
          "Provide, maintain, and improve our Platform",
          "Create and manage your Proven Path",
          "Generate AI-powered development plans and career insights",
          "Facilitate performance reviews and feedback collection",
          "Track career progression and skill development",
          "Enable identity verification through Clear.me",
          "Generate verified references and career documentation",
        ],
      },
      { kind: "h3", text: "3.2 Communication" },
      {
        kind: "ul",
        items: [
          "Send you service-related notifications and updates",
          "Respond to your inquiries and support requests",
          "Send promotional communications (with your consent)",
          "Notify you of performance review cycles and deadlines",
        ],
      },
      { kind: "h3", text: "3.3 Analytics and Improvement" },
      {
        kind: "ul",
        items: [
          "Analyze Platform usage to improve features and user experience",
          "Conduct research and development for new features",
          "Generate aggregated, anonymized analytics for employers",
          "Monitor and prevent fraud, abuse, and security incidents",
        ],
      },
      { kind: "h3", text: "3.4 Legal and Compliance" },
      {
        kind: "ul",
        items: [
          "Comply with legal obligations and regulatory requirements",
          "Enforce our Terms of Service and other policies",
          "Protect our rights, privacy, safety, and property",
          "Resolve disputes and enforce agreements",
        ],
      },
    ],
  },
  {
    id: "how-we-share",
    title: "4. How We Share Your Information",
    blocks: [
      { kind: "h3", text: "4.1 With Your Consent" },
      { kind: "p", text: "We share your information when you explicitly authorize us to do so, including:" },
      {
        kind: "ul",
        items: [
          "Sharing your Proven Path with prospective employers",
          "Providing verified references to third parties you designate",
          "Exporting your performance data to external systems",
        ],
      },
      { kind: "h3", text: "4.2 With Your Employer" },
      { kind: "p", text: "If you use ProvenPath through your employer's account:" },
      {
        kind: "ul",
        items: [
          "Your employer can access performance reviews, skill assessments, and career progression data",
          "Aggregated, anonymized data may be shared for organizational analytics",
          "Your employer cannot access your Proven Path after you leave the company unless you grant permission",
        ],
      },
      { kind: "h3", text: "4.3 Service Providers" },
      { kind: "p", text: "We share information with trusted third-party service providers who assist us in operating our Platform:" },
      {
        kind: "ul",
        items: [
          "Clear.me — Identity verification and background checks",
          "Cloud hosting providers — Data storage and infrastructure",
          "Email service providers — Transactional and marketing emails",
          "Analytics providers — Platform usage analysis",
          "Payment processors — Subscription billing (Stripe, PayPal)",
        ],
      },
      { kind: "p", text: "All service providers are contractually obligated to protect your information and use it only for the purposes we specify." },
      { kind: "h3", text: "4.4 Business Transfers" },
      { kind: "p", text: "If ProvenPath is involved in a merger, acquisition, or sale of assets, your information may be transferred. We will notify you before your information becomes subject to a different privacy policy." },
      { kind: "h3", text: "4.5 Legal Requirements" },
      { kind: "p", text: "We may disclose your information if required by law or in response to:" },
      {
        kind: "ul",
        items: [
          "Court orders, subpoenas, or legal processes",
          "Requests from government authorities",
          "Situations involving potential threats to safety or security",
          "Protection of our legal rights and property",
        ],
      },
      { kind: "h3", text: "4.6 Aggregated and Anonymized Data" },
      { kind: "p", text: "We may share aggregated, anonymized data that cannot identify you individually for:" },
      {
        kind: "ul",
        items: [
          "Industry benchmarking and research",
          "Marketing and promotional purposes",
          "Product development and improvement",
        ],
      },
    ],
  },
  {
    id: "data-ownership",
    title: "5. Data Ownership and Portability",
    blocks: [
      { kind: "h3", text: "5.1 Your Data Ownership" },
      { kind: "p", text: "You own your Proven Path data. This includes:" },
      {
        kind: "ul",
        items: [
          "Your performance reviews and feedback",
          "Skill assessments and career progression history",
          "AI-generated development plans",
          "Verified references and achievements",
        ],
      },
      { kind: "h3", text: "5.2 Employer License" },
      { kind: "p", text: "Your employer licenses access to your performance data during your employment. Upon termination of employment:" },
      {
        kind: "ul",
        items: [
          "Your employer retains historical performance data for their records",
          "You retain full ownership and control of your Proven Path",
          "You can export and transfer your data to new employers",
        ],
      },
      { kind: "h3", text: "5.3 Data Portability" },
      { kind: "p", text: "You have the right to:" },
      {
        kind: "ul",
        items: [
          "Export your Proven Path in standard formats (JSON, PDF)",
          "Transfer your verified performance history to new employers",
          "Download all your personal data at any time",
          "Request deletion of your data (subject to legal retention requirements)",
        ],
      },
    ],
  },
  {
    id: "data-security",
    title: "6. Data Security",
    blocks: [
      { kind: "p", text: "We implement industry-standard security measures to protect your information:" },
      { kind: "h3", text: "6.1 Technical Safeguards" },
      {
        kind: "ul",
        items: [
          "Encryption of data in transit (TLS/SSL) and at rest (AES-256)",
          "Secure authentication and password hashing",
          "Regular security audits and penetration testing",
          "Intrusion detection and prevention systems",
          "Secure backup and disaster recovery procedures",
        ],
      },
      { kind: "h3", text: "6.2 Organizational Safeguards" },
      {
        kind: "ul",
        items: [
          "Access controls and role-based permissions",
          "Employee training on data protection and privacy",
          "Confidentiality agreements with all personnel",
          "Incident response and breach notification procedures",
        ],
      },
      { kind: "h3", text: "6.3 Third-Party Security" },
      {
        kind: "ul",
        items: [
          "All service providers undergo security assessments",
          "Compliance with SOC 2 Type II standards (in progress)",
          "Regular vendor security reviews",
        ],
      },
      { kind: "p", text: "Note: No method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security." },
    ],
  },
  {
    id: "data-retention",
    title: "7. Data Retention",
    blocks: [
      { kind: "h3", text: "7.1 Active Accounts" },
      { kind: "p", text: "We retain your information for as long as your account is active or as needed to provide services." },
      { kind: "h3", text: "7.2 Inactive Accounts" },
      { kind: "p", text: "If your account is inactive for 3 years, we will:" },
      {
        kind: "ul",
        items: [
          "Send you a notification before deletion",
          "Provide 90 days to reactivate or export your data",
          "Delete your account and associated data after the grace period",
        ],
      },
      { kind: "h3", text: "7.3 Legal Retention" },
      { kind: "p", text: "We may retain certain information for longer periods when required by:" },
      {
        kind: "ul",
        items: [
          "Legal obligations (tax, employment, or regulatory requirements)",
          "Dispute resolution and legal proceedings",
          "Fraud prevention and security purposes",
        ],
      },
      { kind: "h3", text: "7.4 Employer Data" },
      { kind: "p", text: "Employers may retain historical performance data according to their own retention policies and legal requirements." },
    ],
  },
  {
    id: "your-rights",
    title: "8. Your Privacy Rights",
    blocks: [
      { kind: "p", text: "Depending on your location, you may have the following rights:" },
      { kind: "h3", text: "8.1 Access and Correction" },
      {
        kind: "ul",
        items: [
          "Access your personal information",
          "Correct inaccurate or incomplete data",
          "Update your profile and preferences",
        ],
      },
      { kind: "h3", text: "8.2 Data Portability" },
      {
        kind: "ul",
        items: [
          "Export your Proven Path in machine-readable formats",
          "Transfer your data to other services",
        ],
      },
      { kind: "h3", text: "8.3 Deletion" },
      {
        kind: "ul",
        items: [
          "Request deletion of your personal information",
          "Close your account permanently",
          "Note: Some data may be retained for legal compliance",
        ],
      },
      { kind: "h3", text: "8.4 Objection and Restriction" },
      {
        kind: "ul",
        items: [
          "Object to certain data processing activities",
          "Restrict how we use your information",
          "Opt out of marketing communications",
        ],
      },
      { kind: "h3", text: "8.5 Withdraw Consent" },
      {
        kind: "ul",
        items: [
          "Withdraw consent for data processing at any time",
          "Disconnect third-party integrations",
          "Revoke access permissions",
        ],
      },
      { kind: "h3", text: "8.6 Lodge a Complaint" },
      {
        kind: "ul",
        items: [
          "File a complaint with your local data protection authority",
          "Contact us directly with privacy concerns",
        ],
      },
      { kind: "p", text: "To exercise your rights, contact us at: privacy@provenpath.app" },
    ],
  },
  {
    id: "international-transfers",
    title: "9. International Data Transfers",
    blocks: [
      { kind: "p", text: "ProvenPath is based in Canada. If you access our Platform from outside Canada:" },
      {
        kind: "ul",
        items: [
          "Your information may be transferred to and processed in Canada",
          "We comply with applicable data protection laws for international transfers",
          "We use standard contractual clauses and other safeguards as required",
        ],
      },
    ],
  },
  {
    id: "childrens-privacy",
    title: "10. Children's Privacy",
    blocks: [
      { kind: "p", text: "ProvenPath is not intended for individuals under 16 years of age. We do not knowingly collect personal information from children. If we discover we have collected information from a child, we will delete it immediately." },
    ],
  },
  {
    id: "ccpa",
    title: "11. California Privacy Rights (CCPA)",
    blocks: [
      { kind: "p", text: "If you are a California resident, you have additional rights under the California Consumer Privacy Act:" },
      { kind: "h3", text: "11.1 Right to Know" },
      {
        kind: "ul",
        items: [
          "Categories of personal information collected",
          "Sources of personal information",
          "Business purposes for collection",
          "Categories of third parties with whom we share information",
        ],
      },
      { kind: "h3", text: "11.2 Right to Delete" },
      {
        kind: "ul",
        items: ["Request deletion of your personal information (subject to exceptions)"],
      },
      { kind: "h3", text: "11.3 Right to Opt-Out" },
      {
        kind: "ul",
        items: ['Opt out of the "sale" of personal information (Note: We do not sell personal information)'],
      },
      { kind: "h3", text: "11.4 Right to Non-Discrimination" },
      {
        kind: "ul",
        items: ["We will not discriminate against you for exercising your CCPA rights"],
      },
      { kind: "p", text: "To exercise your CCPA rights, contact us at: privacy@provenpath.app" },
    ],
  },
  {
    id: "gdpr",
    title: "12. European Privacy Rights (GDPR)",
    blocks: [
      { kind: "p", text: "If you are in the European Economic Area (EEA), you have rights under the General Data Protection Regulation:" },
      { kind: "h3", text: "12.1 Legal Basis for Processing" },
      { kind: "p", text: "We process your data based on:" },
      {
        kind: "ul",
        items: [
          "Consent: When you provide explicit consent",
          "Contract: To fulfill our contractual obligations",
          "Legitimate Interests: For business operations and improvements",
          "Legal Obligations: To comply with laws and regulations",
        ],
      },
      { kind: "h3", text: "12.2 Data Protection Officer" },
      { kind: "p", text: "For GDPR-related inquiries, contact our Data Protection Officer at: privacy@provenpath.app" },
      { kind: "h3", text: "12.3 EU Representative" },
      { kind: "p", text: "[To be appointed when serving EU customers]" },
    ],
  },
  {
    id: "cookies",
    title: "13. Cookies and Tracking Technologies",
    blocks: [
      { kind: "h3", text: "13.1 Types of Cookies We Use" },
      { kind: "p", text: "Essential Cookies:" },
      {
        kind: "ul",
        items: [
          "Required for Platform functionality",
          "Authentication and security",
          "Cannot be disabled",
        ],
      },
      { kind: "p", text: "Analytics Cookies:" },
      {
        kind: "ul",
        items: [
          "Track Platform usage and performance",
          "Help us improve user experience",
          "Can be disabled through browser settings",
        ],
      },
      { kind: "p", text: "Marketing Cookies:" },
      {
        kind: "ul",
        items: [
          "Personalize content and advertisements",
          "Track marketing campaign effectiveness",
          "Can be disabled through cookie preferences",
        ],
      },
      { kind: "h3", text: "13.2 Managing Cookies" },
      { kind: "p", text: "You can control cookies through:" },
      {
        kind: "ul",
        items: [
          "Browser settings (Chrome, Firefox, Safari, Edge)",
          "Our cookie preference center (available in footer)",
          "Third-party opt-out tools (e.g., Network Advertising Initiative)",
        ],
      },
      { kind: "h3", text: "13.3 Do Not Track" },
      { kind: "p", text: 'We currently do not respond to "Do Not Track" browser signals, but you can disable cookies as described above.' },
    ],
  },
  {
    id: "third-party-links",
    title: "14. Third-Party Links",
    blocks: [
      { kind: "p", text: "Our Platform may contain links to third-party websites and services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies before providing any information." },
    ],
  },
  {
    id: "ai-decisions",
    title: "15. AI and Automated Decision-Making",
    blocks: [
      { kind: "h3", text: "15.1 AI-Generated Development Plans" },
      { kind: "p", text: "We use artificial intelligence to analyze your performance data and generate personalized career development recommendations. These AI-generated insights are:" },
      {
        kind: "ul",
        items: [
          "Based on your performance history, skill assessments, and career goals",
          "Intended as guidance, not definitive career advice",
          "Subject to human review and your discretion",
        ],
      },
      { kind: "h3", text: "15.2 Promotion Readiness Predictions" },
      { kind: "p", text: "Our AI predicts promotion readiness based on historical patterns and performance data. These predictions:" },
      {
        kind: "ul",
        items: [
          "Are probabilistic estimates, not guarantees",
          "Should be considered alongside human judgment",
          "Do not make final promotion decisions (humans do)",
        ],
      },
      { kind: "h3", text: "15.3 Your Rights" },
      { kind: "p", text: "You have the right to:" },
      {
        kind: "ul",
        items: [
          "Understand how AI decisions are made",
          "Contest AI-generated recommendations",
          "Request human review of automated decisions",
        ],
      },
    ],
  },
  {
    id: "changes",
    title: "16. Changes to This Privacy Policy",
    blocks: [
      { kind: "p", text: "We may update this Privacy Policy from time to time. When we make changes:" },
      {
        kind: "ul",
        items: [
          'We will update the "Last Updated" date at the top',
          "We will notify you via email or Platform notification for material changes",
          "Continued use of the Platform after changes constitutes acceptance",
        ],
      },
      { kind: "p", text: "We encourage you to review this Privacy Policy periodically." },
    ],
  },
  {
    id: "contact",
    title: "17. Contact Us",
    blocks: [
      { kind: "p", text: "If you have questions, concerns, or requests regarding this Privacy Policy or our privacy practices:" },
      { kind: "p", text: "ProvenPath — Email: privacy@provenpath.app" },
    ],
  },
];

function renderBlock(block: Block, idx: number) {
  if (block.kind === "h3") {
    return (
      <h3 key={idx} className="text-lg font-semibold text-gray-900 mt-8 mb-3">
        {block.text}
      </h3>
    );
  }
  if (block.kind === "p") {
    return (
      <p key={idx} className="text-gray-700 leading-relaxed mb-4">
        {block.text}
      </p>
    );
  }
  return (
    <ul key={idx} className="list-disc pl-6 space-y-2 mb-4 text-gray-700">
      {block.items.map((item, i) => (
        <li key={i} className="leading-relaxed">
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function Privacy() {
  useDocumentMeta({
    title: "Privacy Policy — Proven Path",
    description:
      "Read the Proven Path privacy policy. Learn how we collect, use, and protect your data on our HR performance intelligence platform.",
    ogImage: "opengraph.jpg",
    canonicalPath: "/privacy",
  });

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1 pt-16">
        {/* Hero */}
        <section className="relative py-20 overflow-hidden bg-gradient-to-br from-[#1e293b] via-[#312e81] to-[#4c1d95] text-white">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.18] [background-image:radial-gradient(rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:22px_22px]"
          />
          <div
            aria-hidden
            className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-primary/30 blur-[120px]"
          />
          <div
            aria-hidden
            className="absolute -bottom-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-warning/15 blur-[120px]"
          />

          <Container className="relative z-10">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-medium text-white/80 mb-5 backdrop-blur-sm">
                Legal
              </span>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
              <p className="text-gray-300">
                Effective Date: May 2, 2026 · Last Updated: May 2, 2026
              </p>
            </div>
          </Container>
        </section>

        {/* Body */}
        <section className="py-16 lg:py-20">
          <Container>
            <div className="grid lg:grid-cols-[18rem_1fr] gap-12">
              {/* Table of contents */}
              <aside className="hidden lg:block">
                <div className="sticky top-24">
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                    Contents
                  </h2>
                  <nav>
                    <ul className="space-y-2">
                      {SECTIONS.map((section) => (
                        <li key={section.id}>
                          <a
                            href={`#${section.id}`}
                            className="block text-sm text-gray-600 hover:text-primary leading-snug"
                          >
                            {section.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>
              </aside>

              {/* Content */}
              <article className="max-w-3xl">
                {SECTIONS.map((section) => (
                  <section
                    key={section.id}
                    id={section.id}
                    className="scroll-mt-24 mb-12 last:mb-0"
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      {section.title}
                    </h2>
                    {section.blocks.map((block, i) => renderBlock(block, i))}
                  </section>
                ))}
              </article>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </div>
  );
}
