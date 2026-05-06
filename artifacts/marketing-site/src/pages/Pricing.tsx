import { Link } from "wouter";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { CheckCircle2, ArrowRight } from "lucide-react";

const tiers = [
  {
    name: "Starter",
    features: ["Core performance reviews", "Basic competency tracking", "Email support"],
    cta: "Get Started",
    link: "/contact",
  },
  {
    name: "Growth",
    popular: true,
    features: ["Interview scoring", "360° reviews", "SSO & advanced security (Built on SOC 2-compliant infrastructur)"],
    cta: "Book a Demo",
    link: "/contact",
  },
  {
    name: "Enterprise",
    external: true,
    features: ["Custom onboarding", "Dedicated support", "Advanced reporting"],
    cta: "Contact Sales",
    link: "/contact",
  },
];

const faqs = [
  { q: "Do you offer custom plans?", a: "Yes, we can tailor the platform to your team." },
  { q: "Can I upgrade later?", a: "Absolutely — you can upgrade at any time." },
];

export default function Pricing() {
  useDocumentMeta({
    title: "Pricing — Proven Path",
    description: "Simple pricing for modern HR teams.",
    canonicalPath: "/pricing",
  });

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 pt-16">
        <section className="py-14 md:py-24">
          <Container>
            <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Pricing</h1>
              <p className="text-lg text-gray-600">Choose the plan that fits your team.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {tiers.map((tier, i) => (
                <div key={i} className={`rounded-2xl border p-8 flex flex-col ${tier.popular ? "border-primary shadow-xl" : "border-gray-200"}`}>
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{tier.name}</h3>
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
                  {tier.external ? (
                    <a href={tier.link} className="w-full">
                      <Button className="w-full h-12" variant={tier.popular ? "default" : "outline"}>
                        {tier.cta}
                      </Button>
                    </a>
                  ) : (
                    <Link href={tier.link} className="w-full">
                      <Button className="w-full h-12" variant={tier.popular ? "default" : "outline"}>
                        {tier.cta}
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>

            <div className="max-w-3xl mx-auto mt-16">
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
        </section>
      </main>
      <Footer />
    </div>
  );
}
