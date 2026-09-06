import type { Dictionary } from "@/lib/i18n";

export function Footer({ dict }: { dict?: Dictionary } = {}) {
  const tagline = dict?.footer.tagline ?? "Your wedding is private. Your data should be too.";
  const credit = dict?.footer.credit ?? "Created with My Boda — Open Source Wedding Platform";
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
          <p className="text-sm text-gray-600">
            <a
              href="https://github.com/anomalyco/my-boda"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline decoration-gray-300 underline-offset-4 hover:decoration-gray-600"
            >
              {credit}
            </a>
          </p>
          <p className="text-sm text-gray-500">{tagline}</p>
        </div>
      </div>
    </footer>
  );
}
