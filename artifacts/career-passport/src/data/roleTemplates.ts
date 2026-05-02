export interface SkillCategory {
  category: string;
  skills: string[];
}

export interface RoleLevelTemplate {
  level: string;
  levelLabel: string;
  categories: SkillCategory[];
}

export interface RoleTemplate {
  role: string;
  roleLabel: string;
  levels: RoleLevelTemplate[];
}

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    role: "designer",
    roleLabel: "UX Designer",
    levels: [
      {
        level: "junior",
        levelLabel: "Junior Designer",
        categories: [
          { category: "UX Design", skills: ["Basic wireframing", "Familiar with Figma/Sketch", "Understands design principles"] },
          { category: "UX Research", skills: ["Knows basics of user research", "Can conduct simple interviews"] },
          { category: "Visual Design", skills: ["Basic typography", "Color theory understanding"] },
          { category: "Collaboration", skills: ["Asks questions", "Accepts feedback", "Basic communication"] },
          { category: "Technical", skills: ["Basic computer skills", "Familiar with design tools"] },
        ],
      },
      {
        level: "intermediate",
        levelLabel: "Intermediate Designer",
        categories: [
          { category: "UX Design", skills: ["Creates wireframes/prototypes independently", "Familiar with design systems"] },
          { category: "UX Research", skills: ["Conducts user interviews", "Usability testing basics", "Card sorting"] },
          { category: "Visual Design", skills: ["Strong typography", "Creates visual hierarchies", "Design for accessibility"] },
          { category: "Collaboration", skills: ["Works with cross-functional teams", "Gives constructive feedback"] },
          { category: "Technical", skills: ["Prototyping tools", "Basic HTML/CSS understanding"] },
        ],
      },
      {
        level: "senior",
        levelLabel: "Senior Designer",
        categories: [
          { category: "UX Design", skills: ["Leads end-to-end design projects", "Creates design systems", "Mentors juniors"] },
          { category: "UX Research", skills: ["Advanced research methods", "Data analysis", "Presents to stakeholders"] },
          { category: "Visual Design", skills: ["Expert level visual design", "Brand consistency", "Motion design basics"] },
          { category: "Collaboration", skills: ["Influences product strategy", "Cross-team leadership", "Conflict resolution"] },
          { category: "Technical", skills: ["Frontend dev collaboration", "API understanding", "Design handoff"] },
        ],
      },
      {
        level: "principal",
        levelLabel: "Principal Designer",
        categories: [
          { category: "UX Design", skills: ["Sets design direction for product area", "Builds design culture", "Innovation"] },
          { category: "UX Research", skills: ["Research strategy", "Builds research ops", "Influences company strategy"] },
          { category: "Visual Design", skills: ["Brand leadership", "Design language systems", "Executive presence"] },
          { category: "Collaboration", skills: ["Org-wide influence", "Builds design team", "Partners with leadership"] },
          { category: "Technical", skills: ["Technical architecture", "System design", "Mentors technical designers"] },
        ],
      },
    ],
  },
  {
    role: "pm",
    roleLabel: "Product Manager",
    levels: [
      {
        level: "junior",
        levelLabel: "Associate PM (APM)",
        categories: [
          { category: "Product Discovery", skills: ["Writes user stories", "Basic market research", "Feature specification"] },
          { category: "Data & Analytics", skills: ["Metrics understanding", "Basic SQL", "Dashboard usage"] },
          { category: "Collaboration", skills: ["Works with design/eng", "Stakeholder communication", "Team rituals"] },
          { category: "Communication", skills: ["Writes product docs", "Presents to small groups", "Meeting facilitation"] },
          { category: "Technical", skills: ["Technical literacy", "Reading technical specs", "Basic technical conversations"] },
        ],
      },
      {
        level: "intermediate",
        levelLabel: "Product Manager (PM)",
        categories: [
          { category: "Product Discovery", skills: ["Conducts user research", "Prioritization frameworks", "PRD writing"] },
          { category: "Data & Analytics", skills: ["A/B testing", "Cohort analysis", "Advanced metrics"] },
          { category: "Collaboration", skills: ["Leads cross-functional teams", "Manages stakeholders", "Influences without authority"] },
          { category: "Communication", skills: ["Writes strategy docs", "Presents to leadership", "Negotiation skills"] },
          { category: "Technical", skills: ["Technical deep-dive", "API understanding", "Technical debt awareness"] },
        ],
      },
      {
        level: "senior",
        levelLabel: "Senior PM",
        categories: [
          { category: "Product Discovery", skills: ["Defines product vision", "Market analysis", "Competitive positioning"] },
          { category: "Data & Analytics", skills: ["Predictive analytics", "Data-driven decision making", "Experiment design"] },
          { category: "Collaboration", skills: ["Leads multiple teams", "Program-level communication", "Org influence"] },
          { category: "Communication", skills: ["Influences executives", "Board-level presentations", "Public speaking"] },
          { category: "Technical", skills: ["Architecture decisions", "Technical strategy", "Mentors junior PMs"] },
        ],
      },
      {
        level: "principal",
        levelLabel: "Group PM / Director",
        categories: [
          { category: "Product Discovery", skills: ["Multi-product strategy", "Portfolio management", "Market leadership"] },
          { category: "Data & Analytics", skills: ["Data science integration", "ML/AI product strategy", "Enterprise analytics"] },
          { category: "Collaboration", skills: ["Organization-wide influence", "Cross-functional leadership", "Board visibility"] },
          { category: "Communication", skills: ["C-suite communication", "Investor relations", "Industry thought leadership"] },
          { category: "Technical", skills: ["Technical vision", "Platform strategy", "Technical org partnerships"] },
        ],
      },
    ],
  },
  {
    role: "engineer",
    roleLabel: "Software Engineer",
    levels: [
      {
        level: "junior",
        levelLabel: "Junior Engineer",
        categories: [
          { category: "Programming", skills: ["One language proficiency", "Basic algorithms", "Code syntax"] },
          { category: "Frontend/Backend", skills: ["Understands basic web (HTML/CSS/JS)", "Simple API calls"] },
          { category: "Tools & DevOps", skills: ["Git basics", "IDE usage", "Basic debugging", "CI/CD understanding"] },
          { category: "Collaboration", skills: ["Asks good questions", "Code reviews participation", "Accepts feedback"] },
          { category: "Technical Knowledge", skills: ["CS fundamentals", "Data structures basics", "Security awareness"] },
        ],
      },
      {
        level: "intermediate",
        levelLabel: "Mid-Level Engineer",
        categories: [
          { category: "Programming", skills: ["Multiple languages", "Clean code", "Design patterns"] },
          { category: "Frontend/Backend", skills: ["Full stack development", "Database design", "REST APIs"] },
          { category: "Tools & DevOps", skills: ["Docker basics", "Cloud fundamentals (AWS/GCP)", "Testing frameworks"] },
          { category: "Collaboration", skills: ["Code reviews", "Mentors juniors", "Technical documentation"] },
          { category: "Technical Knowledge", skills: ["System design basics", "Performance optimization", "Security best practices"] },
        ],
      },
      {
        level: "senior",
        levelLabel: "Senior Engineer",
        categories: [
          { category: "Programming", skills: ["Polyglot programming", "Architecture", "Tech debt management"] },
          { category: "Frontend/Backend", skills: ["Microservices", "Scalable systems", "Advanced databases"] },
          { category: "Tools & DevOps", skills: ["Kubernetes", "Infrastructure as Code", "CI/CD pipelines"] },
          { category: "Collaboration", skills: ["Leads technical design reviews", "Cross-team coordination", "Influences product"] },
          { category: "Technical Knowledge", skills: ["System design (high-scale)", "Performance tuning", "Security engineering"] },
        ],
      },
      {
        level: "principal",
        levelLabel: "Principal Engineer / Architect",
        categories: [
          { category: "Programming", skills: ["Language expert", "New technology adoption", "Innovation"] },
          { category: "Frontend/Backend", skills: ["Platform architecture", "Multi-region systems", "Real-time systems"] },
          { category: "Tools & DevOps", skills: ["Cloud architecture", "DevOps culture", "Tooling strategy"] },
          { category: "Collaboration", skills: ["Org-wide technical leadership", "Builds engineering culture", "Board-level tech"] },
          { category: "Technical Knowledge", skills: ["Technical vision", "Industry leadership", "Mentors senior engineers"] },
        ],
      },
    ],
  },
  {
    role: "qa",
    roleLabel: "QA Engineer",
    levels: [
      {
        level: "junior",
        levelLabel: "Junior QA",
        categories: [
          { category: "Testing Fundamentals", skills: ["Test case creation", "Bug reporting", "Test execution"] },
          { category: "Test Automation", skills: ["Basic Selenium/Playwright", "TestNG/JUnit", "CI integration"] },
          { category: "Tools", skills: ["JIRA usage", "Test management tools", "Browser dev tools"] },
          { category: "Collaboration", skills: ["Asks clarifying questions", "Good documentation", "Test review participation"] },
          { category: "Technical", skills: ["Basic SQL", "OS differences", "Mobile/web testing basics"] },
        ],
      },
      {
        level: "intermediate",
        levelLabel: "Mid-Level QA",
        categories: [
          { category: "Testing Fundamentals", skills: ["Risk-based testing", "Test strategy", "Exploratory testing"] },
          { category: "Test Automation", skills: ["API automation", "Framework building", "Performance testing basics"] },
          { category: "Tools", skills: ["Automation frameworks", "CI/CD pipelines", "Test management systems"] },
          { category: "Collaboration", skills: ["Works with devs on bug resolution", "Peer reviews", "Cross-team testing"] },
          { category: "Technical", skills: ["SQL proficiency", "API testing (Postman)", "Security testing basics"] },
        ],
      },
      {
        level: "senior",
        levelLabel: "Senior QA",
        categories: [
          { category: "Testing Fundamentals", skills: ["Test strategy for products", "Quality metrics", "Test automation lead"] },
          { category: "Test Automation", skills: ["Performance testing", "Security testing", "CI/CD optimization"] },
          { category: "Tools", skills: ["DevOps integration", "Test environment management", "Test data automation"] },
          { category: "Collaboration", skills: ["Mentors QA team", "Influences product quality", "Builds testing culture"] },
          { category: "Technical", skills: ["Security testing (OWASP)", "Cloud testing", "Automation architecture"] },
        ],
      },
      {
        level: "principal",
        levelLabel: "Lead QA / QA Architect",
        categories: [
          { category: "Testing Fundamentals", skills: ["QA strategy", "Quality culture", "Organization-wide testing vision"] },
          { category: "Test Automation", skills: ["Platform testing strategy", "AI/ML testing", "Next-gen automation"] },
          { category: "Tools", skills: ["Enterprise test infrastructure", "Tool consolidation", "Vendor evaluation"] },
          { category: "Collaboration", skills: ["Builds QA team", "Partners with leadership", "Industry thought leadership"] },
          { category: "Technical", skills: ["Security strategy", "Performance engineering", "Test data management"] },
        ],
      },
    ],
  },
  {
    role: "pmm",
    roleLabel: "Product Marketing Manager",
    levels: [
      {
        level: "junior",
        levelLabel: "Associate PMM",
        categories: [
          { category: "Content", skills: ["Basic copywriting", "Social media", "Collateral creation"] },
          { category: "Market Research", skills: ["Competitor basics", "Customer persona", "Market sizing"] },
          { category: "Tools", skills: ["CRM basics", "Analytics tools", "Presentation tools"] },
          { category: "Collaboration", skills: ["Works with product/design", "Internal comms", "Event support"] },
          { category: "Communication", skills: ["Writes clear emails", "Small group presentations", "Meeting prep"] },
        ],
      },
      {
        level: "intermediate",
        levelLabel: "PMM",
        categories: [
          { category: "Content", skills: ["Full campaigns", "Case studies", "Sales enablement", "Blog/Articles"] },
          { category: "Market Research", skills: ["Competitive analysis", "Customer insights", "Market trends"] },
          { category: "Tools", skills: ["Marketing automation", "CRM", "Analytics platforms"] },
          { category: "Collaboration", skills: ["Cross-functional leadership", "Sales partnership", "External comms"] },
          { category: "Communication", skills: ["Presents to stakeholders", "Writes strategy", "Media/analyst relations"] },
        ],
      },
      {
        level: "senior",
        levelLabel: "Senior PMM",
        categories: [
          { category: "Content", skills: ["Multi-channel campaigns", "GTM strategy", "Content architecture"] },
          { category: "Market Research", skills: ["Strategic market analysis", "Voice of customer", "Industry trends"] },
          { category: "Tools", skills: ["Enterprise marketing stack", "ABM platforms", "Attribution"] },
          { category: "Collaboration", skills: ["Influences product roadmap", "Leadership presence", "Industry partnerships"] },
          { category: "Communication", skills: ["Executive presentations", "Board communications", "Public speaking"] },
        ],
      },
      {
        level: "principal",
        levelLabel: "Principal PMM / Director",
        categories: [
          { category: "Content", skills: ["Brand strategy", "Content vision", "Industry leadership"] },
          { category: "Market Research", skills: ["Market intelligence strategy", "Forecasting", "Competitive intelligence"] },
          { category: "Tools", skills: ["Marketing technology vision", "Analytics architecture", "Vendor management"] },
          { category: "Collaboration", skills: ["Organization-wide influence", "Builds PMM team", "Executive leadership"] },
          { category: "Communication", skills: ["C-suite communication", "Investor/analyst relations", "Industry thought leadership"] },
        ],
      },
    ],
  },
];

export const SCORE_LABELS: Record<number, { label: string; description: string; color: string }> = {
  1: { label: "Below Expectations", description: "Does not demonstrate this skill", color: "bg-red-100 text-red-800 border-red-200" },
  2: { label: "Approaching", description: "Demonstrates basic understanding", color: "bg-orange-100 text-orange-800 border-orange-200" },
  3: { label: "Meets Expectations", description: "Solid competence for level", color: "bg-blue-100 text-blue-800 border-blue-200" },
  4: { label: "Exceeds", description: "Strong performance above level", color: "bg-purple-100 text-purple-800 border-purple-200" },
  5: { label: "Outstanding", description: "Exceptional, ready for next level", color: "bg-green-100 text-green-800 border-green-200" },
};

export const CANDIDATE_STATUSES = [
  { value: "interviewing", label: "Interviewing", color: "bg-blue-100 text-blue-800" },
  { value: "offered", label: "Offer Extended", color: "bg-purple-100 text-purple-800" },
  { value: "hired", label: "Hired", color: "bg-green-100 text-green-800" },
  { value: "rejected", label: "Not Moving Forward", color: "bg-red-100 text-red-800" },
];

export const CANDIDATE_SOURCES = [
  "LinkedIn", "Referral", "Job Board", "Company Website", "Agency", "Direct Application", "Other",
];

export const OVERALL_RECOMMENDATIONS = [
  { value: "strong_yes", label: "Strong Yes — Hire immediately", color: "bg-green-100 text-green-800" },
  { value: "yes", label: "Yes — Good fit", color: "bg-emerald-100 text-emerald-800" },
  { value: "maybe", label: "Maybe — Further evaluation needed", color: "bg-yellow-100 text-yellow-800" },
  { value: "no", label: "No — Not a fit", color: "bg-red-100 text-red-800" },
];

export function getAllSkillsForTemplate(template: RoleLevelTemplate): string[] {
  return template.categories.flatMap(c => c.skills);
}

export function getTemplate(role: string, level: string): RoleLevelTemplate | undefined {
  return ROLE_TEMPLATES.find(r => r.role === role)?.levels.find(l => l.level === level);
}
