import { Link } from "wouter";
import { Container } from "@/components/ui/Container";
import logoUrl from "@assets/Screenshot_2026-05-02_at_7.51.36_PM_1777765970550.png";

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 pt-16 pb-8">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-12">
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center mb-4" aria-label="ProvenPath home">
              <img src={logoUrl} alt="ProvenPath" className="h-8 w-auto" />
            </Link>
            <p className="text-sm text-gray-500 mb-6">
              Performance intelligence for modern HR teams
            </p>
            <div className="flex gap-4">
              <a
                href="https://linkedin.com/company/provenpath"
                target="_blank"
                rel="noreferrer"
                className="text-gray-400 hover:text-primary transition-colors"
              >
                LinkedIn
              </a>
              <a
                href="https://x.com/provenpath"
                target="_blank"
                rel="noreferrer"
                className="text-gray-400 hover:text-primary transition-colors"
              >
                X (Twitter)
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-4">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-sm text-gray-500 hover:text-primary">
                  Product
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-gray-500 hover:text-primary">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-sm text-gray-500 hover:text-primary">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-gray-500 hover:text-primary">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-4">Legal</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/privacy" className="text-sm text-gray-500 hover:text-primary">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-gray-500 hover:text-primary">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/security" className="text-sm text-gray-500 hover:text-primary">
                  Security
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-4">Contact</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:info@provenpath.fyi"
                  className="text-sm text-gray-500 hover:text-primary"
                >info@provenpath.app</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © 2026 Proven Path. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
