import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/RequireAuth";
import { DashboardNav } from "@/components/DashboardNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Droplet, Clock, HandHelping, Search, Filter, Heart } from "lucide-react";

export const Route = createFileRoute("/inter-hospital")({
  component: () => (
    <RequireAuth allow={["hospital"]}>
      <InterHospitalPage />
    </RequireAuth>
  ),
});

const BLOOD_GROUPS = ["all", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
const URGENCY_FILTER = ["all", "low", "medium", "high", "critical"] as const;
const ORGAN_FILTER = ["all", "kidney", "liver", "heart", "lungs", "pancreas", "cornea", "bone_marrow", "skin"] as const;

interface HospitalDemand {
  id: string;
  hospital_id: string;
  blood_group: string;
  units_required: number;
  urgency_level: string;
  status: string;
  created_at: string;
  patient_info: string | null;
  hospital_name: string | null;
  hospital_contact: string | null;
}

interface OrganDemand {
  id: string;
  hospital_id: string;
  organ: string;
  urgency_level: string;
  status: string;
  created_at: string;
  patient_info: string | null;
  hospital_name: string | null;
  hospital_contact: string | null;
}

type TabType = "blood" | "organs";

function InterHospitalPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabType>("blood");
  const [demands, setDemands] = useState<HospitalDemand[]>([]);
  const [organDemands, setOrganDemands] = useState<OrganDemand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [bloodFilter, setBloodFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [organFilter, setOrganFilter] = useState("all");
  const [offeringIds, setOfferingIds] = useState<Set<string>>(new Set());

  const loadDemands = async () => {
    const { data: ers } = await supabase
      .from("emergency_requests")
      .select("*")
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (!ers || ers.length === 0) {
      setDemands([]);
    } else {
      const hospitalIds = [...new Set(ers.map((e: any) => e.hospital_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, hospital_name, phone")
        .in("id", hospitalIds);

      const profileMap: Record<string, any> = {};
      (profiles ?? []).forEach((p: any) => (profileMap[p.id] = p));

      const mapped = ers.map((e: any) => ({
        ...e,
        hospital_name: profileMap[e.hospital_id]?.hospital_name || profileMap[e.hospital_id]?.name || "Hospital",
        hospital_contact: profileMap[e.hospital_id]?.phone || null,
      }));

      setDemands(mapped.filter((d: any) => d.hospital_id !== user?.id));
    }
  };

  const loadOrganDemands = async () => {
    const { data: ors } = await supabase
      .from("organ_requests")
      .select("*")
      .in("status", ["pending_approval", "approved"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (!ors || ors.length === 0) {
      setOrganDemands([]);
    } else {
      const hospitalIds = [...new Set(ors.map((o: any) => o.hospital_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, hospital_name, phone")
        .in("id", hospitalIds);

      const profileMap: Record<string, any> = {};
      (profiles ?? []).forEach((p: any) => (profileMap[p.id] = p));

      const mapped = ors.map((o: any) => ({
        ...o,
        hospital_name: profileMap[o.hospital_id]?.hospital_name || profileMap[o.hospital_id]?.name || "Hospital",
        hospital_contact: profileMap[o.hospital_id]?.phone || null,
      }));

      setOrganDemands(mapped.filter((d: any) => d.hospital_id !== user?.id));
    }
  };

  useEffect(() => {
    Promise.all([loadDemands(), loadOrganDemands()]).finally(() => setLoading(false));
    const ch = supabase
      .channel("inter-hospital-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "emergency_requests" }, () => loadDemands())
      .on("postgres_changes", { event: "*", schema: "public", table: "organ_requests" }, () => loadOrganDemands())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleOffer = async (demand: HospitalDemand) => {
    if (!user) return;
    setOfferingIds((prev) => new Set([...prev, demand.id]));

    const myProfile = await supabase
      .from("profiles")
      .select("hospital_name, name, phone")
      .eq("id", user.id)
      .maybeSingle();

    const senderName = myProfile.data?.hospital_name || myProfile.data?.name || "A hospital";
    const senderPhone = myProfile.data?.phone || "N/A";

    const { error } = await supabase.from("notifications").insert({
      user_id: demand.hospital_id,
      emergency_id: demand.id,
      message: `🏥 Inter-hospital offer: ${senderName} can help with ${demand.blood_group} blood (${demand.units_required} units). Contact: ${senderPhone}`,
      type: "info" as const,
      status: "sent" as const,
    });

    if (error) {
      toast.error("Failed to send offer: " + error.message);
      setOfferingIds((prev) => {
        const next = new Set(prev);
        next.delete(demand.id);
        return next;
      });
    } else {
      toast.success(`Offer sent to ${demand.hospital_name}! They will be notified.`);
    }
  };

  const handleOrganOffer = async (demand: OrganDemand) => {
    if (!user) return;
    setOfferingIds((prev) => new Set([...prev, demand.id]));

    const myProfile = await supabase
      .from("profiles")
      .select("hospital_name, name, phone")
      .eq("id", user.id)
      .maybeSingle();

    const senderName = myProfile.data?.hospital_name || myProfile.data?.name || "A hospital";
    const senderPhone = myProfile.data?.phone || "N/A";

    const { error } = await supabase.from("notifications").insert({
      user_id: demand.hospital_id,
      message: `🫀 Organ offer: ${senderName} can assist with ${demand.organ.replace("_", " ")} request. Contact: ${senderPhone}`,
      type: "info" as const,
      status: "sent" as const,
    });

    if (error) {
      toast.error("Failed to send offer: " + error.message);
      setOfferingIds((prev) => {
        const next = new Set(prev);
        next.delete(demand.id);
        return next;
      });
    } else {
      toast.success(`Organ offer sent to ${demand.hospital_name}!`);
    }
  };

  const urgencyColor = (u: string) => {
    switch (u) {
      case "critical": return "bg-red-500/15 text-red-400 border-red-500/30";
      case "high": return "bg-orange-500/15 text-orange-400 border-orange-500/30";
      case "medium": return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
      default: return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    }
  };

  const urgencyPriority = (u: string) => {
    switch (u) {
      case "critical": return 0;
      case "high": return 1;
      case "medium": return 2;
      default: return 3;
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

  const filteredBlood = demands
    .filter((d) => {
      if (bloodFilter !== "all" && d.blood_group !== bloodFilter) return false;
      if (urgencyFilter !== "all" && d.urgency_level !== urgencyFilter) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        return (
          d.hospital_name?.toLowerCase().includes(s) ||
          d.blood_group.toLowerCase().includes(s) ||
          d.patient_info?.toLowerCase().includes(s)
        );
      }
      return true;
    })
    .sort((a, b) => urgencyPriority(a.urgency_level) - urgencyPriority(b.urgency_level));

  const filteredOrgans = organDemands
    .filter((d) => {
      if (organFilter !== "all" && d.organ !== organFilter) return false;
      if (urgencyFilter !== "all" && d.urgency_level !== urgencyFilter) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        return (
          d.hospital_name?.toLowerCase().includes(s) ||
          d.organ.toLowerCase().includes(s) ||
          d.patient_info?.toLowerCase().includes(s)
        );
      }
      return true;
    })
    .sort((a, b) => urgencyPriority(a.urgency_level) - urgencyPriority(b.urgency_level));

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav title="Inter-hospital demands" />
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Inter-Hospital <span className="text-gradient-success">Network</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View blood & organ demands from other hospitals. Offer help directly if you have available resources.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab("blood")}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${
              tab === "blood"
                ? "bg-destructive/20 text-destructive border border-destructive/40"
                : "bg-surface/60 text-muted-foreground border border-border/40 hover:bg-surface"
            }`}
          >
            <Droplet className="size-4" /> Blood Demands
            {demands.length > 0 && (
              <Badge variant="secondary" className="text-[10px] ml-1">{demands.length}</Badge>
            )}
          </button>
          <button
            onClick={() => setTab("organs")}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${
              tab === "organs"
                ? "bg-pink-500/20 text-pink-400 border border-pink-500/40"
                : "bg-surface/60 text-muted-foreground border border-border/40 hover:bg-surface"
            }`}
          >
            <Heart className="size-4" /> Organ Requests
            {organDemands.length > 0 && (
              <Badge variant="secondary" className="text-[10px] ml-1">{organDemands.length}</Badge>
            )}
          </button>
        </div>

        {/* Filters */}
        <Card className="glass">
          <CardContent className="pt-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={tab === "blood" ? "Search hospital or blood group…" : "Search hospital or organ…"}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              {tab === "blood" ? (
                <Select value={bloodFilter} onValueChange={setBloodFilter}>
                  <SelectTrigger>
                    <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map((g) => (
                      <SelectItem key={g} value={g}>{g === "all" ? "All blood groups" : g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={organFilter} onValueChange={setOrganFilter}>
                  <SelectTrigger>
                    <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Organ type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORGAN_FILTER.map((o) => (
                      <SelectItem key={o} value={o}>{o === "all" ? "All organs" : o.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger>
                  <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Urgency" />
                </SelectTrigger>
                <SelectContent>
                  {URGENCY_FILTER.map((u) => (
                    <SelectItem key={u} value={u}>{u === "all" ? "All urgency levels" : u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-sm text-muted-foreground">Loading demands…</div>
          </div>
        ) : tab === "blood" ? (
          /* ──── BLOOD TAB ──── */
          filteredBlood.length === 0 ? (
            <Card className="glass">
              <CardContent className="py-12 text-center">
                <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {demands.length === 0 ? "No active blood demands from other hospitals." : "No demands match your filters."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {filteredBlood.map((d, i) => (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04 }}
                    layout
                  >
                    <Card className={`glass h-full ${d.urgency_level === "critical" ? "border-red-500/30" : ""}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
                              <Building2 className="h-4 w-4 text-destructive" />
                            </div>
                            <div className="min-w-0">
                              <CardTitle className="text-sm font-medium truncate">{d.hospital_name}</CardTitle>
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                                <Clock className="size-2.5" /> {timeAgo(d.created_at)}
                              </div>
                            </div>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${urgencyColor(d.urgency_level)}`}>
                            {d.urgency_level}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-lg font-bold text-destructive">
                            <Droplet className="size-4" fill="currentColor" />
                            {d.blood_group}
                          </div>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-sm font-medium">{d.units_required} unit{d.units_required > 1 ? "s" : ""}</span>
                          <Badge variant={d.status === "open" ? "destructive" : "default"} className="ml-auto text-[10px]">
                            {d.status}
                          </Badge>
                        </div>
                        {d.patient_info && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{d.patient_info}</p>
                        )}
                        <Button
                          className="w-full"
                          variant={offeringIds.has(d.id) ? "secondary" : "default"}
                          size="sm"
                          disabled={offeringIds.has(d.id)}
                          onClick={() => handleOffer(d)}
                        >
                          {offeringIds.has(d.id) ? (
                            <>✓ Offer sent</>
                          ) : (
                            <>
                              <HandHelping className="size-4 mr-1.5" /> Offer to help
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )
        ) : (
          /* ──── ORGANS TAB ──── */
          filteredOrgans.length === 0 ? (
            <Card className="glass">
              <CardContent className="py-12 text-center">
                <Heart className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {organDemands.length === 0 ? "No active organ requests from other hospitals." : "No requests match your filters."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {filteredOrgans.map((d, i) => (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04 }}
                    layout
                  >
                    <Card className={`glass h-full ${d.urgency_level === "critical" ? "border-red-500/30" : ""}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pink-500/10">
                              <Heart className="h-4 w-4 text-pink-400" />
                            </div>
                            <div className="min-w-0">
                              <CardTitle className="text-sm font-medium truncate">{d.hospital_name}</CardTitle>
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                                <Clock className="size-2.5" /> {timeAgo(d.created_at)}
                              </div>
                            </div>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${urgencyColor(d.urgency_level)}`}>
                            {d.urgency_level}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-lg font-bold text-pink-400 capitalize">
                            <Heart className="size-4" fill="currentColor" />
                            {d.organ.replace("_", " ")}
                          </div>
                          <Badge variant={d.status === "pending_approval" ? "destructive" : "default"} className="ml-auto text-[10px]">
                            {d.status.replace("_", " ")}
                          </Badge>
                        </div>
                        {d.patient_info && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{d.patient_info}</p>
                        )}
                        <Button
                          className="w-full"
                          variant={offeringIds.has(d.id) ? "secondary" : "default"}
                          size="sm"
                          disabled={offeringIds.has(d.id)}
                          onClick={() => handleOrganOffer(d)}
                        >
                          {offeringIds.has(d.id) ? (
                            <>✓ Offer sent</>
                          ) : (
                            <>
                              <HandHelping className="size-4 mr-1.5" /> Offer organ assistance
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )
        )}

        <p className="text-center text-xs text-muted-foreground pt-4">
          Showing {tab === "blood" ? `${filteredBlood.length} of ${demands.length} blood demands` : `${filteredOrgans.length} of ${organDemands.length} organ requests`} from the network
        </p>
      </div>
    </div>
  );
}

