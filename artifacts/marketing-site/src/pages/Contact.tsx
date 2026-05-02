import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function Contact() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      
      <main className="flex-1 pt-24 pb-24">
        <Container>
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Book a Demo
              </h1>
              <p className="text-xl text-gray-600">
                See how HR teams use Proven Path to hire smarter, develop faster, and retain longer. Tell us about your team and we'll set up a tailored walkthrough.
              </p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-200">
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="Jane" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Doe" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Work Email</Label>
                  <Input id="email" type="email" placeholder="jane@company.com" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company Name</Label>
                  <Input id="company" placeholder="Acme Inc." />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teamSize">Team Size</Label>
                  <Input id="teamSize" placeholder="e.g. 50–200 employees" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">What are you trying to solve?</Label>
                  <Textarea 
                    id="message" 
                    placeholder="Tell us about your current performance and hiring process, the tools you use, and what you'd like to change..."
                    className="min-h-[120px]"
                  />
                </div>

                <Button type="submit" className="w-full h-12 text-lg">
                  Request Demo
                </Button>
              </form>
            </div>
          </div>
        </Container>
      </main>
      
      <Footer />
    </div>
  );
}
