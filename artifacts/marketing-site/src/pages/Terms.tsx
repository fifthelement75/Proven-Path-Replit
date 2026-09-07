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
    id: "agreement",
    title: "1. Agreement to Terms",
    blocks: [
      {
        kind: "p",
        text: 'Welcome to ProvenPath ("we," "our," "us," or "ProvenPath"). These Terms of Service ("Terms") govern your access to and use of our career performance tracking platform, including our website at provenpath.fyi, mobile applications, and related services (collectively, the "Platform").',
      },
      {
        kind: "p",
        text: "By accessing or using ProvenPath, you agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you may not access or use the Platform.",
      },
      {
        kind: "p",
        text: "These Terms constitute a legally binding agreement between you and ProvenPath. Please read them carefully.",
      },
    ],
  },
  {
    id: "definitions",
    title: "2. Definitions",
    blocks: [
      {
        kind: "ul",
        items: [
          '"Account" means your registered user account on the Platform',
          '"Proven Path" means your portable, verified career performance record',
          '"Content" means text, images, data, and other materials on the Platform',
          '"Employer" means an organization that subscribes to ProvenPath for its employees',
          '"User," "you," or "your" means the individual or entity using the Platform',
          '"Services" means all features, tools, and functionality provided by ProvenPath',
          '"Subscription" means your paid access to premium features',
        ],
      },
    ],
  },
  {
    id: "eligibility",
    title: "3. Eligibility",
    blocks: [
      { kind: "h3", text: "3.1 Age Requirement" },
      { kind: "p", text: "You must be at least 16 years old to use ProvenPath. By using the Platform, you represent and warrant that you meet this age requirement." },
      { kind: "h3", text: "3.2 Authority" },
      { kind: "p", text: "If you are using ProvenPath on behalf of an organization, you represent and warrant that:" },
      {
        kind: "ul",
        items: [
          "You have the authority to bind that organization to these Terms",
          "You agree to these Terms on behalf of that organization",
        ],
      },
      { kind: "h3", text: "3.3 Prohibited Users" },
      { kind: "p", text: "You may not use ProvenPath if:" },
      {
        kind: "ul",
        items: [
          "You have been previously banned from the Platform",
          "You are prohibited by law from using the Platform",
          "Your account has been terminated for violating these Terms",
        ],
      },
    ],
  },
  {
    id: "accounts",
    title: "4. Account Registration and Security",
    blocks: [
      { kind: "h3", text: "4.1 Account Creation" },
      { kind: "p", text: "To access certain features, you must create an account by providing:" },
      {
        kind: "ul",
        items: [
          "Accurate and complete information",
          "A valid email address",
          "A secure password",
          "Professional information (name, title, employment history)",
        ],
      },
      { kind: "h3", text: "4.2 Account Security" },
      { kind: "p", text: "You are responsible for:" },
      {
        kind: "ul",
        items: [
          "Maintaining the confidentiality of your login credentials",
          "All activities that occur under your account",
          "Notifying us immediately of any unauthorized access",
          "Using a strong, unique password",
        ],
      },
      { kind: "p", text: "We are not liable for any loss or damage arising from your failure to protect your account." },
      { kind: "h3", text: "4.3 Account Accuracy" },
      { kind: "p", text: "You agree to:" },
      {
        kind: "ul",
        items: [
          "Provide accurate, current, and complete information",
          "Update your information promptly when it changes",
          "Not impersonate any person or entity",
          "Not create multiple accounts for fraudulent purposes",
        ],
      },
      { kind: "h3", text: "4.4 Account Termination" },
      { kind: "p", text: "We reserve the right to suspend or terminate your account if:" },
      {
        kind: "ul",
        items: [
          "You violate these Terms",
          "You engage in fraudulent or illegal activity",
          "Your account has been inactive for 3 years (after notice)",
          "We are required to do so by law",
        ],
      },
    ],
  },
  {
    id: "subscriptions",
    title: "5. Subscription Plans and Billing",
    blocks: [
      { kind: "h3", text: "5.1 Subscription Tiers" },
      { kind: "p", text: "Free Plan:" },
      {
        kind: "ul",
        items: [
          "Basic Proven Path features",
          "Self-assessment tools",
          "Limited verified references (3)",
          "No payment required",
        ],
      },
      { kind: "p", text: "Professional Plan ($9.99/month):" },
      {
        kind: "ul",
        items: [
          "All Free features",
          "Unlimited verified references",
          "AI-powered development plans",
          "Public profile page",
          "Priority support",
           "7-day free trial available",
        ],
      },
      { kind: "p", text: "Team Plan ($29/user/month, billed monthly):" },
      {
        kind: "ul",
        items: [
          "All Professional features",
          "Interview scoring module",
          "360° performance reviews",
          "Team analytics dashboard",
          "Custom skill matrices",
          "Manager tools",
          "Minimum 10 users required",
        ],
      },
      { kind: "p", text: "Enterprise Plan (Custom Pricing):" },
      {
        kind: "ul",
        items: [
          "All Team features",
          "HRIS integrations (BambooHR, Workday, Gusto, etc.)",
          "SSO and advanced security",
          "Dedicated account manager",
          "Custom workflows and API access",
          "SLA guarantee",
        ],
      },
      { kind: "h3", text: "5.2 Billing and Payment" },
      { kind: "p", text: "Payment Terms:" },
      {
        kind: "ul",
        items: [
          "Professional and Team subscriptions are billed monthly in advance",
          "Payment is due immediately upon subscription",
          "We accept credit cards, PayPal, and invoicing (Enterprise only)",
          "All fees are in USD unless otherwise stated",
        ],
      },
      { kind: "p", text: "Automatic Renewal:" },
      {
        kind: "ul",
        items: [
          "Subscriptions automatically renew unless cancelled",
          "You will be charged at the then-current rate",
          "We will notify you of price changes at least 30 days in advance",
        ],
      },
      { kind: "p", text: "Taxes:" },
      {
        kind: "ul",
        items: [
          "Fees do not include applicable taxes (GST, HST, VAT, sales tax)",
          "You are responsible for all taxes associated with your subscription",
          "We will collect taxes where required by law",
        ],
      },
      { kind: "h3", text: "5.3 Free Trials" },
      {
        kind: "ul",
        items: [
          "Professional Plan includes a 7-day free trial",
          "You will not be charged during the trial period",
          "Your subscription begins automatically after the trial unless cancelled",
          "Only one free trial per user",
        ],
      },
      { kind: "h3", text: "5.4 Refunds" },
      {
        kind: "ul",
        items: [
          "Monthly Subscriptions: No refunds for partial months",
          "Enterprise Subscriptions: Refund terms specified in your contract",
          "Refunds are processed within 10 business days",
        ],
      },
      { kind: "h3", text: "5.5 Cancellation" },
      { kind: "p", text: "You may cancel your subscription at any time:" },
      {
        kind: "ul",
        items: [
          "Monthly subscriptions: Access continues until the end of the billing period",
          "No refunds for unused time (except as specified in Section 5.4)",
          "To cancel: Go to Account Settings → Billing → Cancel Subscription",
        ],
      },
      { kind: "h3", text: "5.6 Downgrades" },
      {
        kind: "ul",
        items: [
          "You may downgrade to a lower-tier plan at any time",
          "Downgrades take effect at the end of your current billing period",
          "You may lose access to premium features upon downgrade",
          "Data associated with premium features will be retained for 90 days",
        ],
      },
      { kind: "h3", text: "5.7 Payment Failures" },
      { kind: "p", text: "If your payment fails:" },
      {
        kind: "ul",
        items: [
          "We will attempt to charge your payment method up to 3 times",
          "You will receive email notifications of failed payments",
          "Your account may be suspended after 7 days of non-payment",
          "Your account may be terminated after 30 days of non-payment",
        ],
      },
    ],
  },
  {
    id: "use",
    title: "6. Use of the Platform",
    blocks: [
      { kind: "h3", text: "6.1 License Grant" },
      { kind: "p", text: "Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to:" },
      {
        kind: "ul",
        items: [
          "Access and use the Platform for your personal or internal business purposes",
          "Create and maintain your Proven Path",
          "Use our AI-powered tools and features",
          "Export your data in standard formats",
        ],
      },
      { kind: "h3", text: "6.2 Acceptable Use" },
      { kind: "p", text: "You agree to use ProvenPath only for lawful purposes and in accordance with these Terms. You agree NOT to:" },
      { kind: "p", text: "Prohibited Activities:" },
      {
        kind: "ul",
        items: [
          "Violate any applicable laws or regulations",
          "Infringe on intellectual property rights of others",
          "Upload malicious code, viruses, or harmful software",
          "Attempt to gain unauthorized access to the Platform or other users' accounts",
          "Interfere with or disrupt the Platform's operation",
          "Use automated tools (bots, scrapers) without our written permission",
          "Reverse engineer, decompile, or disassemble the Platform",
          "Remove or modify any proprietary notices or labels",
          "Use the Platform to harass, abuse, or harm others",
          "Submit false, misleading, or fraudulent information",
          "Impersonate any person or entity",
          "Sell, rent, or lease access to the Platform",
          "Use the Platform for competitive analysis or to build a competing product",
        ],
      },
      { kind: "p", text: "Content Restrictions:" },
      {
        kind: "ul",
        items: [
          "Do not upload illegal, offensive, or inappropriate content",
          "Do not share confidential information without authorization",
          "Do not post spam, advertisements, or promotional content",
          "Do not include personally identifiable information of others without consent",
        ],
      },
      { kind: "h3", text: "6.3 Employer-Provided Accounts" },
      { kind: "p", text: "If your employer provides your ProvenPath account:" },
      {
        kind: "ul",
        items: [
          "Your employer may access your performance data during your employment",
          "Your employer's policies may apply in addition to these Terms",
          "You retain ownership of your Proven Path upon termination of employment",
          "Your employer cannot access your Proven Path after you leave without your permission",
        ],
      },
    ],
  },
  {
    id: "ip",
    title: "7. Content and Intellectual Property",
    blocks: [
      { kind: "h3", text: "7.1 Your Content" },
      { kind: "p", text: "You retain ownership of all content you submit to ProvenPath, including:" },
      {
        kind: "ul",
        items: [
          "Performance reviews and feedback",
          "Self-assessments and career goals",
          "Profile information and biographical data",
          "Documents and files you upload",
        ],
      },
      { kind: "p", text: "License to ProvenPath: By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to:" },
      {
        kind: "ul",
        items: [
          "Store, process, and display your content",
          "Generate AI-powered insights and recommendations",
          "Create aggregated, anonymized analytics",
          "Provide the Services to you and your employer (if applicable)",
        ],
      },
      { kind: "p", text: "This license terminates when you delete your content or close your account, except for:" },
      {
        kind: "ul",
        items: [
          "Content shared with others (e.g., verified references)",
          "Aggregated, anonymized data that cannot identify you",
          "Content we are required to retain by law",
        ],
      },
      { kind: "h3", text: "7.2 ProvenPath Intellectual Property" },
      { kind: "p", text: "The Platform and all its content, features, and functionality are owned by ProvenPath and protected by:" },
      {
        kind: "ul",
        items: [
          "Copyright, trademark, and patent laws",
          "International intellectual property treaties",
          "Other proprietary rights",
        ],
      },
      { kind: "p", text: "You may not:" },
      {
        kind: "ul",
        items: [
          "Copy, modify, or create derivative works of the Platform",
          "Use our trademarks, logos, or branding without written permission",
          "Frame or mirror any part of the Platform",
          "Use our intellectual property for commercial purposes",
        ],
      },
      { kind: "h3", text: "7.3 Feedback" },
      { kind: "p", text: "If you provide feedback, suggestions, or ideas about ProvenPath:" },
      {
        kind: "ul",
        items: [
          "We may use your feedback without obligation to you",
          "You grant us a perpetual, irrevocable, royalty-free license to use your feedback",
          "We are not required to keep your feedback confidential",
        ],
      },
      { kind: "h3", text: "7.4 Third-Party Content" },
      { kind: "p", text: "The Platform may include content from third parties, including:" },
      {
        kind: "ul",
        items: [
          "Employer-provided skill matrices and career frameworks",
          "Integration data from HRIS systems",
          "Clear.me identity verification results",
        ],
      },
      { kind: "p", text: "We do not endorse or assume responsibility for third-party content." },
    ],
  },
  {
    id: "ai",
    title: "8. AI-Powered Features",
    blocks: [
      { kind: "h3", text: "8.1 AI Development Plans" },
      { kind: "p", text: "ProvenPath uses artificial intelligence to generate personalized career development recommendations based on:" },
      {
        kind: "ul",
        items: [
          "Your performance review history",
          "Skill assessments and gaps",
          "Career goals and aspirations",
          "Industry benchmarks and best practices",
        ],
      },
      { kind: "p", text: "Important Disclaimers:" },
      {
        kind: "ul",
        items: [
          "AI recommendations are guidance, not professional career advice",
          "AI-generated plans should be reviewed by you and your manager",
          "We do not guarantee specific career outcomes from following AI recommendations",
          "AI predictions are probabilistic and may not be accurate in all cases",
        ],
      },
      { kind: "h3", text: "8.2 Promotion Readiness Predictions" },
      { kind: "p", text: "Our AI analyzes your performance data to predict promotion readiness. These predictions:" },
      {
        kind: "ul",
        items: [
          "Are based on historical patterns and statistical models",
          "Should be considered alongside human judgment",
          "Do not make final promotion decisions (humans do)",
          "May not account for all relevant factors",
        ],
      },
      { kind: "h3", text: "8.3 Your Rights Regarding AI" },
      { kind: "p", text: "You have the right to:" },
      {
        kind: "ul",
        items: [
          "Understand how AI decisions are made (upon request)",
          "Contest AI-generated recommendations",
          "Request human review of automated decisions",
          "Opt out of certain AI features (may limit functionality)",
        ],
      },
      { kind: "h3", text: "8.4 AI Limitations" },
      { kind: "p", text: "You acknowledge that:" },
      {
        kind: "ul",
        items: [
          "AI is not perfect and may make errors",
          "AI recommendations are based on available data and may be incomplete",
          "We continuously improve our AI models but cannot guarantee accuracy",
          "You are responsible for your own career decisions",
        ],
      },
    ],
  },
  {
    id: "data-ownership",
    title: "9. Data Ownership and Portability",
    blocks: [
      { kind: "h3", text: "9.1 Your Data Ownership" },
      { kind: "p", text: "You own your Proven Path data. This includes:" },
      {
        kind: "ul",
        items: [
          "Performance reviews and feedback you receive",
          "Skill assessments and career progression history",
          "AI-generated development plans",
          "Verified references and achievements",
        ],
      },
      { kind: "h3", text: "9.2 Employer Data Rights" },
      { kind: "p", text: "If you use ProvenPath through your employer:" },
      {
        kind: "ul",
        items: [
          "Your employer licenses access to your performance data during employment",
          "Your employer may retain historical performance data for their records",
          "You retain full ownership and control of your Proven Path",
          "Upon termination, your employer cannot access your Proven Path without your permission",
        ],
      },
      { kind: "h3", text: "9.3 Data Portability" },
      { kind: "p", text: "You have the right to:" },
      {
        kind: "ul",
        items: [
          "Export your Proven Path in standard formats (JSON, PDF)",
          "Transfer your verified performance history to new employers",
          "Download all your personal data at any time",
          "Share your Proven Path with prospective employers",
        ],
      },
      { kind: "h3", text: "9.4 Data Deletion" },
      { kind: "p", text: "You may request deletion of your data at any time, subject to:" },
      {
        kind: "ul",
        items: [
          "Legal retention requirements (tax, employment, regulatory)",
          "Employer retention policies for historical performance data",
          "Aggregated, anonymized data that cannot identify you",
        ],
      },
      { kind: "p", text: "To request data deletion: Contact privacy@provenpath.app" },
    ],
  },
  {
    id: "privacy-security",
    title: "10. Privacy and Data Security",
    blocks: [
      { kind: "h3", text: "10.1 Privacy Policy" },
      { kind: "p", text: "Our collection, use, and disclosure of your personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference." },
      { kind: "h3", text: "10.2 Data Security" },
      { kind: "p", text: "We implement industry-standard security measures, including:" },
      {
        kind: "ul",
        items: [
          "Encryption of data in transit (TLS/SSL) and at rest (AES-256)",
          "Secure authentication and access controls",
          "Regular security audits and penetration testing",
          "Incident response and breach notification procedures",
        ],
      },
      { kind: "p", text: "However, no system is 100% secure. You acknowledge that:" },
      {
        kind: "ul",
        items: [
          "We cannot guarantee absolute security",
          "You use the Platform at your own risk",
          "You are responsible for protecting your account credentials",
        ],
      },
      { kind: "h3", text: "10.3 Data Breaches" },
      { kind: "p", text: "In the event of a data breach:" },
      {
        kind: "ul",
        items: [
          "We will notify affected users within 72 hours of discovery",
          "We will provide details about the breach and steps we are taking",
          "We will offer assistance and resources to affected users",
          "We will cooperate with law enforcement and regulatory authorities",
        ],
      },
      { kind: "h3", text: "10.4 Third-Party Services" },
      { kind: "p", text: "We use trusted third-party services, including:" },
      {
        kind: "ul",
        items: [
          "Clear.me for identity verification and background checks",
          "Cloud hosting providers for data storage and infrastructure",
          "Email service providers for transactional and marketing emails",
          "Payment processors (Stripe, PayPal) for subscription billing",
        ],
      },
      { kind: "p", text: "These third parties are contractually obligated to protect your information." },
    ],
  },
  {
    id: "identity",
    title: "11. Identity Verification (Clear.me Integration)",
    blocks: [
      { kind: "h3", text: "11.1 Clear.me Services" },
      { kind: "p", text: "ProvenPath integrates with Clear.me to provide identity verification and background check services. By using this feature:" },
      {
        kind: "ul",
        items: [
          "You authorize Clear.me to verify your identity",
          "You consent to Clear.me's terms of service and privacy policy",
          "You understand that Clear.me processes your personal information independently",
        ],
      },
      { kind: "h3", text: "11.2 Verification Process" },
      { kind: "p", text: "Identity verification may include:" },
      {
        kind: "ul",
        items: [
          "Government-issued identification verification",
          "Employment history verification",
          "Background checks (with your consent)",
          "Criminal record checks (where permitted by law)",
        ],
      },
      { kind: "h3", text: "11.3 Verification Results" },
      {
        kind: "ul",
        items: [
          "Verification results are provided to you and your prospective employer (if applicable)",
          "ProvenPath does not store copies of your government-issued ID",
          "Clear.me retains verification data according to their policies",
          "You may request a copy of your verification results from Clear.me",
        ],
      },
      { kind: "h3", text: "11.4 Verification Fees" },
      {
        kind: "ul",
        items: [
          "Identity verification may incur additional fees",
          "Fees are disclosed before you initiate verification",
          "Verification fees are non-refundable once processing begins",
        ],
      },
    ],
  },
  {
    id: "integrations",
    title: "12. Third-Party Integrations",
    blocks: [
      { kind: "h3", text: "12.1 HRIS Integrations" },
      { kind: "p", text: "ProvenPath integrates with third-party HRIS systems, including:" },
      {
        kind: "ul",
        items: ["BambooHR", "Workday", "Gusto", "Dayforce", "PeopleForce", "Remote"],
      },
      { kind: "p", text: "By enabling integrations:" },
      {
        kind: "ul",
        items: [
          "You authorize data exchange between ProvenPath and the third-party system",
          "You are responsible for maintaining your third-party account credentials",
          "You agree to the third party's terms of service and privacy policy",
        ],
      },
      { kind: "h3", text: "12.2 LinkedIn Integration" },
      { kind: "p", text: "If you connect your LinkedIn account:" },
      {
        kind: "ul",
        items: [
          "We will import your profile information (with your permission)",
          "We do not post to LinkedIn without your explicit consent",
          "You may disconnect LinkedIn at any time",
        ],
      },
      { kind: "h3", text: "12.3 Third-Party Responsibility" },
      {
        kind: "ul",
        items: [
          "We are not responsible for third-party services or their availability",
          "Third-party integrations may be discontinued at any time",
          "We do not endorse or guarantee third-party services",
        ],
      },
    ],
  },
  {
    id: "disclaimers",
    title: "13. Disclaimers and Limitations of Liability",
    blocks: [
      { kind: "h3", text: "13.1 Disclaimer of Warranties" },
      { kind: "p", text: 'THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:' },
      {
        kind: "ul",
        items: [
          "Merchantability: We do not warrant that the Platform is suitable for your purposes",
          "Fitness for a Particular Purpose: We do not guarantee specific outcomes",
          "Non-Infringement: We do not warrant that the Platform does not infringe third-party rights",
          "Accuracy: We do not guarantee the accuracy, completeness, or reliability of content",
          "Availability: We do not guarantee uninterrupted or error-free access",
          "Security: We do not guarantee that the Platform is free from viruses or harmful code",
        ],
      },
      { kind: "p", text: "YOU USE THE PLATFORM AT YOUR OWN RISK." },
      { kind: "h3", text: "13.2 Limitation of Liability" },
      { kind: "p", text: "TO THE MAXIMUM EXTENT PERMITTED BY LAW, PROVENPATH AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AND AFFILIATES SHALL NOT BE LIABLE FOR:" },
      {
        kind: "ul",
        items: [
          "Indirect Damages: Including lost profits, lost data, or business interruption",
          "Consequential Damages: Arising from your use or inability to use the Platform",
          "Incidental Damages: Related to the Platform or these Terms",
          "Punitive Damages: Even if we have been advised of the possibility of such damages",
        ],
      },
      { kind: "p", text: "TOTAL LIABILITY CAP: Our total liability to you for all claims arising from or related to the Platform shall not exceed the greater of:" },
      {
        kind: "ul",
        items: [
          "The amount you paid to ProvenPath in the 12 months preceding the claim, or",
          "$100 USD",
        ],
      },
      { kind: "h3", text: "13.3 Exceptions" },
      { kind: "p", text: "Some jurisdictions do not allow the exclusion of certain warranties or limitation of liability. In such jurisdictions, our liability is limited to the maximum extent permitted by law." },
      { kind: "h3", text: "13.4 Career Outcomes" },
      { kind: "p", text: "WE DO NOT GUARANTEE:" },
      {
        kind: "ul",
        items: [
          "Career advancement or promotion",
          "Salary increases or bonuses",
          "Job offers or employment opportunities",
          "Specific career outcomes from using the Platform",
        ],
      },
      { kind: "p", text: "Your career success depends on many factors beyond our control." },
    ],
  },
  {
    id: "indemnification",
    title: "14. Indemnification",
    blocks: [
      { kind: "p", text: "You agree to indemnify, defend, and hold harmless ProvenPath and its officers, directors, employees, agents, and affiliates from and against any claims, liabilities, damages, losses, costs, or expenses (including reasonable attorneys' fees) arising from or related to:" },
      {
        kind: "ul",
        items: [
          "Your use or misuse of the Platform",
          "Your violation of these Terms",
          "Your violation of any law or regulation",
          "Your violation of any third-party rights (including intellectual property rights)",
          "Content you submit to the Platform",
          "Your negligence or willful misconduct",
        ],
      },
      { kind: "p", text: "We reserve the right to assume exclusive defense and control of any matter subject to indemnification, and you agree to cooperate with our defense." },
    ],
  },
  {
    id: "disputes",
    title: "15. Dispute Resolution",
    blocks: [
      { kind: "h3", text: "15.1 Governing Law" },
      { kind: "p", text: "These Terms are governed by the laws of the Province of Ontario, Canada, without regard to conflict of law principles." },
      { kind: "h3", text: "15.2 Jurisdiction" },
      { kind: "p", text: "You agree to submit to the exclusive jurisdiction of the courts located in Toronto, Ontario, Canada for resolution of any disputes." },
      { kind: "h3", text: "15.3 Informal Resolution" },
      { kind: "p", text: "Before filing a claim, you agree to contact us at legal@provenpath.app to attempt to resolve the dispute informally. We will attempt to resolve disputes within 30 days." },
      { kind: "h3", text: "15.4 Arbitration (Optional)" },
      { kind: "p", text: "If informal resolution fails, either party may elect binding arbitration under the rules of the ADR Institute of Canada. Arbitration will be conducted in Toronto, Ontario, Canada." },
      { kind: "p", text: "Arbitration Terms:" },
      {
        kind: "ul",
        items: [
          "Arbitration is binding and final",
          "Each party bears its own costs and fees",
          "The arbitrator's decision may be entered as a judgment in any court",
          "Class action waiver: You agree to arbitrate disputes individually, not as a class action",
        ],
      },
      { kind: "h3", text: "15.5 Exceptions to Arbitration" },
      { kind: "p", text: "Either party may seek injunctive relief in court for:" },
      {
        kind: "ul",
        items: [
          "Intellectual property infringement",
          "Unauthorized access to the Platform",
          "Violations of these Terms requiring immediate action",
        ],
      },
      { kind: "h3", text: "15.6 Time Limitation" },
      { kind: "p", text: "You must bring any claim within one (1) year of the date the claim arose, or the claim is permanently barred." },
    ],
  },
  {
    id: "termination",
    title: "16. Termination",
    blocks: [
      { kind: "h3", text: "16.1 Termination by You" },
      { kind: "p", text: "You may terminate your account at any time by:" },
      {
        kind: "ul",
        items: [
          "Going to Account Settings → Delete Account",
          "Contacting support@provenpath.app",
          "Following the account closure process",
        ],
      },
      { kind: "p", text: "Upon termination:" },
      {
        kind: "ul",
        items: [
          "Your subscription will be cancelled (no refunds for unused time)",
          "You will lose access to the Platform immediately",
          "You may export your Proven Path before closing your account",
          "We will retain your data according to our Privacy Policy and legal requirements",
        ],
      },
      { kind: "h3", text: "16.2 Termination by ProvenPath" },
      { kind: "p", text: "We may suspend or terminate your account immediately, without notice, if:" },
      {
        kind: "ul",
        items: [
          "You violate these Terms",
          "You engage in fraudulent, illegal, or harmful activity",
          "Your account has been inactive for 3 years (after notice)",
          "We are required to do so by law",
          "We discontinue the Platform (with 90 days' notice)",
        ],
      },
      { kind: "h3", text: "16.3 Effect of Termination" },
      { kind: "p", text: "Upon termination:" },
      {
        kind: "ul",
        items: [
          "All licenses granted to you under these Terms immediately terminate",
          "You must cease all use of the Platform",
          "Sections that by their nature should survive termination will survive (including Sections 7, 9, 13, 14, 15, and 17)",
        ],
      },
      { kind: "h3", text: "16.4 Data Retention After Termination" },
      { kind: "p", text: "After account termination:" },
      {
        kind: "ul",
        items: [
          "We will retain your data for 90 days to allow for account recovery",
          "After 90 days, we will delete your data (subject to legal retention requirements)",
          "Aggregated, anonymized data may be retained indefinitely",
          "Employer-retained data is subject to employer retention policies",
        ],
      },
    ],
  },
  {
    id: "general",
    title: "17. General Provisions",
    blocks: [
      { kind: "h3", text: "17.1 Entire Agreement" },
      { kind: "p", text: "These Terms, together with our Privacy Policy, constitute the entire agreement between you and ProvenPath regarding the Platform and supersede all prior agreements." },
      { kind: "h3", text: "17.2 Amendments" },
      { kind: "p", text: "We may modify these Terms at any time by:" },
      {
        kind: "ul",
        items: [
          "Posting the updated Terms on the Platform",
          'Updating the "Last Updated" date at the top',
          "Notifying you via email or Platform notification (for material changes)",
        ],
      },
      { kind: "p", text: "Your continued use of the Platform after changes constitutes acceptance of the modified Terms." },
      { kind: "p", text: "If you do not agree to the changes, you must stop using the Platform and close your account." },
      { kind: "h3", text: "17.3 Waiver" },
      { kind: "p", text: "Our failure to enforce any provision of these Terms does not constitute a waiver of that provision or any other provision." },
      { kind: "h3", text: "17.4 Severability" },
      { kind: "p", text: "If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will remain in full force and effect." },
      { kind: "h3", text: "17.5 Assignment" },
      { kind: "p", text: "You may not assign or transfer these Terms or your account without our written consent. We may assign these Terms to any affiliate or successor without your consent." },
      { kind: "h3", text: "17.6 Force Majeure" },
      { kind: "p", text: "We are not liable for any failure or delay in performance due to circumstances beyond our reasonable control, including:" },
      {
        kind: "ul",
        items: [
          "Natural disasters (earthquakes, floods, fires)",
          "Acts of war or terrorism",
          "Government actions or regulations",
          "Internet or telecommunications failures",
          "Pandemics or public health emergencies",
        ],
      },
      { kind: "h3", text: "17.7 No Agency" },
      { kind: "p", text: "These Terms do not create any agency, partnership, joint venture, or employment relationship between you and ProvenPath." },
      { kind: "h3", text: "17.8 Third-Party Beneficiaries" },
      { kind: "p", text: "These Terms do not confer any third-party beneficiary rights." },
      { kind: "h3", text: "17.9 Export Compliance" },
      { kind: "p", text: 'You agree to comply with all applicable export and import laws and regulations. You represent that you are not located in a country subject to a U.S. or Canadian government embargo or designated as a "terrorist supporting" country.' },
      { kind: "h3", text: "17.10 Language" },
      { kind: "p", text: "These Terms are written in English. Any translations are provided for convenience only. In the event of a conflict, the English version prevails." },
    ],
  },
  {
    id: "contact",
    title: "18. Contact Information",
    blocks: [
      { kind: "p", text: "If you have questions, concerns, or disputes regarding these Terms:" },
      { kind: "p", text: "ProvenPath — Email: legal@provenpath.app · Support: info@provenpath.app · Response Time: We will respond to inquiries within 5 business days." },
    ],
  },
  {
    id: "acknowledgment",
    title: "19. Acknowledgment",
    blocks: [
      { kind: "p", text: "BY USING PROVENPATH, YOU ACKNOWLEDGE THAT:" },
      {
        kind: "ul",
        items: [
          "You have read, understood, and agree to be bound by these Terms",
          "You have read and agree to our Privacy Policy",
          "You are at least 16 years old",
          "You have the authority to enter into these Terms",
          "You will comply with all applicable laws and regulations",
        ],
      },
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

export default function Terms() {
  useDocumentMeta({
    title: "Terms of Service — Proven Path",
    description:
      "Read the Proven Path terms of service. Understand the rules and agreements that govern your use of our HR performance intelligence platform.",
    ogImage: "opengraph.jpg",
    canonicalPath: "/terms",
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
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms of Service</h1>
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
