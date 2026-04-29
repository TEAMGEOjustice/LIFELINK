import { motion } from "framer-motion";
import { Award, ShieldCheck, Trophy, Sparkles, MapPin, BellRing } from "lucide-react";

const benefits = [
  {
    icon: Award,
    title: "Digital certificates",
    desc: "Verifiable QR-coded certificates after every successful donation.",
  },
  {
    icon: Trophy,
    title: "Donor levels",
    desc: "Climb from Bronze to Gold. Unlock perks with partner hospitals.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy first",
    desc: "Your identity stays masked. Consent required before any disclosure.",
  },
  {
    icon: BellRing,
    title: "Smart alerts",
    desc: "Only get pinged when you actually match — no spam, no noise.",
  },
  {
    icon: MapPin,
    title: "Live navigation",
    desc: "Real-time ETA and route guidance straight to the hospital.",
  },
  {
    icon: Sparkles,
    title: "Reward points",
    desc: "Earn points redeemable for health checkups and partner offers.",
  },
];

export function Benefits() {
  return (
    <section id="benefits" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Donor benefits
          </p>
          <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Built to honor every donor.
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
              className="group glass relative overflow-hidden rounded-2xl p-6 transition-all duration-500 hover:-translate-y-2 hover:shadow-[var(--glow-success)] hover:border-primary/50"
            >
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/15" />
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-all group-hover:bg-primary/20 group-hover:shadow-[0_0_20px_var(--primary)]">
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-1.5 font-semibold">{b.title}</h3>
              <p className="text-sm text-muted-foreground">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
