import type { ReactNode } from "react";
import {
  ArrowRight,
  CheckCircle2,
  GitBranch,
  Laptop,
  LockKeyhole,
  Radio,
  ShieldCheck,
  Smartphone,
  TerminalSquare,
  Workflow,
} from "lucide-react";
import { ClaudeCodeIcon, CodexIcon, OpenCodeIcon, PiIcon } from "~/components/agent-icons";
import { HeroMockup } from "~/components/hero-mockup";
import { SiteFooter } from "~/components/site-footer";
import { SiteHeader } from "~/components/site-header";
import { previewDownloads } from "~/downloads";
import { useVisitorPlatform } from "~/routes/__root";
import "~/styles.css";

interface LandingPageProps {
  title: ReactNode;
  subtitle: ReactNode;
}

const WORKFLOW = [
  {
    step: "01",
    title: "Run in isolation",
    body: "Every task gets its own worktree, terminal, agent session, and diff. Parallel work stays parallel.",
    icon: GitBranch,
  },
  {
    step: "02",
    title: "Prove the result",
    body: "Checks, command output, and changed files stay attached to the task that produced them.",
    icon: ShieldCheck,
  },
  {
    step: "03",
    title: "Review and ship",
    body: "Read the conversation, inspect the diff, rerun checks, and merge from one focused workspace.",
    icon: CheckCircle2,
  },
] as const;

const FEATURES = [
  {
    title: "One command center",
    body: "Claude Code, Codex, OpenCode, and Pi share one task model without flattening their native strengths.",
    icon: Workflow,
  },
  {
    title: "Your machine, your context",
    body: "Agents run beside your repositories, tools, credentials, and local development environment.",
    icon: TerminalSquare,
  },
  {
    title: "Continue from anywhere",
    body: "Desktop, web, and mobile clients reconnect to the same durable session through the relay.",
    icon: Smartphone,
  },
  {
    title: "Private by default",
    body: "The local daemon owns execution. Pairing credentials are scoped and sensitive values stay out of task logs.",
    icon: LockKeyhole,
  },
] as const;

const PROVIDERS = [
  { name: "Claude Code", icon: ClaudeCodeIcon },
  { name: "Codex", icon: CodexIcon },
  { name: "OpenCode", icon: OpenCodeIcon },
  { name: "Pi", icon: PiIcon },
] as const;

export function LandingPage({ title, subtitle }: LandingPageProps) {
  const isWindows = useVisitorPlatform() === "windows";
  const download = isWindows ? previewDownloads.windows : previewDownloads.mac;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_50%_0%,rgba(45,212,191,0.16),transparent_58%)]" />
        <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-4 md:px-10 md:pb-24 md:pt-6">
          <SiteHeader />
          <section className="mx-auto max-w-4xl pb-12 pt-24 text-center md:pb-16 md:pt-32">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-teal-200">
              <Radio className="h-3.5 w-3.5" />
              Agent work you can verify
            </p>
            <h1 className="text-5xl font-medium leading-[0.92] tracking-[-0.055em] md:text-7xl lg:text-8xl">
              {title}
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-white/60 md:text-xl">
              {subtitle}
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={download}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-teal-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-teal-200"
              >
                Download for {isWindows ? "Windows" : "Mac"} <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#workflow"
                className="inline-flex h-11 items-center rounded-lg border border-white/15 px-5 text-sm font-medium text-white/80 transition hover:border-white/30 hover:text-white"
              >
                See how it works
              </a>
            </div>
            <p className="mt-4 text-xs text-white/35">
              Apple Silicon launch · Windows preview · Apache-2.0
            </p>
          </section>
          <HeroMockup />
        </div>
      </div>

      <main>
        <section className="border-b border-white/10 px-6 py-16 md:py-20">
          <div className="mx-auto max-w-5xl">
            <p className="mb-8 text-center text-xs font-medium uppercase tracking-[0.2em] text-white/40">
              Bring the agent you already trust
            </p>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-4">
              {PROVIDERS.map(({ name, icon: Icon }) => (
                <div
                  key={name}
                  className="flex items-center justify-center gap-3 bg-background px-5 py-6 text-sm text-white/75"
                >
                  <Icon className="h-6 w-6" />
                  {name}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="scroll-mt-12 px-6 py-24 md:py-32">
          <div className="mx-auto max-w-5xl">
            <Eyebrow>From prompt to proof</Eyebrow>
            <h2 className="mt-4 max-w-3xl text-3xl font-medium tracking-tight md:text-5xl">
              The work is only done when the evidence is ready.
            </h2>
            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {WORKFLOW.map((item) => (
                <WorkflowCard key={item.step} item={item} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.018] px-6 py-24 md:py-32">
          <div className="mx-auto grid max-w-5xl gap-14 md:grid-cols-[0.9fr_1.1fr] md:items-center">
            <div>
              <Eyebrow>Local control plane</Eyebrow>
              <h2 className="mt-4 text-3xl font-medium tracking-tight md:text-5xl">
                Fast nearby. Reachable anywhere.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-white/55">
                Orqara keeps execution on the host that owns your code. Its relay carries encrypted
                session traffic so another client can pick up the same task without moving the
                repository.
              </p>
            </div>
            <Architecture />
          </div>
        </section>

        <section className="px-6 py-24 md:py-32">
          <div className="mx-auto max-w-5xl">
            <Eyebrow>Built for real repositories</Eyebrow>
            <div className="mt-12 grid gap-x-12 gap-y-12 md:grid-cols-2">
              {FEATURES.map((item) => (
                <FeatureCard key={item.title} item={item} />
              ))}
            </div>
          </div>
        </section>

        <section id="install" className="px-6 pb-24 md:pb-32">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-teal-200/15 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.13),transparent_55%)] px-6 py-16 text-center md:px-16 md:py-20">
            <Laptop className="mx-auto h-7 w-7 text-teal-300" />
            <h2 className="mt-6 text-3xl font-medium tracking-tight md:text-5xl">
              Many agents. One finished task.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/55">
              Install the desktop command center and connect the coding tools already on your
              machine.
            </p>
            <a
              href="/download"
              className="mt-8 inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-teal-100"
            >
              Get Orqara <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">{children}</p>
  );
}

function WorkflowCard({ item }: { item: (typeof WORKFLOW)[number] }) {
  const Icon = item.icon;
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5 text-teal-300" />
        <span className="font-mono text-xs text-white/30">{item.step}</span>
      </div>
      <h3 className="mt-10 text-xl font-medium">{item.title}</h3>
      <p className="mt-3 text-sm leading-6 text-white/50">{item.body}</p>
    </article>
  );
}

function FeatureCard({ item }: { item: (typeof FEATURES)[number] }) {
  const Icon = item.icon;
  return (
    <article className="grid grid-cols-[2.5rem_1fr] gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-teal-300/20 bg-teal-300/5 text-teal-300">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-lg font-medium">{item.title}</h3>
        <p className="mt-2 text-sm leading-6 text-white/50">{item.body}</p>
      </div>
    </article>
  );
}

function Architecture() {
  const nodes = [
    { label: "Desktop / web / mobile", icon: Smartphone },
    { label: "Encrypted relay", icon: Radio },
    { label: "Local daemon + agents", icon: TerminalSquare },
  ] as const;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      {nodes.map(({ label, icon: Icon }, index) => (
        <div key={label}>
          <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.035] px-5 py-4">
            <Icon className="h-5 w-5 text-teal-300" />
            <span className="text-sm text-white/75">{label}</span>
          </div>
          {index < nodes.length - 1 && <div className="mx-auto h-7 w-px bg-teal-300/30" />}
        </div>
      ))}
    </div>
  );
}
