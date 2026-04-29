import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/RequireAuth";
import { DashboardNav } from "@/components/DashboardNav";
import { DonationConfirmDialog } from "@/components/DonationConfirmDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, AlertTriangle, MapPin, Plus, Users, CheckCircle, XCircle, Siren, Play, Pause, Radio, Waves, Route as RouteIcon } from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { useMapInit } from "@/hooks/useMapInit";
import { MapSection } from "@/components/MapSection";

export const Route = createFileRoute("/hospital")({
  component: () => (
    <RequireAuth allow={["hospital"]}>
      <HospitalDashboard />
    </RequireAuth>
  ),
});

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
const URGENCY = ["low", "medium", "high", "critical"] as const;

interface EmergencyRow {
  id: string;
  blood_group: string;
  units_required: number;
  urgency_level: string;
  status: string;
  created_at: string;
  patient_info: string | null;
}

interface NotifRow {
  id: string;
  user_id: string;
  status: string;
  distance_km: number | null;
  emergency_id: string | null;
}

interface OrganPledgeRow {
  id: string;
  user_id: string;
  organs: string[];
  consent_given: boolean;
  status: string;
  pledged_at: string;
  medical_notes: string | null;
  profiles: { name: string; phone: string | null };
}

function HospitalDashboard() {
  const { user } = useAuth();
  const [hospital, setHospital] = useState<{ name: string; hospital_name: string | null; latitude: number | null; longitude: number | null } | null>(null);
  const [emergencies, setEmergencies] = useState<EmergencyRow[]>([]);
  const [responses, setResponses] = useState<Record<string, NotifRow[]>>({});
  const [donorNames, setDonorNames] = useState<Record<string, string>>({});
  const [organPledges, setOrganPledges] = useState<OrganPledgeRow[]>([]);
  const [creating, setCreating] = useState(false);
  const matchingState = useSimulationStore((s) => s.animations.routing ? "matching" : "idle"); // Simplified for now
  const [aiLogs, setAiLogs] = useState<string[]>([]);
  const { setSearchRadius, addEmergency, highlightMatchedDonors } = useSimulationStore();

  // 🗺 Seed real Bangalore hospitals + donors + demo emergency
  useMapInit(hospital?.latitude && hospital?.longitude ? { latitude: hospital.latitude, longitude: hospital.longitude } : undefined);

  // Donation confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    emergencyId: string;
    accepted: NotifRow[];
  }>({ open: false, emergencyId: "", accepted: [] });

  const [form, setForm] = useState({
    blood_group: "O+",
    units_required: 1,
    urgency_level: "high" as (typeof URGENCY)[number],
    patient_info: "",
  });

  const loadAll = async () => {
    if (!user) return;
    const { data: prof } = await supabase
      .from("profiles")
      .select("name, hospital_name, latitude, longitude")
      .eq("id", user.id)
      .maybeSingle();
    setHospital(prof as typeof hospital);

    const { data: ers } = await supabase
      .from("emergency_requests")
      .select("*")
      .eq("hospital_id", user.id)
      .order("created_at", { ascending: false });
    setEmergencies((ers as EmergencyRow[]) ?? []);

    if (ers && ers.length) {
      const ids = ers.map((e) => e.id);
      const { data: notifs } = await supabase
        .from("notifications")
        .select("*")
        .in("emergency_id", ids);
      const grouped: Record<string, NotifRow[]> = {};
      const userIds = new Set<string>();
      ((notifs as NotifRow[]) ?? []).forEach((n) => {
        if (!n.emergency_id) return;
        grouped[n.emergency_id] ??= [];
        grouped[n.emergency_id].push(n);
        userIds.add(n.user_id);
      });
      setResponses(grouped);
      if (userIds.size) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", Array.from(userIds));
        const names: Record<string, string> = {};
        ((profiles as any[]) ?? []).forEach((p) => {
          names[p.id] = p.name;
        });
        setDonorNames(names);
      }
    }

    const { data: pledges } = await supabase
      .from("organ_pledges")
      .select("*, profiles(name, phone)")
      .eq("hospital_id", user.id)
      .order("pledged_at", { ascending: false });
    setOrganPledges((pledges as any) || []);
  };

  useEffect(() => {
    loadAll();
    if (!user) return;
    const ch = supabase
      .channel(`hosp-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "emergency_requests", filter: `hospital_id=eq.${user.id}` }, () => loadAll())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const createEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !hospital?.latitude || !hospital?.longitude) {
      return toast.error("Hospital location missing — update your profile");
    }
    const hospLoc = { latitude: hospital.latitude, longitude: hospital.longitude };
    setCreating(true);
    setMatchingState("matching");
    setAiLogs([`> Initializing LifeLink AI Engine...`]);
    await new Promise(r => setTimeout(r, 600));
    setAiLogs(p => [...p, `> Scanning 15km radius from ${hospital?.hospital_name || 'Hospital'}...`]);
    setSearchRadius({ center: hospLoc, radiusKm: 15 });
    await new Promise(r => setTimeout(r, 800));
    setAiLogs(p => [...p, `> Found active profiles. Filtering for ${form.blood_group}...`]);
    highlightMatchedDonors(form.blood_group, hospLoc);
    await new Promise(r => setTimeout(r, 800));
    setAiLogs(p => [...p, `> Applying Trust Score heuristics...`]);

    const { data: created, error } = await supabase
      .from("emergency_requests")
      .insert({
        hospital_id: user.id,
        blood_group: form.blood_group as typeof BLOOD_GROUPS[number],
        units_required: form.units_required,
        urgency_level: form.urgency_level,
        patient_info: form.patient_info || null,
        latitude: hospital.latitude,
        longitude: hospital.longitude,
      })
      .select()
      .single();

    if (error || !created) {
      setCreating(false);
      setMatchingState("idle");
      return toast.error(error?.message ?? "Failed to create");
    }

    await new Promise(r => setTimeout(r, 600));
    setAiLogs(p => [...p, `> Optimal targets identified. Dispatching secure alerts...`]);

    const { data: count, error: rpcErr } = await supabase.rpc("notify_matched_donors", { _emergency_id: created.id });
    
    await new Promise(r => setTimeout(r, 1200));
    setCreating(false);
    setMatchingState("idle");
    setAiLogs([]);
    setSearchRadius(null);
    addEmergency({
      id: created.id,
      blood_group: form.blood_group,
      units_required: form.units_required,
      urgency: form.urgency_level as 'critical'|'high'|'medium'|'low',
      location: hospLoc,
      created_at: Date.now()
    });

    if (rpcErr) {
      toast.error(rpcErr.message);
    } else if (count === 0) {
      toast.warning("Emergency raised but no matching donors found nearby. This could mean:\n• No donors with matching blood group\n• All nearby donors unavailable\n• Donors donated within 90 days", {
        duration: 8000,
      });
    } else {
      toast.success(`Emergency raised — notified ${count} donor(s)`);
    }
    setForm({ blood_group: "O+", units_required: 1, urgency_level: "high", patient_info: "" });
    loadAll();
  };

  const openCloseDialog = (er: EmergencyRow) => {
    const resp = responses[er.id] ?? [];
    const accepted = resp.filter((r) => r.status === "accepted");
    setConfirmDialog({
      open: true,
      emergencyId: er.id,
      accepted,
    });
  };

  const updatePledgeStatus = async (pledgeId: string, status: string) => {
    const { error } = await supabase.from("organ_pledges").update({ status }).eq("id", pledgeId);
    if (error) return toast.error(error.message);
    toast.success("Pledge status updated");
    loadAll();
  };

  const urgencyColor = (u: string) => {
    switch (u) {
      case "critical": return "text-red-400";
      case "high": return "text-orange-400";
      case "medium": return "text-yellow-400";
      default: return "text-blue-400";
    }
  };

  return (
    <div className={`min-h-screen ${matchingState === "matching" ? "bg-black text-green-500 overflow-hidden" : "bg-background"}`}>
      {matchingState === "matching" && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 text-green-500 p-6">
          <div className="w-full max-w-3xl space-y-8">
            <div className="flex items-center justify-center">
              <div className="relative flex size-40 items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-green-500/30" />
                <div className="absolute inset-4 rounded-full border border-green-500/20" />
                <div className="absolute inset-8 rounded-full border border-green-500/10" />
                <motion.div 
                  animate={{ rotate: 360 }} 
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-t-2 border-green-500 border-r-2 border-r-transparent border-l-2 border-l-transparent border-b-2 border-b-transparent opacity-60"
                />
                <Activity className="size-10 animate-pulse text-green-400" />
              </div>
            </div>
            
            <div className="font-mono text-sm sm:text-base bg-black/50 p-6 rounded-lg border border-green-500/30 min-h-[200px] shadow-[0_0_15px_rgba(34,197,94,0.2)]">
              <h3 className="mb-4 text-green-400 font-bold border-b border-green-500/30 pb-2 flex items-center gap-2">
                <AlertTriangle className="size-4" /> LIFELINK COMMAND CENTER
              </h3>
              <div className="space-y-2">
                {aiLogs.map((log, idx) => (
                  <motion.div 
                    key={idx} 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }}
                  >
                    {log}
                  </motion.div>
                ))}
                <motion.div 
                  animate={{ opacity: [1, 0] }} 
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="inline-block w-2 h-4 bg-green-500 ml-1 translate-y-1"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {!matchingState || matchingState !== "matching" ? <DashboardNav title="Hospital dashboard" /> : null}
      <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{hospital?.hospital_name ?? "Hospital"}</h1>
          <p className="text-sm text-muted-foreground">Manage emergency requests and organ pledges in real time.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Emergency Feed */}
          <div className="lg:col-span-3 space-y-4">
            <h2 className="flex items-center gap-2 text-lg sm:text-xl font-semibold">
              <Activity className="size-5 text-red-500" /> Live Feed
            </h2>
            <div className="space-y-4 h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {emergencies.length === 0 && <p className="text-sm text-muted-foreground">No emergencies raised yet.</p>}
              <AnimatePresence>
                {emergencies.map((er) => {
                  const resp = responses[er.id] ?? [];
                  const accepted = resp.filter((r) => r.status === "accepted").length;
                  return (
                    <motion.div
                      key={er.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      layout
                    >
                      <Card className={`glass-card ${er.status === "open" ? "border-destructive/40" : er.status === "in_progress" ? "border-primary/40" : ""}`}>
                        <CardHeader className="p-3 pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-gradient-emergency font-bold text-lg">{er.blood_group}</span>
                              <p className="text-xs text-muted-foreground">{er.units_required} units • {er.urgency_level}</p>
                            </div>
                            <Badge variant={er.status === "open" ? "destructive" : "secondary"} className="text-[10px]">{er.status}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                            <span className="flex items-center gap-1"><Users className="size-3" /> {resp.length} matched</span>
                            <span className="flex items-center gap-1 text-primary"><CheckCircle className="size-3" /> {accepted} accepted</span>
                          </div>
                          {er.status !== "closed" && er.status !== "cancelled" && (
                            <Button size="sm" variant="outline" className="w-full mt-3 h-7 text-xs" onClick={() => openCloseDialog(er)}>
                              Manage Match
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* CENTER COLUMN: Live Map */}
          <div className="lg:col-span-6">
             <MapSection 
                centerCoords={hospital?.latitude && hospital?.longitude ? { latitude: hospital.latitude, longitude: hospital.longitude } : undefined} 
                role="hospital" 
             />
          </div>

          {/* RIGHT COLUMN: Action Panel */}
          <div className="lg:col-span-3 space-y-6">
            <Tabs defaultValue="emergencies" className="w-full space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="emergencies">New Alert</TabsTrigger>
                <TabsTrigger value="organs">Pledges</TabsTrigger>
              </TabsList>

              <TabsContent value="emergencies" className="space-y-4">
                <Card className="glass-card border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base text-red-500">
                      <Siren className="size-5" /> Broadcast Emergency
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={createEmergency} className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Blood group</Label>
                        <Select value={form.blood_group} onValueChange={(v) => setForm({ ...form, blood_group: v })}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Units</Label>
                          <Input className="h-8" type="number" min={1} max={50} value={form.units_required} onChange={(e) => setForm({ ...form, units_required: parseInt(e.target.value) || 1 })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Urgency</Label>
                          <Select value={form.urgency_level} onValueChange={(v) => setForm({ ...form, urgency_level: v as (typeof URGENCY)[number] })}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {URGENCY.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button type="submit" disabled={creating} className="w-full bg-red-600 hover:bg-red-700 text-white mt-4 font-bold shadow-[0_0_10px_rgba(220,38,38,0.5)] transition-all hover:scale-[1.02]">
                        {creating ? "MATCHING DONORS…" : "INITIATE AI MATCH"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="organs" className="space-y-4">
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {organPledges.length === 0 && <p className="text-sm text-muted-foreground">No pledges yet.</p>}
                  {organPledges.map((p) => (
                    <Card key={p.id} className="glass-card">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="font-semibold text-sm truncate">{p.profiles?.name || "Unknown"}</div>
                          <Badge variant={p.status === "registered" ? "default" : "secondary"} className="text-[10px]">{p.status}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {p.organs.map((o) => (
                            <Badge key={o} variant="outline" className="text-[9px] uppercase">{o.replace("_", " ")}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Donation confirm dialog */}
      <DonationConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(v) => setConfirmDialog((p) => ({ ...p, open: v }))}
        emergencyId={confirmDialog.emergencyId}
        hospitalId={user?.id ?? ""}
        acceptedDonors={confirmDialog.accepted}
        donorNames={donorNames}
        onConfirmed={loadAll}
      />
    </div>
  );
}
