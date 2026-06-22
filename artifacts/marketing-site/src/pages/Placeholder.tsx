import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

export default function Placeholder({
  title,
  canonicalPath,
}: {
  title: string;
  canonicalPath?: string;
}) {
  useDocumentMeta({
    title: `${title} — Proven Path`,
    description:
      "Proven Path — performance intelligence for modern HR teams. This page is coming soon.",
    ogImage: "opengraph.jpg",
    canonicalPath,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center py-24">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 bg-gray-300 rounded" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-4">
            {title}
          </h1>
          <p className="text-gray-500">
            This is a placeholder page for the {title.toLowerCase()} section. Content is coming soon.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
