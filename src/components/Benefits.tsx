import { motion } from "framer-motion";
import { Award, ShieldCheck, Trophy, Sparkles, MapPin, BellRing } from "lucide-react";

const benefits = [
  {
    icon: Award,
    title: "Digital certificates",
    desc: "Verifiable QR-coded certificates issued after every successful donation.",
  },
  {
    icon: Trophy,
    title: "Donor levels",
    desc: "Climb from Bronze to Gold tiers. Unlock exclusive hospital network perks.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy first",
    desc: "Your identity stays masked until consent is explicitly provided for disclosure.",
  },
  {
    icon: BellRing,
    title: "Smart alerts",
    desc: "Receive pings only when your profile is a perfect biological match.",
  },
  {
    icon: MapPin,
    title: "Live navigation",
    desc: "Real-time ETA and precision route guidance directly to the facility.",
  },
  {
    icon: Sparkles,
    title: "Reward points",
    desc: "Earn LifePoints redeemable for medical checkups and partner offers.",
  },
];

/**
 * Premium Benefits Grid
 * Features:
 * - Glass-card grid with high-fidelity blurs
 * - Dynamic Lucide-react iconography
 * - Staggered reveal & hover depth
 */
export function Benefits() {
  return (
    <section id="benefits" className="relative py-40">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-24 text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl md:text-7xl tracking-tight"
          >
            Built to honor every <span className="italic text-white/40 font-light">donor</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.4 }}
            viewport={{ once: true }}
            className="mt-6 text-sm uppercase tracking-[0.3em]"
          >
            A network defined by recognition
          </motion.p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="group glass-card p-8 transition-all duration-500 hover:bg-white/[0.04]"
            >
              <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-4 text-xl font-medium tracking-tight text-white">{b.title}</h3>
              <p className="text-sm leading-relaxed text-white/40 font-light">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
