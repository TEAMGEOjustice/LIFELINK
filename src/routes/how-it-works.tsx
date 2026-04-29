import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  UserPlus,
  Radar,
  HeartHandshake,
  Building2,
  Bell,
  ShieldCheck,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How LifeLink Works — Real-time Donor Matching" },
      {
        name: "description",
        content:
          "From signup to donation in under 5 minutes. See how LifeLink connects hospitals to verified blood and organ donors using AI-powered matching.",
      },
      { property: "og:title", content: "How LifeLink Works" },
      {
        property: "og:description",
        content: "AI-powered donor matching, end-to-end emergency workflow.",
      },
    ],
  }),
  component: HowItWorksPage,
});

const phases = [
  {
    icon: UserPlus,
    color: "var(--primary)",
    label: "Phase 1",
    title: "Donor onboarding",
    desc: "Sign up with mobile + OTP verification. Set blood group, location, and availability. Your data is encrypted and masked until you consent.",
    points: ["Mobile + OTP verify", "Geolocation captured", "Health declaration", "Privacy controls"],
  },
  {
    icon: Building2,
    color: "var(--primary)",
    label: "Phase 2",
    title: "Hospital registers emergency",
    desc: "Verified hospitals raise an emergency request — blood group, units, urgency, and location. Submitted in under 30 seconds.",
    points: ["Hospital auth + KYC", "Blood group + units", "Urgency level", "Auto-geocoded location"],
  },
  {
    icon: Radar,
    color: "var(--primary)",
    label: "Phase 3",
    title: "AI matches top donors",
    desc: "Our engine ranks donors by blood group, distance (Haversine), donation gap, and trust score — surfacing the top 5 in milliseconds.",
    points: ["Blood group filter", "Distance ranking", "Eligibility check", "Trust scoring"],
  },
  {
    icon: Bell,
    color: "var(--destructive)",
    label: "Phase 4",
    title: "Real-time alerts dispatched",
    desc: "Selected donors receive simultaneous push, SMS, and in-app alerts. First to accept locks the request — others gracefully released.",
    points: ["Push + SMS + email", "Socket.io live updates", "Auto-lock on accept", "5-min response window"],
  },
  {
    icon: HeartHandshake,
    color: "var(--primary)",
    label: "Phase 5",
    title: "Donation completed",
    desc: "Donor navigates to hospital with live ETA. Staff marks donation complete — points, certificate, and email confirmation auto-issued.",
    points: ["Live navigation", "Hospital marks done", "+50 reward points", "PDF certificate emailed"],
  },
];

import { useMotionValue, useSpring, useTransform } from "framer-motion";

function PhaseCard({ p }: { p: any }) {
  // --- MOUSE 3D TILT LOGIC ---
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  // Spotlight glow position
  const spotX = useTransform(mouseXSpring, [-0.5, 0.5], ["0%", "100%"]);
  const spotY = useTransform(mouseYSpring, [-0.5, 0.5], ["0%", "100%"]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = (mouseX / width) - 0.5;
    const yPct = (mouseY / height) - 0.5;

    x.set(xPct);
    y.set(yPct);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      style={{ 
        rotateX,
        rotateY,
        perspective: 1000
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="glass relative overflow-hidden rounded-2xl p-5 sm:p-7 transition-shadow hover:shadow-[0_0_50px_rgba(255,255,255,0.05)] cursor-default group"
    >
      {/* SPOTLIGHT GLOW EFFECT */}
      <motion.div 
        style={{
          left: spotX,
          top: spotY,
        }}
        className="absolute -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 blur-[80px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: `color-mix(in oklab, ${p.color} 15%, transparent)`,
            color: p.color,
          }}
        >
          <p.icon className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              {p.label}
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-2">{p.title}</h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{p.desc}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
            {p.points.map((pt: string) => (
              <div key={pt} className="flex items-center gap-2 text-xs sm:text-sm">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="text-muted-foreground">{pt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function HowItWorksPage() {
  return (
    <PageShell
      eyebrow="How it works"
      title={
        <>
          Five steps from <span className="text-gradient-success">signup to saving</span> a life.
        </>
      }
      subtitle="Every emergency follows the same precise, time-bound workflow — engineered for under 5 minutes total response time."
    >
      <section className="mx-auto max-w-5xl px-5 sm:px-6 pb-20">
        <div className="space-y-4 sm:space-y-5">
          {phases.map((p) => (
            <PhaseCard key={p.title} p={p} />
          ))}
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Privacy-first", desc: "Identity masked until consent" },
            { icon: Activity, title: "Sub-2s matching", desc: "AI ranks donors instantly" },
            { icon: CheckCircle2, title: "100% verified", desc: "OTP + hospital verification" },
          ].map((f) => (
            <div key={f.title} className="glass rounded-2xl p-5 text-center">
              <f.icon className="mx-auto mb-3 h-6 w-6 text-primary" />
              <div className="text-sm font-semibold">{f.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
