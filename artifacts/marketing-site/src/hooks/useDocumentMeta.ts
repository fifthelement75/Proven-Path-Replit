import { useEffect } from "react";
import siteConfig from "@/content/site-config.json";

interface DocumentMeta {
  title: string;
  description: string;
  ogImage?: string;
  ogImageAlt?: string;
  canonicalPath?: string;
  noindex?: boolean;
}

function setMetaTag(
  selector: string,
  attr: "name" | "property",
  key: string,
  content: string,
): void {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLinkTag(rel: string, href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

const DEFAULT_IMAGE_ALT = "Proven Path dashboard and performance intelligence preview";

export function useDocumentMeta({
  title,
  description,
  ogImage,
  ogImageAlt = DEFAULT_IMAGE_ALT,
  canonicalPath,
  noindex = false,
}: DocumentMeta): void {
  useEffect(() => {
    document.title = title;

    setMetaTag('meta[name="description"]', "name", "description", description);

    setMetaTag('meta[property="og:title"]', "property", "og:title", title);
    setMetaTag(
      'meta[property="og:description"]',
      "property",
      "og:description",
      description,
    );
    setMetaTag(
      'meta[property="og:type"]',
      "property",
      "og:type",
      "website",
    );
    setMetaTag(
      'meta[property="og:locale"]',
      "property",
      "og:locale",
      "en_US",
    );

    setMetaTag(
      'meta[name="twitter:card"]',
      "name",
      "twitter:card",
      "summary_large_image",
    );
    setMetaTag('meta[name="twitter:title"]', "name", "twitter:title", title);
    setMetaTag(
      'meta[name="twitter:description"]',
      "name",
      "twitter:description",
      description,
    );

    if (ogImage) {
      const base = import.meta.env.BASE_URL;
      const fullImage = ogImage.startsWith("http")
        ? ogImage
        : `${siteConfig.origin}${base}${ogImage.replace(/^\//, "")}`;
      setMetaTag(
        'meta[property="og:image"]',
        "property",
        "og:image",
        fullImage,
      );
      setMetaTag(
        'meta[property="og:image:alt"]',
        "property",
        "og:image:alt",
        ogImageAlt,
      );
      setMetaTag(
        'meta[name="twitter:image"]',
        "name",
        "twitter:image",
        fullImage,
      );
      setMetaTag(
        'meta[name="twitter:image:alt"]',
        "name",
        "twitter:image:alt",
        ogImageAlt,
      );
    }

    if (noindex) {
      setMetaTag('meta[name="robots"]', "name", "robots", "noindex, follow");
      document.head.querySelector('link[rel="canonical"]')?.remove();
      document.head.querySelector('meta[property="og:url"]')?.remove();
      return;
    }
    document.head.querySelector('meta[name="robots"]')?.remove();
    if (canonicalPath) {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const path = canonicalPath.startsWith("/")
        ? canonicalPath
        : `/${canonicalPath}`;
      const canonicalUrl = `${siteConfig.origin}${base}${path}`;
      setLinkTag("canonical", canonicalUrl);
      setMetaTag('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    }
  }, [title, description, ogImage, ogImageAlt, canonicalPath, noindex]);
}
