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
                  className="text-5xl sm:text-6xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-6"
                >
                  Performance Intelligence That Powers Better Hiring, Retention & Growth
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
                <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-gray-100 bg-gray-50">
                  <img 
                    src={`${import.meta.env.BASE_URL}hero-illustration.png`} 
                    alt="Talent intelligence dashboard for HR teams" 
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Decorative background blur */}
                <div className="absolute -inset-4 -z-10 bg-gradient-to-tr from-primary/20 to-success/20 blur-3xl opacity-50 rounded-full" />
              </motion.div>
            </div>
          </Container>
        </section>

        {/* PLATFORM DIFFERENTIATION SECTION */}
        <section id="differentiation" className="py-24 bg-gray-50 border-y border-gray-100">
          <Container>
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
                <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
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
                  <div className="aspect-[16/9] rounded-2xl overflow-hidden shadow-lg border border-gray-100 mt-8 bg-gray-50">
                    <img 
                      src={`${import.meta.env.BASE_URL}ai-dev-plan.png`} 
                      alt="AI-generated development plans for HR teams" 
                      className="w-full h-full object-cover"
                    />
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
                  <div className="aspect-[16/9] rounded-2xl overflow-hidden shadow-lg border border-gray-100 mt-8">
                    <img 
                      src={`${import.meta.env.BASE_URL}portable-record.png`} 
                      alt="Verified, portable performance record" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* BEST FIT CUSTOMER SECTION */}
        <section className="py-24 bg-gray-900 text-white">
          <Container>
            <div className="text-center max-w-3xl mx-auto mb-16">
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
                <div key={i} className="bg-gray-800 p-6 rounded-xl border border-gray-700">
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
                { title: "Interview Scoring", desc: "Standardized rubrics and structured candidate assessments from day one" },
                { title: "360° Reviews", desc: "Self, peer, and manager evaluations consolidated in one place" },
                { title: "Skill Matrix", desc: "Track hard and soft skills against your career levels and ladders" },
                { title: "AI Development Plans", desc: "Personalized recommendations grounded in each employee's data" },
                { title: "Career Timelines", desc: "Visual progression from junior IC to leadership across your org" },
                { title: "Verified References", desc: "Convert internal feedback into portable, audit-ready references" },
                { title: "Promotion Readiness", desc: "AI flags which employees are ready for the next level—and why" },
                { title: "Identity Verification", desc: "Secure background checks via Clear.me integration" },
              ].map((feature, i) => (
                <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start gap-4 hover:border-primary/30 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">{feature.title}</h4>
                    <p className="text-sm text-gray-600">{feature.desc}</p>
                  </div>
                </div>
              ))}
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
              
              <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
                <div className="space-y-6">
                  {/* Fake UI illustration */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-32 h-4 bg-gray-200 rounded-full" />
                      <div className="w-16 h-4 bg-success/20 rounded-full" />
                    </div>
                    <div className="space-y-2">
                      <div className="w-full h-2 bg-gray-100 rounded-full" />
                      <div className="w-5/6 h-2 bg-gray-100 rounded-full" />
                      <div className="w-4/6 h-2 bg-gray-100 rounded-full" />
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 rounded-full bg-gray-200" />
                      <div>
                        <div className="w-24 h-4 bg-gray-200 rounded-full mb-2" />
                        <div className="w-32 h-3 bg-gray-100 rounded-full" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="w-full h-2 bg-gray-100 rounded-full" />
                      <div className="w-4/6 h-2 bg-gray-100 rounded-full" />
                    </div>
                  </div>
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
