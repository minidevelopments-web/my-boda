export function Footer() {
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
              Created with My Boda — Open Source Wedding Platform
            </a>
          </p>
          <p className="text-sm text-gray-500">Your wedding is private. Your data should be too.</p>
        </div>
      </div>
    </footer>
  );
}
