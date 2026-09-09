import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getSiteConfig } from "@/lib/config";
import { getDictionary, isValidLocale } from "@/lib/i18n";
import { SUPPORTED_LOCALES } from "@/i18n/locales";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang = isValidLocale(raw) ? raw : "en";
  const dict = getDictionary(lang);
  const title = dict.home.title;
  const description = dict.home.description;
  return {
    title,
    description,
    alternates: { languages: { en: "/en", es: "/es", fr: "/fr", de: "/de", pt: "/pt" } },
    icons: {
      icon: [{ url: "/favicon.ico" }, { url: "/favicon.svg", type: "image/svg+xml" }],
      apple: "/apple-touch-icon.png",
    },
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.png"],
    },
  };
}

export default async function LangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  const lang = isValidLocale(raw) ? raw : "en";
  const config = getSiteConfig();
  const dict = getDictionary(lang);
  return (
    <html lang={lang} className={`${inter.variable} ${playfair.variable}`}>
      <body className={`${inter.className} min-h-screen bg-white antialiased`}>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:bg-white focus:px-4 focus:py-2">{dict.common.skipToContent}</a>
        <Header config={config} lang={lang} dict={dict} />
        <main id="main" className="min-h-[calc(100vh-8rem)]">{children}</main>
        <Footer dict={dict} />
      </body>
    </html>
  );
}
