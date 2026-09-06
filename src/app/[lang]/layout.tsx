import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getSiteConfig } from "@/lib/config";
import { getDictionary, type Locale } from "@/lib/i18n";
import { SUPPORTED_LOCALES } from "@/i18n/locales";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: { lang: Locale } }): Promise<Metadata> {
  const dict = getDictionary(params.lang);
  return {
    title: dict.home.title,
    description: dict.home.description,
    alternates: { languages: { en: "/en", es: "/es", fr: "/fr", de: "/de", pt: "/pt" } },
  };
}

export default function LangLayout({ children, params }: { children: React.ReactNode; params: { lang: Locale } }) {
  const config = getSiteConfig();
  const dict = getDictionary(params.lang);
  return (
    <html lang={params.lang} className={`${inter.variable} ${playfair.variable}`}>
      <body className={`${inter.className} min-h-screen bg-white antialiased`}>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:bg-white focus:px-4 focus:py-2">{dict.common.skipToContent}</a>
        <Header config={config} lang={params.lang} dict={dict} />
        <main id="main" className="min-h-[calc(100vh-8rem)]">{children}</main>
        <Footer dict={dict} />
      </body>
    </html>
  );
}
