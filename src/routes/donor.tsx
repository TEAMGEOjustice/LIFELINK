import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/RequireAuth";
import { DashboardNav } from "@/components/DashboardNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Award, Bell, Droplet, MapPin, Siren, Clock, Building2, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/donor")({
  component: () => (
    <RequireAuth allow={["donor"]}>
      <DonorDashboard />
    </RequireAuth>
  ),
});

interface DonorProfile {
  blood_group: string;
  is_available: boolean;
  reward_points: number;
  last_donation_date: string | null;
  health_status: string | null;
}

interface NotificationRow {
  id: string;
  message: string;
  status: string;
  distance_km: number | null;
  created_at: string;
  emergency_id: string | null;
}

interface EmergencyPost {
  id: string;
  blood_group: string;
  units_required: number;
  urgency_level: string;
  status: string;
  created_at: string;
  patient_info: string | null;
  hospital_name: string | null;
}

function DonorDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<DonorProfile | null>(null);
  const [name, setName] = useState("");
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [emergencyPosts, setEmergencyPosts] = useState<EmergencyPost[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    if (!user) return;
    const [{ data: dp }, { data: p }] = await Promise.all([
      supabase.from("donor_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("name").eq("id", user.id).maybeSingle(),
    ]);
    setProfile(dp as DonorProfile | null);
    setName(p?.name ?? "");
  };

  const loadNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications((data as NotificationRow[]) ?? []);
  };

  const loadEmergencyPosts = async () => {
    // Fetch recent open/in_progress emergencies with hospital names
    const { data: ers } = await supabase
      .from("emergency_requests")
      .select("*")
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(10);

    if (ers && ers.length > 0) {
      // Fetch hospital names
      const hospitalIds = [...new Set(ers.map((e: any) => e.hospital_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, hospital_name, name")
        .in("id", hospitalIds);

      const nameMap: Record<string, string | null> = {};
      (profiles ?? []).forEach((p: any) => {
        nameMap[p.id] = p.hospital_name || p.name;
      });

      setEmergencyPosts(
        ers.map((e: any) => ({
          ...e,
          hospital_name: nameMap[e.hospital_id] ?? "Hospital",
        })),
      );
    } else {
      setEmergencyPosts([]);
    }
  };

  useEffect(() => {
    if (!user) return;
    Promise.all([loadProfile(), loadNotifications(), loadEmergencyPosts()]).finally(() => setLoading(false));

    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications((prev) => [payload.new as NotificationRow, ...prev]);
          toast.error("🚨 New emergency alert!", { description: (payload.new as NotificationRow).message });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "emergency_requests" },
        () => loadEmergencyPosts(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const toggleAvailability = async (next: boolean) => {
    if (!user || !profile) return;
    const { error } = await supabase
      .from("donor_profiles")
      .update({ is_available: next })
      .eq("user_id", user.id);
    if (error) return toast.error(error.message);
    setProfile({ ...profile, is_available: next });
    toast.success(next ? "You're now available" : "Marked unavailable");
  };

  const respond = async (notifId: string, accept: boolean) => {
    const { error } = await supabase.rpc("respond_to_notification", {
      _notification_id: notifId,
      _accept: accept,
    });
    if (error) return toast.error(error.message);
    toast.success(accept ? "Thanks — hospital notified" : "Declined");
    loadNotifications();
    loadProfile();
  };

  const acceptPublicEmergency = async (postId: string) => {
    if (!user) return;

    // Step 1: Check if we already have a notification for this emergency
    const { data: existingNotif } = await supabase
      .from("notifications")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("emergency_id", postId)
      .maybeSingle();

    if (existingNotif) {
      if (existingNotif.status === "accepted") {
        return toast.success("You have already accepted this emergency.");
      }
      // Accept the existing notification
      const { error } = await supabase.rpc("respond_to_notification", {
        _notification_id: existingNotif.id,
        _accept: true,
      });
      if (error) return toast.error(error.message);
      toast.success("Hospital notified — thank you! 💚");
      loadNotifications();
      loadProfile();
      return;
    }

    // Step 2: No notification exists yet — create one via the existing system RPC
    // notify_matched_donors is SECURITY DEFINER, so it bypasses RLS
    await supabase.rpc("notify_matched_donors", { _emergency_id: postId });

    // Step 3: Fetch the notification that was just created for us
    const { data: newNotif } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", user.id)
      .eq("emergency_id", postId)
      .maybeSingle();

    if (!newNotif) {
      return toast.error(
        "Could not match you to this emergency. Ensure your location is set and you haven't donated in the last 90 days."
      );
    }

    // Step 4: Accept it
    const { error } = await supabase.rpc("respond_to_notification", {
      _notification_id: newNotif.id,
      _accept: true,
    });
    if (error) return toast.error(error.message);
    toast.success("Hospital notified — thank you! 💚");
    loadNotifications();
    loadProfile();
  };

  const tier = profile && profile.reward_points >= 500
    ? "Platinum"
    : profile && profile.reward_points >= 300
      ? "Gold"
      : profile && profile.reward_points >= 150
        ? "Silver"
        : "Bronze";

  const tierColor = tier === "Platinum" ? "text-cyan-400" : tier === "Gold" ? "text-yellow-400" : tier === "Silver" ? "text-slate-300" : "text-amber-600";

  const urgencyColor = (u: string) => {
    switch (u) {
      case "critical": return "bg-red-500/15 text-red-400 border-red-500/30";
      case "high": return "bg-orange-500/15 text-orange-400 border-orange-500/30";
      case "medium": return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
      default: return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    }
  };

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav title="Donor" />
        <div className="flex items-center justify-center p-12">
          <div className="animate-pulse text-sm text-muted-foreground">Loading your dashboard…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav title="Donor dashboard" />
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Hi, {name || "donor"} 👋</h1>
          <p className="text-sm text-muted-foreground">Every alert here is a chance to save a life.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Blood group</CardTitle>
              <Droplet className="size-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-gradient-emergency">{profile?.blood_group ?? "—"}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Last: {profile?.last_donation_date ?? "Never"}</p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Availability</CardTitle>
              <Switch checked={!!profile?.is_available} onCheckedChange={toggleAvailability} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">
                {profile?.is_available ? <span className="text-gradient-success">ON</span> : <span className="text-muted-foreground">OFF</span>}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Toggle for emergency matches</p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Rewards</CardTitle>
              <Award className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-gradient-success">{profile?.reward_points ?? 0}</div>
              <Badge variant="secondary" className="mt-1 text-[10px]">
                <Trophy className={`size-3 mr-1 ${tierColor}`} />{tier}
              </Badge>
            </CardContent>
          </Card>

          <Card className="glass col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Quick links</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link to="/rewards" className="text-xs rounded-lg bg-primary/10 text-primary px-3 py-1.5 hover:bg-primary/20 transition-colors">
                🏅 Rewards
              </Link>
              <Link to="/organ" className="text-xs rounded-lg bg-primary/10 text-primary px-3 py-1.5 hover:bg-primary/20 transition-colors">
                🫀 Organ pledge
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Emergency Alerts (Notifications) */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Bell className="size-5" /> Your emergency alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No alerts yet. Stay available — we'll notify you the moment a match comes in.</p>
            )}
            <AnimatePresence>
              {notifications.map((n) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`rounded-xl border border-border/60 bg-surface p-3 sm:p-4 ${
                    n.status === "sent" ? "animate-emergency-flash" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base">{n.message}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {n.distance_km != null ? `${n.distance_km.toFixed(1)} km away` : "—"}
                        </span>
                        <span>·</span>
                        <span>{timeAgo(n.created_at)}</span>
                      </p>
                    </div>
                    {n.status === "sent" ? (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" onClick={() => respond(n.id, true)}>Accept</Button>
                        <Button size="sm" variant="outline" onClick={() => respond(n.id, false)}>Decline</Button>
                      </div>
                    ) : (
                      <Badge variant={n.status === "accepted" ? "default" : "secondary"} className="shrink-0">{n.status}</Badge>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Hospital Emergency Posts Feed */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Siren className="size-5 text-destructive" /> Live hospital emergencies
            </CardTitle>
          </CardHeader>
          <CardContent>
            {emergencyPosts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No active emergencies right now. The network is stable. 💚
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {emergencyPosts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border/40 bg-surface/60 p-3 sm:p-4"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                        <Building2 className="h-4 w-4 text-destructive" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{post.hospital_name}</p>
                        <p className="text-[10px] text-muted-foreground">{timeAgo(post.created_at)}</p>
                      </div>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${urgencyColor(post.urgency_level)}`}>
                      {post.urgency_level}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1 font-bold text-destructive">
                      <Droplet className="size-3.5" fill="currentColor" /> {post.blood_group}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span>{post.units_required} unit{post.units_required > 1 ? "s" : ""}</span>
                    <span className="text-muted-foreground">·</span>
                    <Badge variant={post.status === "open" ? "destructive" : "default"} className="text-[10px]">
                      {post.status}
                    </Badge>
                  </div>
                  {post.patient_info && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-1">{post.patient_info}</p>
                  )}
                  {profile?.is_available && profile.blood_group === post.blood_group && post.status === "open" && (
                    <div className="mt-3">
                      <Button
                        size="sm"
                        className="w-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50"
                        onClick={() => acceptPublicEmergency(post.id)}
                      >
                        Accept Match
                      </Button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
