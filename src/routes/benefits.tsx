import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Award,
  ShieldCheck,
  Trophy,
  Sparkles,
  MapPin,
  BellRing,
  Heart,
  Gift,
  Crown,
  Medal,
  Star,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/benefits")({
  head: () => ({
    meta: [
      { title: "Donor Benefits — LifeLink Rewards & Recognition" },
      {
        name: "description",
        content:
          "Verifiable certificates, tier-based rewards, partner hospital perks, and lifelong recognition for every life you save.",
      },
      { property: "og:title", content: "Donor Benefits — Built to Honor Every Donor" },
      {
        property: "og:description",
        content: "Tiers, certificates, perks — earn meaningful rewards.",
      },
    ],
  }),
  component: BenefitsPage,
});

const benefits = [
  { icon: Award, title: "Digital certificates", desc: "Verifiable QR-coded PDF certificates after every successful donation." },
  { icon: Trophy, title: "Donor tiers", desc: "Climb from Bronze to Platinum. Unlock exclusive perks." },
  { icon: ShieldCheck, title: "Privacy first", desc: "Your identity stays masked. Consent required before any disclosure." },
  { icon: BellRing, title: "Smart alerts", desc: "Only get pinged when you actually match — no spam, no noise." },
  { icon: MapPin, title: "Live navigation", desc: "Real-time ETA and route guidance straight to the hospital." },
  { icon: Sparkles, title: "Reward points", desc: "Earn points redeemable for health checkups and partner offers." },
  { icon: Heart, title: "Health tracking", desc: "Free check-ups around your donation date with partner labs." },
  { icon: Gift, title: "Partner perks", desc: "Discounts at pharmacies, gyms, insurance partners and more." },
];

const tiers = [
  { name: "Bronze", icon: Medal, color: "#CD7F32", min: 1, perks: ["Welcome certificate", "Donor badge", "5% pharmacy discount"] },
  { name: "Silver", icon: Star, color: "#C0C0C0", min: 5, perks: ["Free annual checkup", "10% partner discounts", "Priority alerts"] },
  { name: "Gold", icon: Trophy, color: "#FFD700", min: 10, perks: ["Premium certificate", "Free insurance cover", "Hospital lounge access"] },
  { name: "Platinum", icon: Crown, color: "#E5E4E2", min: 25, perks: ["Lifetime recognition", "Annual gala invite", "Dedicated coordinator"] },
];

function BenefitsPage() {
  return (
    <PageShell
      eyebrow="Donor benefits"
      title={
        <>
          Built to <span className="text-gradient-success">honor every donor.</span>
        </>
      }
      subtitle="We don't just connect you to emergencies. We recognise, reward, and protect every donor in our network."
    >
      <section className="mx-auto max-w-6xl px-5 sm:px-6 pb-20">
        {/* Benefits grid */}
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: (i % 4) * 0.06 }}
              className="group glass rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-all group-hover:bg-primary/20">
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-1 text-sm sm:text-base font-semibold">{b.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Tiers */}
        <div className="mt-16">
          <div className="text-center mb-10">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
              Donor tiers
            </p>
            <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight">
              Earn your way to the top
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tiers.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="glass rounded-2xl p-6 relative overflow-hidden"
                style={{
                  background: `linear-gradient(180deg, color-mix(in oklab, ${t.color} 8%, var(--surface)) 0%, var(--surface) 100%)`,
                }}
              >
                <t.icon className="h-7 w-7 mb-3" style={{ color: t.color }} />
                <div className="text-lg font-semibold">{t.name}</div>
                <div className="text-xs text-muted-foreground mb-4">{t.min}+ donations</div>
                <ul className="space-y-1.5">
                  {t.perks.map((p) => (
                    <li key={p} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="mt-1 h-1 w-1 rounded-full shrink-0" style={{ background: t.color }} />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
