import { motion } from "framer-motion";
import { Link } from "wouter";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/button";
import { fadeIn, staggerContainer } from "@/lib/animations";
import {
  Brain,
  IdCard,
  TrendingUp,
  CheckCircle2,
  Users,
  Target,
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
                <motion.h1 
                  variants={fadeIn}
                  className="text-5xl sm:text-6xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-6"
                >
                  Your Career Growth, Verified and Portable
                </motion.h1>
                <motion.p 
                  variants={fadeIn}
                  className="text-xl text-gray-600 mb-8 leading-relaxed"
                >
                  The only performance platform that tracks your professional journey from interview to promotion—and travels with you to your next opportunity.
                </motion.p>
                <motion.div 
                  variants={fadeIn}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <Link href="/signup">
                    <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base">
                      Start Your Career Journey
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
                    alt="Abstract career progression timeline" 
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
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Brain,
                  title: "AI-Powered Development Plans",
                  description: "Our AI analyzes your performance data and generates personalized, actionable development plans—not generic advice, but specific steps tailored to your career goals and skill gaps."
                },
                {
                  icon: IdCard,
                  title: "Portable Career Record",
                  description: "Your verified performance history travels with you. No more hunting for references or starting from scratch at each new job. Your achievements are permanently documented and transferable."
                },
                {
                  icon: TrendingUp,
                  title: "Longitudinal Tracking",
                  description: "Track your growth from candidate stage through your entire career. See your progression, identify patterns, and prove your value with data."
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
                Transform How You Track and Prove Career Growth
              </h2>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-16">
              <div className="relative">
                <div className="sticky top-24">
                  <div className="mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                      <Users className="text-primary" />
                      For Employees
                    </h3>
                    <ul className="space-y-4">
                      {[
                        "Own your career data—take it with you anywhere",
                        "Get AI-powered guidance for skill development",
                        "Prove your value with verified performance records",
                        "Eliminate reference-hunting when changing jobs"
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-lg text-gray-700">
                          <CheckCircle2 className="text-success shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="aspect-[16/9] rounded-2xl overflow-hidden shadow-lg border border-gray-100 mt-8">
                    <img 
                      src={`${import.meta.env.BASE_URL}portable-record.png`} 
                      alt="Portable Career Record Abstract" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <div className="sticky top-24">
                  <div className="mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                      <Target className="text-warning" />
                      For Employers
                    </h3>
                    <ul className="space-y-4">
                      {[
                        "Make data-driven promotion decisions",
                        "Reduce onboarding time with verified candidate histories",
                        "Identify skill gaps and development needs automatically",
                        "Improve retention with clear career progression paths"
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
                      alt="AI Development Plan Abstract" 
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
                Built For Modern Professionals and Forward-Thinking Companies
              </h2>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: "Tech Professionals",
                  desc: "Software engineers, designers, product managers who change jobs frequently and want to document their growth"
                },
                {
                  title: "SMB HR Teams (50-500 employees)",
                  desc: "Growing companies that need modern performance management without enterprise complexity"
                },
                {
                  title: "Startups (Pre-seed to Series B)",
                  desc: "Fast-growing companies needing scalable talent assessment and clear career ladders"
                },
                {
                  title: "Professional Services Firms",
                  desc: "Consulting firms, agencies, and fractional talent platforms where portable credentials add value"
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
                Everything You Need to Track and Grow Your Career
              </h2>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: "Interview Scoring", desc: "Capture candidate assessments from day one" },
                { title: "360° Reviews", desc: "Self, peer, and manager evaluations in one place" },
                { title: "Skill Matrix", desc: "Track hard and soft skills across career levels" },
                { title: "AI Development Plans", desc: "Personalized recommendations based on your data" },
                { title: "Career Timeline", desc: "Visual progression from junior to leadership" },
                { title: "Verified References", desc: "Convert feedback into portable references" },
                { title: "Promotion Readiness", desc: "AI predicts when you're ready for the next level" },
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
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12">
                  How It Works
                </h2>
                
                <div className="space-y-8">
                  {[
                    { step: "1", title: "Create Your Profile", desc: "Set up your career passport in minutes" },
                    { step: "2", title: "Track Performance", desc: "Capture reviews, feedback, and achievements" },
                    { step: "3", title: "Get AI Insights", desc: "Receive personalized development recommendations" },
                    { step: "4", title: "Prove Your Growth", desc: "Share verified records with future employers" }
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
                Trusted by Professionals and Companies
              </h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  quote: "Proven Path helped me land my dream job with verified performance data from my previous roles.",
                  author: "Sarah Chen",
                  role: "Senior Product Designer"
                },
                {
                  quote: "Finally, a performance platform that our team actually wants to use.",
                  author: "Michael Rodriguez",
                  role: "HR Director"
                },
                {
                  quote: "The AI development plans are incredibly specific and actionable.",
                  author: "James Kim",
                  role: "Software Engineer"
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
                Start Building Your Career Passport Today
              </h2>
              <p className="text-xl text-primary-foreground/90 mb-10">
                Join professionals who are taking control of their career growth
              </p>
              <div className="flex flex-col items-center gap-4">
                <Link href="/signup">
                  <Button size="lg" variant="secondary" className="h-14 px-10 text-lg bg-white text-primary hover:bg-gray-50">
                    Create Free Account
                  </Button>
                </Link>
                <p className="text-sm text-primary-foreground/80">
                  No credit card required • 14-day free trial
                </p>
              </div>
            </div>
          </Container>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
