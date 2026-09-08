import { createFileRoute } from "@tanstack/react-router";
import { Apple, CheckCircle2, MonitorDown } from "lucide-react";
import { CodeBlock } from "~/components/code-block";
import { SiteShell } from "~/components/site-shell";
import { previewDownloads } from "~/downloads";
import { pageMeta } from "~/meta";
import { useVisitorPlatform } from "~/routes/__root";
import "~/styles.css";

export const Route = createFileRoute("/download")({
  head: () =>
    pageMeta(
      "Download Orqara for macOS and Windows",
      "Install the Orqara desktop command center for coding agents.",
      "/download",
    ),
  component: Download,
});

const BUILDS = [
  {
    name: "macOS",
    detail: "Apple Silicon preview built and smoke-tested from this checkout.",
    status: "Preview ready",
    icon: Apple,
  },
  {
    name: "Windows",
    detail:
      "x64 and ARM64 installer previews are packaged; native CI launches and signs the release.",
    status: "Installer preview ready",
    icon: MonitorDown,
  },
] as const;

function Download() {
  const isWindows = useVisitorPlatform() === "windows";
  const primaryDownload = isWindows ? previewDownloads.windows : previewDownloads.mac;
  return (
    <SiteShell width="default">
      <div className="mx-auto max-w-3xl py-10 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">
          Public preview
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">Get Orqara</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-white/55">
          Orqara launches first on Apple Silicon Macs. This page detected your platform and selected
          the matching preview installer.
        </p>

        <a
          href={primaryDownload}
          className="mt-8 inline-flex h-12 items-center rounded-lg bg-teal-300 px-6 text-sm font-semibold text-slate-950 transition hover:bg-teal-200"
        >
          Download for {isWindows ? "Windows" : "Mac"}
        </a>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {BUILDS.map(({ name, detail, status, icon: Icon }) => (
            <article key={name} className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <div className="flex items-center justify-between">
                <Icon className="h-6 w-6 text-teal-300" />
                <span className="inline-flex items-center gap-1.5 text-xs text-teal-200">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {status}
                </span>
              </div>
              <h2 className="mt-8 text-xl font-medium">{name}</h2>
              <p className="mt-2 text-sm leading-6 text-white/50">{detail}</p>
              <a
                href={name === "macOS" ? previewDownloads.mac : previewDownloads.windows}
                className="mt-5 inline-flex text-sm font-medium text-teal-200 hover:text-teal-100"
              >
                Download {name}
              </a>
            </article>
          ))}
        </div>

        <section className="mt-12 rounded-2xl border border-white/10 p-6 md:p-8">
          <h2 className="text-xl font-medium">Build the desktop preview</h2>
          <p className="mt-2 text-sm leading-6 text-white/50">
            From the repository root, install the locked dependencies and run the existing desktop
            packager.
          </p>
          <div className="mt-5 space-y-3">
            <CodeBlock>npm ci</CodeBlock>
            <CodeBlock>npm run build:desktop -- --publish never</CodeBlock>
          </div>
        </section>

        <p className="mt-6 text-xs leading-5 text-white/35">
          Preview builds are unsigned. Production installers will use Apple notarization, native
          Windows launch testing and Windows code signing before public distribution.
        </p>
        <p className="mt-3 text-xs leading-5 text-white/35">
          Windows on ARM?{" "}
          <a className="text-teal-200" href={previewDownloads.windowsArm64}>
            Download ARM64
          </a>
          .
        </p>
      </div>
    </SiteShell>
  );
}
