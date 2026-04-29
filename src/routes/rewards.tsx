import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/RequireAuth";
import { DashboardNav } from "@/components/DashboardNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Download, Trophy, Star, Shield, Crown } from "lucide-react";
import { downloadCertificate } from "@/lib/certificate";
import { motion } from "framer-motion";

export const Route = createFileRoute("/rewards")({
  component: () => (
    <RequireAuth allow={["donor"]}>
      <RewardsPage />
    </RequireAuth>
  ),
});

const TIER_CONFIG: Record<string, { gradient: string; icon: typeof Star; label: string }> = {
  bronze: { gradient: "from-amber-700 to-amber-500", icon: Shield, label: "Life Starter" },
  silver: { gradient: "from-slate-400 to-slate-200", icon: Star, label: "Life Giver" },
  gold: { gradient: "from-yellow-500 to-yellow-300", icon: Crown, label: "Life Champion" },
  platinum: { gradient: "from-cyan-300 to-purple-300", icon: Trophy, label: "Life Legend" },
};

const TIERS = [
  { name: "Bronze", key: "bronze", min: 0, max: 150, color: "text-amber-600" },
  { name: "Silver", key: "silver", min: 150, max: 300, color: "text-slate-300" },
  { name: "Gold", key: "gold", min: 300, max: 500, color: "text-yellow-400" },
  { name: "Platinum", key: "platinum", min: 500, max: Infinity, color: "text-cyan-300" },
];

function RewardsPage() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<any[]>([]);
  const [certs, setCerts] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  const loadData = () => {
    if (!user) return;
    Promise.all([
      supabase.from("badges").select("*").eq("user_id", user.id).order("awarded_at", { ascending: false }),
      supabase.from("certificates").select("*").eq("user_id", user.id).order("issued_at", { ascending: false }),
      supabase.from("profiles").select("name").eq("id", user.id).maybeSingle(),
      supabase.from("donor_profiles").select("blood_group, reward_points").eq("user_id", user.id).maybeSingle(),
    ]).then(([b, c, p, dp]) => {
      setBadges(b.data ?? []);
      setCerts(c.data ?? []);
      setProfile({ ...(p.data ?? {}), ...(dp.data ?? {}) });
    });
  };

  useEffect(() => {
    if (!user) return;
    loadData();

    const channel = supabase
      .channel(`rewards-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "badges", filter: `user_id=eq.${user.id}` },
        () => loadData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "certificates", filter: `user_id=eq.${user.id}` },
        () => loadData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "donor_profiles", filter: `user_id=eq.${user.id}` },
        () => loadData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const points = profile?.reward_points ?? 0;
  const currentTier = TIERS.find((t) => points >= t.min && points < t.max) ?? TIERS[0];
  const nextTier = TIERS[TIERS.indexOf(currentTier) + 1];
  const progress = nextTier
    ? ((points - currentTier.min) / (nextTier.min - currentTier.min)) * 100
    : 100;

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav title="Rewards & certificates" />
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">

        {/* Tier Progress Card */}
        <Card className="glass overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Trophy className={`size-6 ${currentTier.color}`} />
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold">{profile?.name ?? "Donor"}</h2>
                    <p className={`text-sm font-medium ${currentTier.color}`}>
                      {currentTier.name} · {TIER_CONFIG[currentTier.key]?.label}
                    </p>
                  </div>
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-gradient-success mt-2">{points} pts</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {certs.length} donations · {badges.length} badges
                </p>
              </div>
              {/* Tier progress */}
              <div className="w-full sm:w-64">
                {nextTier ? (
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{currentTier.name}</span>
                      <span>{nextTier.name} ({nextTier.min} pts)</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-surface-elevated overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(progress, 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {nextTier.min - points} pts to {nextTier.name}
                    </p>
                  </div>
                ) : (
                  <div className="text-center sm:text-right">
                    <Badge className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black">
                      MAX TIER REACHED
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tier overview */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {TIERS.map((t) => {
            const cfg = TIER_CONFIG[t.key];
            const isActive = currentTier.key === t.key;
            const Icon = cfg?.icon ?? Star;
            return (
              <motion.div
                key={t.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border p-3 sm:p-4 text-center transition-all ${
                  isActive
                    ? `border-primary/40 bg-primary/5 shadow-[0_0_20px_rgba(0,230,118,0.1)]`
                    : "border-border/30 bg-surface/40"
                }`}
              >
                <Icon className={`mx-auto size-6 sm:size-8 ${t.color} ${isActive ? "" : "opacity-40"}`} />
                <p className={`mt-2 text-xs sm:text-sm font-bold ${t.color}`}>{t.name}</p>
                <p className="text-[10px] text-muted-foreground">{cfg?.label}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t.max === Infinity ? `${t.min}+` : `${t.min}–${t.max}`} pts
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Badges */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Award className="size-5 text-primary" /> Badges
            </CardTitle>
          </CardHeader>
          <CardContent>
            {badges.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No badges yet. Donate to unlock your first.</p>}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
              {badges.map((b, i) => {
                const cfg = TIER_CONFIG[b.tier];
                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.08 }}
                    className={`rounded-xl bg-gradient-to-br ${cfg?.gradient ?? "from-zinc-700 to-zinc-500"} p-4 text-center text-zinc-900 shadow-lg`}
                  >
                    <Award className="mx-auto h-7 w-7 sm:h-8 sm:w-8" />
                    <p className="mt-2 text-xs sm:text-sm font-bold">{b.name}</p>
                    <Badge variant="outline" className="mt-1 capitalize text-[10px]">{b.tier}</Badge>
                    <p className="mt-1 text-[9px] opacity-70">
                      {new Date(b.awarded_at).toLocaleDateString()}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Certificates */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Certificates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {certs.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Certificates appear after each donation.</p>}
            {certs.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted-foreground truncate">{c.certificate_code}</p>
                  <p className="text-xs">Issued {new Date(c.issued_at).toLocaleDateString()}</p>
                  {c.metadata?.donation_number && (
                    <p className="text-[10px] text-primary mt-0.5">Donation #{c.metadata.donation_number}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    downloadCertificate({
                      donorName: profile?.name ?? "Donor",
                      bloodGroup: profile?.blood_group ?? "—",
                      certificateCode: c.certificate_code,
                      issuedAt: c.issued_at,
                      donationNumber: c.metadata?.donation_number,
                      type: c.metadata?.type || "blood_donation",
                    })
                  }
                >
                  <Download className="mr-1 size-3" /> PDF
                </Button>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
