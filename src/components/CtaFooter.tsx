import { Heart } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { BloodDrop } from "./BloodDrop";

export function CtaFooter() {
  return (
    <section className="relative py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div
          className="glass relative overflow-hidden rounded-3xl p-12 text-center sm:p-16"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at top, color-mix(in oklab, var(--primary) 12%, transparent), transparent 60%)",
          }}
        >
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="relative">
            <div className="mb-6 inline-flex animate-float">
              <BloodDrop size={44} />
            </div>
            <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Join the network. <br />
              <span className="text-gradient-success">Be someone&apos;s reason.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
              Free to join. Always anonymous until you say yes. Built for hospitals, powered by
              donors like you.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/auth" className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[var(--glow-success)]">
                <Heart className="h-4 w-4" fill="currentColor" />
                Become a Donor
              </Link>
              <Link to="/auth" className="rounded-xl border border-border bg-surface/50 px-7 py-3.5 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:bg-surface-elevated">
                Hospital sign-up
              </Link>
            </div>
          </div>
        </div>

        <footer className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <BloodDrop size={14} />
            <span>
              Life<span className="text-primary">Link</span> · Smart Donation Network
            </span>
          </div>
          <div>© {new Date().getFullYear()} LifeLink. Privacy-first by design.</div>
        </footer>
      </div>
    </section>
  );
}
