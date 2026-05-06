import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/button";
import logoUrl from "@assets/ProvenPath_Logo_1777766610872.png";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 border-b ${
        isScrolled
          ? "bg-white/80 backdrop-blur-md border-gray-200"
          : "bg-transparent border-transparent"
      }`}
    >
      <Container>
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center group" aria-label="ProvenPath home">
              <img
                src={logoUrl}
                alt="ProvenPath"
                className="h-11 w-auto group-hover:scale-105 transition-transform"
              />
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location === "/" ? "text-primary" : "text-gray-600"
              }`}
            >
              Product
            </Link>
            <Link
              href="/pricing"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location === "/pricing" ? "text-primary" : "text-gray-600"
              }`}
            >
              Pricing
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <a
              href="/app/register"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Sign Up
            </a>
            <Link href="/contact">
              <Button>Book a Demo</Button>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden inline-flex items-center justify-center h-11 w-11 -mr-2 rounded-md text-gray-700 hover:bg-gray-100"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </Container>

      {/* Mobile Nav backdrop + drawer */}
      {isMobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 top-16 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden
          />
          <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg py-3 px-4 flex flex-col gap-1 z-50">
            <Link
              href="/"
              className="text-base font-medium text-gray-900 px-3 py-3 hover:bg-gray-50 rounded-md"
            >
              Product
            </Link>
            <Link
              href="/pricing"
              className="text-base font-medium text-gray-900 px-3 py-3 hover:bg-gray-50 rounded-md"
            >
              Pricing
            </Link>
            <div className="h-px bg-gray-200 my-2" />
            <a
              href="/app/register"
              className="text-base font-medium text-gray-900 px-3 py-3 hover:bg-gray-50 rounded-md"
            >
              Sign Up
            </a>
            <Link href="/contact" className="w-full mt-1">
              <Button className="w-full h-12 text-base">Book a Demo</Button>
            </Link>
          </div>
        </>
      )}
    </header>
  );
}
