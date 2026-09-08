interface SiteFooterProps {
  width?: "default" | "prose";
}

export function SiteFooter({ width = "default" }: SiteFooterProps) {
  const maxWidth = width === "prose" ? "max-w-prose" : "max-w-5xl";
  return (
    <footer className={`${maxWidth} mx-auto px-6 pb-10`}>
      <div className="flex flex-col gap-5 border-t border-white/10 pt-8 text-sm text-white/45 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-white/75">Orqara</p>
          <p className="mt-1">Many agents. One finished task.</p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <a href="/download" className="transition hover:text-white">
            Download
          </a>
          <a
            href="https://github.com/HUSAM-07/orqara/tree/main/docs"
            className="transition hover:text-white"
          >
            Docs
          </a>
          <a
            href="https://github.com/HUSAM-07/orqara"
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-white"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
