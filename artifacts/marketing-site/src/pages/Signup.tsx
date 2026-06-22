import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

export default function Signup() {
  useDocumentMeta({
    title: "Join the Waitlist — Proven Path | Private Beta",
    description:
      "Proven Path is currently in private beta. Join the waitlist and be the first to know when we open up to new HR teams.",
    ogImage: "opengraph.jpg",
    canonicalPath: "/signup",
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2 group w-fit">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xl">
            P
          </div>
          <span className="font-semibold text-lg tracking-tight text-gray-900">
            Proven Path
          </span>
        </Link>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-lg border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">🚀</span>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Coming Soon
          </h1>
          
          <p className="text-gray-600 mb-8">
            We're currently in private beta. Drop your email below and we'll let you know when we open up.
          </p>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <Input 
              type="email" 
              placeholder="Enter your work email" 
              className="h-12 text-base text-center"
            />
            <Button type="submit" className="w-full h-12 text-lg">
              Join Waitlist
            </Button>
          </form>

          <div className="mt-8 text-sm text-gray-500">
            <Link href="/" className="hover:text-primary transition-colors">
              Return to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
