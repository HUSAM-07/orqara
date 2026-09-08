import { GitHubIcon } from "~/components/brand-icons";

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-6">
      <a href="/" className="flex items-center gap-3" aria-label="Orqara home">
        <img src="/logo.svg" alt="" className="h-7 w-7" />
        <span className="text-lg font-semibold tracking-tight">Orqara</span>
      </a>
      <nav className="flex items-center gap-5" aria-label="Main navigation">
        <a
          href="/#workflow"
          className="hidden text-sm text-white/55 transition hover:text-white sm:block"
        >
          Product
        </a>
        <a
          href="https://github.com/HUSAM-07/orqara/tree/main/docs"
          className="hidden text-sm text-white/55 transition hover:text-white sm:block"
        >
          Docs
        </a>
        <a href="/download" className="text-sm text-white/55 transition hover:text-white">
          Download
        </a>
        <a
          href="https://github.com/HUSAM-07/orqara"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Orqara on GitHub"
          className="text-white/55 transition hover:text-white"
        >
          <GitHubIcon width="18" height="18" />
        </a>
      </nav>
    </header>
  );
}
