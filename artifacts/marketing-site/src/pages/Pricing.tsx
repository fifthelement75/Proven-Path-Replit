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
      features: [
        "Basic Career Passport",
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
      features: [
        "Everything in Free, plus:",
        "Unlimited verified references",
        "AI development plans",
        "Public profile page",
        "Career coaching insights",
        "Priority support"
      ],
      cta: "Start Free Trial",
      link: "/signup",
      popular: true
    },
    {
      name: "Team",
      price: "$29",
      period: "/user/month",
      sub: "(billed annually)",
      features: [
        "Everything in Professional, plus:",
        "Interview scoring module",
        "360° performance reviews",
        "Team analytics dashboard",
        "Custom skill matrices",
        "Manager tools",
        "Email support",
        "Minimum 10 users"
      ],
      cta: "Request Demo",
      link: "/contact",
      popular: false
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "Pricing",
      features: [
        "Everything in Team, plus:",
        "HRIS integrations (BambooHR, Workday, Gusto)",
        "SSO & advanced security",
        "Dedicated account manager",
        "Custom workflows",
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
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-gray-600">
              Choose the plan that fits your career stage or team size.
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
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{tier.name}</h3>
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
