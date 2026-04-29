import { motion } from "framer-motion";
import { UserPlus, Radar, HeartHandshake } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Register & verify",
    desc: "Sign up as a donor with secure OTP verification. Your data stays masked until you consent.",
  },
  {
    icon: Radar,
    title: "Smart matching",
    desc: "Our engine matches blood group, location, and availability — surfacing the 5 nearest donors instantly.",
  },
  {
    icon: HeartHandshake,
    title: "Save a life",
    desc: "Hospitals send live requests. Accept, navigate, and donate — every second tracked end-to-end.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">
            How it works
          </p>
          <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Three steps. Zero friction.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group glass relative overflow-hidden rounded-2xl p-7 transition-all duration-500 hover:-translate-y-2 hover:shadow-[var(--glow-success)] hover:border-primary/50"
            >
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/15" />
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="mb-2 text-xs font-mono text-muted-foreground">
                STEP 0{i + 1}
              </div>
              <h3 className="mb-2 text-xl font-semibold">{s.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
