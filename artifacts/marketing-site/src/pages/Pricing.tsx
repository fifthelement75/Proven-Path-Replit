import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

export default function Pricing() {
  const tiers = [
    {
      name: "Free",
      price: "$0",
      period: "/month",
      tagline: "Try the personal experience",
      features: [
        "Basic Proven Path profile",
        "Self-assessment tools",
        "3 verified references",
        "Career timeline view"
      ],
      cta: "Get Started Free",
      link: "/signup",
      popular: false
    },
    {
      name: "Professional",
      price: "$9.99",
      period: "/month",
      tagline: "For individual contributors",
      features: [
        "Personal Proven Path profile",
        "Unlimited verified references",
        "AI development plans",
        "Public profile page",
        "Career coaching insights",
        "Priority support"
      ],
      cta: "Start Free Trial",
      link: "/signup",
      popular: false
    },
    {
      name: "Team",
      price: "$29",
      period: "/user/month",
      sub: "(billed annually, min 10 users)",
      tagline: "For growing HR teams",
      features: [
        "Interview scoring module",
        "360° performance reviews",
        "Team analytics dashboard",
        "Custom skill matrices & career ladders",
        "Manager tools",
        "AI development plans",
        "Email support"
      ],
      cta: "Book a Demo",
      link: "/contact",
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "Pricing",
      tagline: "For complex orgs and HRIS-led rollouts",
      features: [
        "Everything in Team, plus:",
        "HRIS integrations (BambooHR, Workday, Gusto)",
        "SSO & advanced security (SOC 2)",
        "Dedicated account manager",
        "Custom workflows & permissions",
        "API access",
        "SLA guarantee"
      ],
      cta: "Contact Sales",
      link: "/contact",
      popular: false
    }
  ];

  const faqs = [
    {
      q: "Can I switch plans anytime?",
      a: "Yes, upgrade or downgrade anytime"
    },
    {
      q: "Is there a free trial?",
      a: "Yes, 14-day free trial on Professional plan"
    },
    {
      q: "What payment methods do you accept?",
      a: "Credit card, PayPal, invoice (Enterprise)"
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes, no long-term contracts"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      
      <main className="flex-1 pt-24 pb-24">
        <Container>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Pricing Built for Modern HR Teams
            </h1>
            <p className="text-xl text-gray-600">
              Start with the plan that fits your team today—scale into Enterprise as you grow. Personal plans are available for individual contributors.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-24">
            {tiers.map((tier, i) => (
              <div 
                key={i} 
                className={`relative flex flex-col rounded-3xl p-8 border ${
                  tier.popular ? 'border-primary shadow-xl scale-105 bg-white z-10' : 'border-gray-200 bg-gray-50'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 inset-x-0 flex justify-center">
                    <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{tier.name}</h3>
                  {tier.tagline && <p className="text-sm text-gray-500 mb-3">{tier.tagline}</p>}
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-900">{tier.price}</span>
                    <span className="text-gray-500 font-medium">{tier.period}</span>
                  </div>
                  {tier.sub && <p className="text-sm text-gray-500 mt-1">{tier.sub}</p>}
                </div>
                
                <div className="flex-1 mb-8">
                  <ul className="space-y-4">
                    {tier.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <CheckCircle2 className={`shrink-0 w-5 h-5 ${tier.popular ? 'text-primary' : 'text-success'}`} />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <Link href={tier.link} className="w-full">
                  <Button 
                    className="w-full h-12" 
                    variant={tier.popular ? "default" : "outline"}
                  >
                    {tier.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Frequently Asked Questions</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {faqs.map((faq, i) => (
                <div key={i}>
                  <h4 className="font-semibold text-gray-900 mb-2">{faq.q}</h4>
                  <p className="text-gray-600">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </main>
      
      <Footer />
    </div>
  );
}
