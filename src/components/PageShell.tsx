import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { CtaFooter } from "./CtaFooter";

interface PageShellProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  children: ReactNode;
  showCta?: boolean;
}

export function PageShell({ eyebrow, title, subtitle, children, showCta = true }: PageShellProps) {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <Navbar />
      <section className="relative pt-32 pb-12 sm:pt-36 sm:pb-16">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div
          className="absolute inset-x-0 top-0 h-[400px] -z-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 0%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-5 sm:px-6 text-center">
          {eyebrow && (
            <p className="mb-3 text-[11px] sm:text-xs font-medium uppercase tracking-[0.2em] text-primary">
              {eyebrow}
            </p>
          )}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-semibold tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mx-auto mt-4 sm:mt-5 max-w-2xl text-sm sm:text-base text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </section>
      <div className="relative">{children}</div>
      {showCta && <CtaFooter />}
    </main>
  );
}
