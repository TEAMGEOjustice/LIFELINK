import { motion } from "framer-motion";
import { Siren, MapPin, Clock, Check, X, Droplet } from "lucide-react";

const donors = [
  { name: "A. Sharma", group: "O−", distance: "1.2 km", eta: "4 min", status: "accepted" },
  { name: "R. Mehta", group: "O−", distance: "2.4 km", eta: "7 min", status: "pending" },
  { name: "K. Iyer", group: "O−", distance: "3.1 km", eta: "9 min", status: "pending" },
];

export function EmergencyDemo() {
  return (
    <section id="emergency" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-destructive">
              Emergency mode
            </p>
            <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              When seconds <span className="text-gradient-emergency">matter most.</span>
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Hospitals raise a single request. Our matching engine ranks the closest available
              donors by blood group, distance, and donation gap — pushing live alerts in under
              two seconds.
            </p>
            <ul className="mt-8 space-y-3 text-sm">
              {[
                "Top 5 nearest verified donors",
                "Real-time accept / reject tracking",
                "Live ETA and route to hospital",
                "Panic Mode for mass alerts",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Mock alert UI */}
          <div className="relative">
            <div
              className="absolute -inset-6 rounded-3xl"
              style={{
                background:
                  "radial-gradient(ellipse at center, color-mix(in oklab, var(--emergency) 20%, transparent), transparent 70%)",
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="glass relative overflow-hidden rounded-2xl p-6"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-destructive to-transparent" />

              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/15 animate-emergency-flash">
                    <Siren className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Emergency request</div>
                    <div className="text-xs text-muted-foreground">
                      Apollo Hospital · 1.2 km away
                    </div>
                  </div>
                </div>
                <span className="rounded-full bg-destructive/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                  Critical
                </span>
              </div>

              <div className="mb-5 grid grid-cols-3 gap-3 rounded-xl bg-surface-elevated/60 p-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Group
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-lg font-semibold text-destructive">
                    <Droplet className="h-4 w-4" fill="currentColor" />
                    O−
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Units
                  </div>
                  <div className="mt-1 text-lg font-semibold">3</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Window
                  </div>
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
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
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
                        <button className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary transition-colors hover:bg-primary/25">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button className="flex h-7 w-7 items-center justify-center rounded-md bg-destructive/15 text-destructive transition-colors hover:bg-destructive/25">
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
      </div>
    </section>
  );
}
