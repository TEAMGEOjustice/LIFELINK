import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Siren, Clock, Droplet, MapPin, Check, X, Zap, Users, ShieldAlert } from "lucide-react";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      { title: "Emergency Mode — LifeLink" },
      {
        name: "description",
        content:
          "When seconds matter most. Hospitals raise an emergency, AI matches the 5 nearest donors, and live alerts dispatch in under 2 seconds.",
      },
      { property: "og:title", content: "Emergency Mode — When Seconds Matter Most" },
      {
        property: "og:description",
        content: "Real-time AI donor matching for blood emergencies.",
      },
    ],
  }),
  component: EmergencyPage,
});

const donors = [
  { name: "A. Sharma", group: "O−", distance: "1.2 km", eta: "4 min", status: "accepted" as const },
  { name: "R. Mehta", group: "O−", distance: "2.4 km", eta: "7 min", status: "pending" as const },
  { name: "K. Iyer", group: "O−", distance: "3.1 km", eta: "9 min", status: "pending" as const },
  { name: "S. Patel", group: "O−", distance: "3.8 km", eta: "11 min", status: "pending" as const },
];

function EmergencyPage() {
  return (
    <PageShell
      eyebrow="Emergency mode"
      title={
        <>
          When seconds <span className="text-gradient-emergency">matter most.</span>
        </>
      }
      subtitle="A complete walkthrough of how a blood emergency flows through LifeLink — from hospital request to verified donor arrival."
    >
      <section className="mx-auto max-w-6xl px-5 sm:px-6 pb-20">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          {/* Workflow */}
          <div className="space-y-4">
            {[
              {
                t: "01 · Hospital raises request",
                d: "Verified hospital submits blood group, units, urgency, location. Auto-validated against patient records.",
                i: ShieldAlert,
              },
              {
                t: "02 · AI ranks top 5 donors",
                d: "Haversine distance + blood group + 90-day eligibility + trust score. Sub-second ranking.",
                i: Zap,
              },
              {
                t: "03 · Multi-channel alerts fire",
                d: "Push notification + SMS + email + in-app socket — all simultaneously, no donor missed.",
                i: Siren,
              },
              {
                t: "04 · First-accept locks request",
                d: "Other donors gracefully released with thank-you note. Live ETA streamed to hospital.",
                i: Check,
              },
              {
                t: "05 · Panic Mode if no accept",
                d: "Within 5 minutes if no acceptance, all nearby donors get a CRITICAL alert with override.",
                i: Users,
              },
            ].map((step, i) => (
              <motion.div
                key={step.t}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="glass rounded-2xl p-5 flex gap-4 items-start"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
                  <step.i className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold mb-1">{step.t}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{step.d}</div>
                </div>
              </motion.div>
            ))}

            <Link
              to="/auth"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-destructive px-6 py-3.5 text-sm font-semibold text-destructive-foreground transition-all hover:shadow-[var(--glow-emergency)] active:scale-95"
            >
              <Siren className="h-4 w-4" />
              Raise an emergency now
            </Link>
          </div>

          {/* Live demo card */}
          <div className="relative lg:sticky lg:top-28">
            <div
              className="absolute -inset-6 rounded-3xl"
              style={{
                background:
                  "radial-gradient(ellipse at center, color-mix(in oklab, var(--emergency) 18%, transparent), transparent 70%)",
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass relative overflow-hidden rounded-2xl p-5 sm:p-6"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-destructive to-transparent" />

              <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/15 animate-emergency-flash">
                    <Siren className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Apollo Hospital · Mumbai</div>
                    <div className="text-xs text-muted-foreground">Request #LK-78421 · 12s ago</div>
                  </div>
                </div>
                <span className="rounded-full bg-destructive/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                  Critical
                </span>
              </div>

              <div className="mb-5 grid grid-cols-3 gap-3 rounded-xl bg-surface-elevated/60 p-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Group</div>
                  <div className="mt-1 flex items-center gap-1.5 text-lg font-semibold text-destructive">
                    <Droplet className="h-4 w-4" fill="currentColor" />
                    O−
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Units</div>
                  <div className="mt-1 text-lg font-semibold">3</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Window</div>
                  <div className="mt-1 flex items-center gap-1 text-lg font-semibold">
                    <Clock className="h-4 w-4 text-primary" />
                    45m
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {donors.map((d, i) => (
                  <motion.div
                    key={d.name}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface/50 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {d.name[0]}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{d.name}</div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {d.distance} · ETA {d.eta}
                        </div>
                      </div>
                    </div>
                    {d.status === "accepted" ? (
                      <span className="flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1 text-[11px] font-semibold text-primary">
                        <Check className="h-3 w-3" /> Accepted
                      </span>
                    ) : (
                      <div className="flex gap-1.5">
                        <button className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary hover:bg-primary/25">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button className="flex h-7 w-7 items-center justify-center rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
