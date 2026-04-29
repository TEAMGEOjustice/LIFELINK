import { motion } from "framer-motion";
import { Heart, Siren, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { FallingDrops } from "./FallingDrops";
import { EkgLine } from "./EkgLine";
import { lazy, Suspense } from "react";

const DonationBox3D = lazy(() => import("./DonationBox3D").then((m) => ({ default: m.DonationBox3D })));

export function Hero() {
  return (
    <section
      className="relative flex min-h-screen items-center justify-center overflow-hidden pt-24"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="absolute inset-0 grid-bg" />
      <FallingDrops />

      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Real-time donor matching · 24/7 emergency network
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl font-semibold tracking-tight sm:text-6xl md:text-7xl"
        >
          Every drop.
          <br />
          <span className="text-gradient-success">Saves a life.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
        >
          LifeLink is the smart blood &amp; organ donation network connecting hospitals with
          verified donors in seconds — privacy-first, geo-matched, life-saving.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link to="/auth" className="group inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[var(--glow-success)]">
            <Heart className="h-4 w-4" fill="currentColor" />
            Become a Donor
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link to="/auth" className="group inline-flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-6 py-3.5 text-sm font-semibold text-destructive-foreground backdrop-blur transition-all hover:bg-destructive/20 hover:shadow-[var(--glow-emergency)]">
            <Siren className="h-4 w-4 animate-heartbeat" />
            Emergency Request
          </Link>
        </motion.div>

        {/* Heart pulse + EKG */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-16 flex items-center justify-center gap-6"
        >
          <div className="relative">
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-primary/30" />
            <span
              className="absolute inset-0 animate-pulse-ring rounded-full bg-primary/20"
              style={{ animationDelay: "1s" }}
            />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 backdrop-blur">
              <Heart
                className="h-6 w-6 animate-heartbeat text-primary"
                fill="currentColor"
              />
            </div>
          </div>
          <div className="h-12 w-64 sm:w-96">
            <EkgLine className="h-full w-full" />
          </div>
        </motion.div>

        {/* 3D donation box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mt-12"
        >
          <Suspense fallback={<div className="h-[420px] flex items-center justify-center text-xs text-muted-foreground">Loading 3D scene…</div>}>
            <DonationBox3D />
          </Suspense>
          <p className="mt-2 text-xs text-muted-foreground">Move your cursor — every drop reaches the box, every box reaches a hospital.</p>
        </motion.div>
      </div>
    </section>
  );
}
