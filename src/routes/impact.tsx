import { createFileRoute } from "@tanstack/react-router";
import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Heart, Users, Building2, MapPin, TrendingUp, Award } from "lucide-react";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/impact")({
  head: () => ({
    meta: [
      { title: "Impact — LifeLink Donation Network" },
      {
        name: "description",
        content:
          "Lives saved, donors active, hospitals connected. Real-time impact metrics from the LifeLink network across India.",
      },
      { property: "og:title", content: "LifeLink Impact — Real Numbers, Real Lives" },
      {
        property: "og:description",
        content: "Track our growing donor network and emergencies resolved.",
      },
    ],
  }),
  component: ImpactPage,
});

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.floor(v).toLocaleString());

  useEffect(() => {
    if (!inView) return;
    const c = animate(count, to, { duration: 2, ease: "easeOut" });
    return c.stop;
  }, [inView, to, count]);

  return (
    <span ref={ref} className="tabular-nums">
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}

const heroStats = [
  { value: 124583, suffix: "", label: "Lives saved", icon: Heart },
  { value: 89421, suffix: "", label: "Active donors", icon: Users },
  { value: 2147, suffix: "", label: "Partner hospitals", icon: Building2 },
  { value: 98, suffix: "%", label: "Match success", icon: TrendingUp },
];

const cities = [
  { name: "Mumbai", donors: 18420, lives: 24310 },
  { name: "Delhi NCR", donors: 22100, lives: 31250 },
  { name: "Bengaluru", donors: 14800, lives: 19420 },
  { name: "Hyderabad", donors: 9200, lives: 12180 },
  { name: "Chennai", donors: 11300, lives: 15400 },
  { name: "Pune", donors: 7600, lives: 9870 },
  { name: "Kolkata", donors: 6101, lives: 8470 },
];

function ImpactPage() {
  const [page, setPage] = useState(0);
  const perPage = 4;
  const totalPages = Math.ceil(cities.length / perPage);
  const visible = cities.slice(page * perPage, page * perPage + perPage);

  return (
    <PageShell
      eyebrow="Impact"
      title={
        <>
          Real numbers. <span className="text-gradient-success">Real lives.</span>
        </>
      }
      subtitle="Every metric represents a real person — a donor, a patient, a family. We update these in real time as donations happen."
    >
      <section className="mx-auto max-w-6xl px-5 sm:px-6 pb-20">
        {/* Hero stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {heroStats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass rounded-2xl p-5 sm:p-7 relative overflow-hidden"
            >
              <s.icon className="absolute right-3 top-3 h-4 w-4 sm:h-5 sm:w-5 text-primary/40" />
              <div className="text-3xl sm:text-4xl font-semibold text-gradient-success">
                <Counter to={s.value} suffix={s.suffix} />
              </div>
              <div className="mt-1.5 text-xs sm:text-sm text-muted-foreground">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* City breakdown with pagination */}
        <div className="mt-12 sm:mt-16 glass rounded-3xl p-6 sm:p-10">
          <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary mb-1">
                City breakdown
              </p>
              <h2 className="text-2xl sm:text-3xl font-semibold">Donor activity by city</h2>
            </div>
            <div className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages}
            </div>
          </div>

          <div className="space-y-2.5">
            {visible.map((c, i) => {
              const max = Math.max(...cities.map((x) => x.donors));
              const pct = (c.donors / max) * 100;
              return (
                <motion.div
                  key={c.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border bg-surface/50 p-4"
                >
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium text-sm">{c.name}</span>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>
                        <span className="text-foreground font-semibold tabular-nums">
                          {c.donors.toLocaleString()}
                        </span>{" "}
                        donors
                      </span>
                      <span>
                        <span className="text-primary font-semibold tabular-nums">
                          {c.lives.toLocaleString()}
                        </span>{" "}
                        lives
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-center gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`h-2 rounded-full transition-all ${
                  i === page ? "w-8 bg-primary" : "w-2 bg-white/15 hover:bg-white/30"
                }`}
                aria-label={`Page ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Awards strip */}
        <div className="mt-12 sm:mt-16 grid gap-4 sm:grid-cols-3">
          {[
            { title: "Featured by", value: "Health Ministry, India" },
            { title: "Recognised by", value: "NOTTO Coordinator" },
            { title: "Trusted by", value: "2,000+ hospitals" },
          ].map((a) => (
            <div key={a.title} className="glass rounded-2xl p-5 flex items-center gap-3">
              <Award className="h-5 w-5 text-primary shrink-0" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {a.title}
                </div>
                <div className="text-sm font-semibold">{a.value}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
