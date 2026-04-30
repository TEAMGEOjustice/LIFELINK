import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef } from "react";

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.floor(v).toLocaleString());

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, to, { duration: 2, ease: "easeOut" });
    return controls.stop;
  }, [inView, to, count]);

  return (
    <span ref={ref} className="tabular-nums">
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}

const stats = [
  { value: 124583, suffix: "", label: "Lives saved" },
  { value: 89421, suffix: "", label: "Active donors" },
  { value: 2147, suffix: "", label: "Partner hospitals" },
  { value: 98, suffix: "%", label: "Match success" },
];

export function ImpactCounter() {
  return (
    <section id="impact" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="glass-card relative overflow-hidden p-10 sm:p-14">
          <div className="absolute inset-0 grid-bg opacity-40" />
          <div className="absolute left-1/2 top-0 h-px w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary to-transparent" />

          <div className="relative text-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">
              Live impact
            </p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Real numbers. Real lives.
            </h2>
          </div>

          <div className="relative mt-12 grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-4xl font-semibold text-gradient-success sm:text-5xl">
                  <Counter to={s.value} suffix={s.suffix} />
                </div>
                <div className="mt-2 text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
