import Link from "next/link";
import { getSiteConfig } from "@/lib/config";

export function Header({ config }: { config?: ReturnType<typeof getSiteConfig> } = {}) {
  // Allow prop or fallback to env via getSiteConfig for standalone usage
  const cfg = config ?? getSiteConfig();
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {cfg.coupleName}
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="transition-colors hover:text-gray-600">
            Home
          </Link>
          <Link href="/rsvp" className="transition-colors hover:text-gray-600">
            RSVP
          </Link>
          <Link href="/info" className="transition-colors hover:text-gray-600">
            Info
          </Link>
          <Link href="/registry" className="transition-colors hover:text-gray-600">
            Registry
          </Link>
        </nav>
      </div>
    </header>
  );
}
