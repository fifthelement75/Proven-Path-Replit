import { motion } from "framer-motion";
import { Link } from "wouter";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/button";
import { fadeIn, staggerContainer } from "@/lib/animations";
import {
  Brain,
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
  Building2,
  Users,
  FileBadge,
  Activity,
  ArrowRight,
  ClipboardCheck,
  LayoutGrid,
  Sparkles,
  Route,
  BadgeCheck,
  Rocket,
  Fingerprint,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      
      <main className="flex-1 pt-16">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-20 pb-32 lg:pt-32 lg:pb-40">
          <Container>
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="max-w-2xl"
              >
                <motion.div
                  variants={fadeIn}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
                >
                  <Building2 size={14} />
                  <span>Built for HR & People Leaders</span>
                </motion.div>
                <motion.h1 
                  variants={fadeIn}
                  className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1] mb-6"
                >
                  <span className="text-gray-900">Performance Intelligence That Powers </span>
                  <span className="animated-gradient-text">Better Hiring, Retention &amp; Growth</span>
                </motion.h1>
                <motion.p 
                  variants={fadeIn}
                  className="text-xl text-gray-600 mb-8 leading-relaxed"
                >
                  Proven Path gives HR teams and people leaders a single source of truth for candidate assessments, performance reviews, and career development—so every hiring and promotion decision is backed by verified data.
                </motion.p>
                <motion.div 
                  variants={fadeIn}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <Link href="/contact">
                    <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base">
                      Book a Demo
                    </Button>
                  </Link>
                  <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-base" onClick={() => document.getElementById('differentiation')?.scrollIntoView({ behavior: 'smooth' })}>
                    See How It Works
                  </Button>
                </motion.div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative"
              >
                {/* Decorative gradient halo */}
                <div className="absolute -inset-6 -z-10 bg-gradient-to-tr from-primary/25 via-success/15 to-warning/15 blur-3xl opacity-70 rounded-full" />

                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white">
                  {/* Browser-style window chrome */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <span className="w-3 h-3 rounded-full bg-red-400" />
                    <span className="w-3 h-3 rounded-full bg-yellow-400" />
                    <span className="w-3 h-3 rounded-full bg-green-400" />
                    <div className="ml-3 flex-1 max-w-xs">
                      <div className="px-3 py-1 rounded-md bg-white border border-gray-200 text-xs text-gray-500 truncate">
                        provenpath.fyi/dashboard
                      </div>
                    </div>
                  </div>

                  {/* Dashboard screenshot */}
                  <div className="bg-white p-3 sm:p-4">
                    <img
                      src={`${import.meta.env.BASE_URL}hero-dashboard.png`}
                      alt="Proven Path performance dashboard showing competency averages, department scores, and score breakdown"
                      className="w-full h-auto block rounded-md"
                    />
                  </div>
                </div>

                {/* Floating "Live data" badge — top-right */}
                <div className="hidden sm:flex absolute -top-4 -right-4 items-center gap-2 px-3 py-2 rounded-xl bg-primary text-white text-sm font-semibold shadow-lg shadow-primary/30 ring-4 ring-white">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span>Live performance data</span>
                </div>

                {/* Floating "Avg Score" badge — bottom-left */}
                <div className="hidden sm:flex absolute -bottom-4 -left-4 items-center gap-3 px-4 py-2.5 rounded-xl bg-white shadow-lg border border-gray-100">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-success/10 text-success">
                    <TrendingUp size={18} />
                  </div>
                  <div className="leading-tight">
                    <div className="text-base font-bold text-gray-900">3.3<span className="text-gray-400 text-xs font-medium">/5 avg</span></div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide">Across 3 teams</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </Container>
        </section>

        {/* PLATFORM DIFFERENTIATION SECTION */}
        <section
          id="differentiation"
          className="relative py-24 border-y border-gray-100 overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50"
        >
          {/* Blue dot grid with radial mask */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.35] [background-image:radial-gradient(rgba(37,99,235,0.18)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]"
          />

          {/* Soft color washes */}
          <div
            aria-hidden
            className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-[120px]"
          />
          <div
            aria-hidden
            className="absolute -bottom-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-indigo-400/20 blur-[120px]"
          />
          <div
            aria-hidden
            className="absolute top-1/2 right-1/3 -translate-y-1/2 w-[22rem] h-[22rem] rounded-full bg-warning/15 blur-[120px]"
          />

          <Container className="relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                What Makes Proven Path Different
              </h2>
              <p className="text-lg text-gray-600">
                Stop relying on gut-feel decisions and disconnected spreadsheets. Build a defensible talent strategy with structured, verified data.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Brain,
                  title: "AI-Powered Talent Insights",
                  description: "Our AI analyzes interview scores, performance reviews, and skill assessments to surface promotion-ready employees, flag retention risks, and recommend targeted development plans."
                },
                {
                  icon: ShieldCheck,
                  title: "Verified Performance Records",
                  description: "Every assessment, review, and reference is captured and verified—giving you confidence in hiring and promotion decisions, and a clean audit trail for your people decisions."
                },
                {
                  icon: TrendingUp,
                  title: "Longitudinal Talent Intelligence",
                  description: "See how your people grow from interview through promotion. Spot high performers early, model succession plans, and benchmark teams against your career ladders."
                }
              ].map((feature, i) => (
                <div
                  key={i}
                  className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl shadow-primary/5 border border-gray-200/80 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-0.5 transition-all"
                >
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                    <feature.icon size={24} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* VALUE PROPOSITION SECTION */}
        <section className="py-24">
          <Container>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                A Performance Platform Your Team Will Actually Use
              </h2>
              <p className="text-lg text-gray-600">
                Designed employer-first, with adoption built in—because your data is only as good as the team that contributes to it.
              </p>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-16">
              {/* For Employers — primary, on the left */}
              <div className="relative">
                <div className="sticky top-24">
                  <div className="mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                      <Building2 className="text-primary" />
                      For Employers
                    </h3>
                    <ul className="space-y-4">
                      {[
                        "Make data-driven hiring and promotion decisions",
                        "Reduce time-to-productivity with structured 360° reviews",
                        "Identify skill gaps and build targeted development plans",
                        "Improve retention with transparent career progression",
                        "Streamline reference checks with verified performance histories",
                        "Plug into your HRIS—no rip-and-replace required"
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-lg text-gray-700">
                          <CheckCircle2 className="text-success shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="relative mt-8">
                    {/* Decorative gradient backdrop */}
                    <div className="absolute -inset-4 -z-10 bg-gradient-to-tr from-primary/20 via-success/10 to-warning/10 blur-2xl opacity-70 rounded-full" />

                    <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white">
                      {/* Browser-style window chrome */}
                      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <span className="w-3 h-3 rounded-full bg-red-400" />
                        <span className="w-3 h-3 rounded-full bg-yellow-400" />
                        <span className="w-3 h-3 rounded-full bg-green-400" />
                        <div className="ml-3 flex-1 max-w-xs">
                          <div className="px-3 py-1 rounded-md bg-white border border-gray-200 text-xs text-gray-500 truncate">
                            provenpath.fyi/candidates/jordan-lee/scorecard
                          </div>
                        </div>
                      </div>

                      {/* Screenshot itself */}
                      <div className="bg-white p-3 sm:p-4">
                        <img
                          src={`${import.meta.env.BASE_URL}interview-scorecard.png`}
                          alt="Verified interview scorecard for a Product Marketing Manager candidate, showing skill ratings and a Strong Yes hire recommendation"
                          className="w-full h-auto block rounded-md"
                        />
                      </div>
                    </div>

                    {/* Floating "Strong Yes" badge */}
                    <div className="hidden sm:flex absolute -top-4 -right-4 items-center gap-2 px-3 py-2 rounded-xl bg-success text-white text-sm font-semibold shadow-lg shadow-success/30 ring-4 ring-white">
                      <CheckCircle2 size={16} />
                      <span>Strong Yes · 4.5/5</span>
                    </div>

                    {/* Floating "AI insights" badge */}
                    <div className="hidden sm:flex absolute -bottom-4 -left-4 items-center gap-2 px-3 py-2 rounded-xl bg-white text-gray-900 text-xs font-semibold shadow-lg border border-gray-100">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span>15 skills scored · AI verified</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* For Employees — secondary, on the right */}
              <div className="relative">
                <div className="sticky top-24">
                  <div className="mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                      <Users className="text-warning" />
                      For Your Employees
                    </h3>
                    <ul className="space-y-4">
                      {[
                        "Personalized AI development plans tied to real performance data",
                        "A verified record of growth that follows them across roles",
                        "Clear visibility into the path to promotion",
                        "Faster, lighter-weight reviews instead of annual paperwork"
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-lg text-gray-700">
                          <CheckCircle2 className="text-success shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-6 text-sm text-gray-500 leading-relaxed">
                      Higher employee engagement means better data for you—and a stronger employer brand when great people talk about your performance process.
                    </p>
                  </div>
                  <div className="relative mt-8">
                    {/* Decorative gradient backdrop */}
                    <div className="absolute -inset-4 -z-10 bg-gradient-to-tr from-warning/20 via-primary/10 to-success/15 blur-2xl opacity-70 rounded-full" />

                    <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white">
                      {/* Browser-style window chrome */}
                      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <span className="w-3 h-3 rounded-full bg-red-400" />
                        <span className="w-3 h-3 rounded-full bg-yellow-400" />
                        <span className="w-3 h-3 rounded-full bg-green-400" />
                        <div className="ml-3 flex-1 max-w-xs">
                          <div className="px-3 py-1 rounded-md bg-white border border-gray-200 text-xs text-gray-500 truncate">
                            provenpath.fyi/me/development-plan
                          </div>
                        </div>
                      </div>

                      {/* Screenshot itself */}
                      <div className="bg-white p-3 sm:p-4">
                        <img
                          src={`${import.meta.env.BASE_URL}dev-plan.png`}
                          alt="Personalized AI development plan with prioritized focus areas, next steps, and recommended resources"
                          className="w-full h-auto block rounded-md"
                        />
                      </div>
                    </div>

                    {/* Floating "AI generated" badge — top-right */}
                    <div className="hidden sm:flex absolute -top-4 -right-4 items-center gap-2 px-3 py-2 rounded-xl bg-warning text-white text-sm font-semibold shadow-lg shadow-warning/30 ring-4 ring-white">
                      <Brain size={16} />
                      <span>AI-generated for you</span>
                    </div>

                    {/* Floating focus area chip — bottom-left */}
                    <div className="hidden sm:flex absolute -bottom-4 -left-4 items-center gap-3 px-4 py-2.5 rounded-xl bg-white shadow-lg border border-gray-100">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
                        <CheckCircle2 size={18} />
                      </div>
                      <div className="leading-tight">
                        <div className="text-sm font-bold text-gray-900">4 focus areas</div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wide">Tied to your reviews</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* BEST FIT CUSTOMER SECTION */}
        <section className="relative py-24 text-white overflow-hidden bg-gradient-to-br from-[#1e293b] via-[#243044] to-[#1e2a3d]">
          {/* Dot grid pattern */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.18] [background-image:radial-gradient(rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:22px_22px]"
          />

          {/* Soft radial glows */}
          <div
            aria-hidden
            className="absolute -top-40 -left-32 w-[28rem] h-[28rem] rounded-full bg-primary/30 blur-[120px]"
          />
          <div
            aria-hidden
            className="absolute -bottom-40 -right-32 w-[28rem] h-[28rem] rounded-full bg-success/25 blur-[120px]"
          />
          <div
            aria-hidden
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[36rem] rounded-full bg-warning/10 blur-[140px]"
          />

          {/* Top + bottom edge fades for smooth section blending */}
          <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <Container className="relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-medium text-white/80 mb-5 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Who we're built for
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Built For Forward-Thinking Companies
              </h2>
              <p className="text-lg text-gray-300">
                If you care about how you hire, develop, and retain your people, Proven Path was built for you.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: "SMB HR Teams (50–500 employees)",
                  desc: "Growing companies that need modern performance management without enterprise complexity or six-figure HRIS overhauls."
                },
                {
                  title: "High-Growth Startups (Pre-seed to Series B)",
                  desc: "Fast-scaling teams that need scalable talent assessment, structured interview loops, and clear career ladders from day one."
                },
                {
                  title: "Professional Services Firms",
                  desc: "Consulting firms, agencies, and fractional talent platforms where verified credentials and utilization data drive every staffing decision."
                },
                {
                  title: "People-First Tech Companies",
                  desc: "Engineering, design, and product teams that care about transparent growth paths and want a performance system their people will actually adopt."
                }
              ].map((profile, i) => (
                <div
                  key={i}
                  className="relative bg-white/[0.04] backdrop-blur-sm p-6 rounded-xl border border-white/10 hover:border-primary/40 hover:bg-white/[0.06] transition-colors"
                >
                  <h3 className="text-xl font-semibold mb-3">{profile.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{profile.desc}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* PRODUCT FEATURES SECTION */}
        <section className="py-24 bg-gray-50">
          <Container>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Everything Your People Team Needs in One Platform
              </h2>
              <p className="text-lg text-gray-600">
                From the first interview to the next promotion—structured, verified, and integrated with your HRIS.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: ClipboardCheck, title: "Interview Scoring", desc: "Standardized rubrics and structured candidate assessments from day one" },
                { icon: Users, title: "360° Reviews", desc: "Self, peer, and manager evaluations consolidated in one place" },
                { icon: LayoutGrid, title: "Skill Matrix", desc: "Track hard and soft skills against your career levels and ladders" },
                { icon: Sparkles, title: "AI Development Plans", desc: "Personalized recommendations grounded in each employee's data" },
                { icon: Route, title: "Career Timelines", desc: "Visual progression from junior IC to leadership across your org" },
                { icon: BadgeCheck, title: "Verified References", desc: "Convert internal feedback into portable, audit-ready references" },
                { icon: Rocket, title: "Promotion Readiness", desc: "AI flags which employees are ready for the next level—and why" },
                { icon: Fingerprint, title: "Identity Verification", desc: "Secure background checks via Plaid.com integration" },
              ].map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start gap-4 hover:border-primary/30 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                      <Icon size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">{feature.title}</h4>
                      <p className="text-sm text-gray-600">{feature.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Container>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section className="py-24">
          <Container>
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  How It Works
                </h2>
                <p className="text-gray-600 mb-12">
                  Get from disconnected spreadsheets to a single source of talent truth in weeks, not quarters.
                </p>
                
                <div className="space-y-8">
                  {[
                    { step: "1", title: "Set Up Your Org", desc: "Define roles, levels, and career ladders—or import them from your existing HRIS." },
                    { step: "2", title: "Capture Performance", desc: "Run structured interviews, 360° reviews, and skill assessments inside Proven Path." },
                    { step: "3", title: "Surface AI Insights", desc: "Get promotion recommendations, retention risk flags, and personalized development plans." },
                    { step: "4", title: "Make Better People Decisions", desc: "Hire, promote, and develop with verified data—and give employees a portable record they value." }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary text-white font-bold flex items-center justify-center shrink-0">
                        {item.step}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                        <p className="text-gray-600">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="relative">
                {/* Gradient halo */}
                <div
                  aria-hidden
                  className="absolute -inset-4 -z-10 blur-2xl opacity-60 bg-gradient-to-br from-primary/30 via-success/20 to-warning/20 rounded-[2rem]"
                />

                {/* Browser-window card */}
                <div className="relative bg-white rounded-2xl shadow-xl ring-1 ring-gray-200 overflow-hidden">
                  {/* Browser chrome */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/80">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 mx-3 px-3 py-1 rounded-md bg-white border border-gray-200 text-[11px] font-mono text-gray-500 truncate">
                      provenpath.fyi/employees/sarah-chen
                    </div>
                  </div>

                  {/* Screenshot */}
                  <div className="p-3 sm:p-4 bg-white">
                    <img
                      src={`${import.meta.env.BASE_URL}competency-overview.png`}
                      alt="Competency radar and score breakdown for an employee"
                      className="w-full h-auto rounded-lg"
                      loading="lazy"
                    />
                  </div>
                </div>

                {/* Floating badge — top right */}
                <div className="hidden sm:flex absolute -top-3 -right-3 items-center gap-2 bg-primary text-white text-xs font-semibold px-3 py-2 rounded-full shadow-lg">
                  <Activity size={14} />
                  Live competency view
                </div>

                {/* Stat chip — bottom left */}
                <div className="hidden sm:flex absolute -bottom-4 -left-4 items-center gap-2 bg-white border border-gray-200 text-gray-700 text-xs font-medium px-3 py-2 rounded-xl shadow-md">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-success/10 text-success">
                    <TrendingUp size={14} />
                  </span>
                  <span>
                    <span className="font-semibold text-gray-900">5 skills tracked</span>
                    <span className="text-gray-500"> · Updated daily</span>
                  </span>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* SOCIAL PROOF SECTION */}
        <section className="py-24 bg-gray-50 border-y border-gray-100">
          <Container>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Trusted by HR Leaders and the Teams They Build
              </h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  quote: "Proven Path replaced three separate tools and finally gave us one defensible view of our talent pipeline. Our promotion committee meetings are completely different now.",
                  author: "Michael Rodriguez",
                  role: "VP of People, Series B SaaS"
                },
                {
                  quote: "We onboarded 80 managers in two weeks. The structured 360° reviews surfaced retention risks we would have completely missed.",
                  author: "Priya Shah",
                  role: "HR Director, Professional Services Firm"
                },
                {
                  quote: "For the first time, our engineers are excited about review season. Verified, portable records are a real benefit they talk about in our recruiting pipeline.",
                  author: "James Kim",
                  role: "Engineering Manager"
                }
              ].map((testimonial, i) => (
                <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                  <p className="text-gray-700 italic mb-6">"{testimonial.quote}"</p>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* CTA SECTION */}
        <section className="py-24 bg-primary relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 rounded-full border-4 border-white/10" />
          <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 rounded-full border-4 border-white/10" />
          
          <Container className="relative z-10">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Modernize Your Performance Management Today
              </h2>
              <p className="text-xl text-primary-foreground/90 mb-10">
                Join HR teams using Proven Path to hire smarter, develop faster, and retain longer.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/contact">
                  <Button size="lg" variant="secondary" className="h-14 px-10 text-lg bg-white text-primary hover:bg-gray-50">
                    Book a Demo
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button size="lg" variant="outline" className="h-14 px-10 text-lg bg-transparent text-white border-white/40 hover:bg-white/10 hover:text-white">
                    See Pricing <ArrowRight size={18} className="ml-2" />
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-primary-foreground/80 mt-6">
                No credit card required for individual accounts • Custom rollout for teams
              </p>
            </div>
          </Container>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
