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
import { Activity, AlertTriangle, MapPin, Plus, Users, CheckCircle, XCircle } from "lucide-react";

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
    setCreating(true);
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
      return toast.error(error?.message ?? "Failed to create");
    }

    const { data: count, error: rpcErr } = await supabase.rpc("notify_matched_donors", { _emergency_id: created.id });
    setCreating(false);
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
    <div className="min-h-screen bg-background">
      <DashboardNav title="Hospital dashboard" />
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{hospital?.hospital_name ?? "Hospital"}</h1>
          <p className="text-sm text-muted-foreground">Manage emergency requests and organ pledges in real time.</p>
        </div>

        <Tabs defaultValue="emergencies" className="w-full space-y-6">
          <TabsList className="grid w-[300px] grid-cols-2">
            <TabsTrigger value="emergencies">Blood Emergencies</TabsTrigger>
            <TabsTrigger value="organs">Organ Pledges</TabsTrigger>
          </TabsList>

          <TabsContent value="emergencies" className="space-y-6">
            {/* Create Emergency Card */}
            <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Plus className="size-5" /> Raise emergency request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createEmergency} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Blood group</Label>
                <Select value={form.blood_group} onValueChange={(v) => setForm({ ...form, blood_group: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Units</Label>
                <Input type="number" min={1} max={50} value={form.units_required} onChange={(e) => setForm({ ...form, units_required: parseInt(e.target.value) || 1 })} />
              </div>
              <div className="space-y-2">
                <Label>Urgency</Label>
                <Select value={form.urgency_level} onValueChange={(v) => setForm({ ...form, urgency_level: v as (typeof URGENCY)[number] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {URGENCY.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Patient info (optional)</Label>
                <Input value={form.patient_info} onChange={(e) => setForm({ ...form, patient_info: e.target.value })} placeholder="Brief note" maxLength={200} />
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <Button type="submit" disabled={creating} className="w-full sm:w-auto">
                  {creating ? "Matching donors…" : "Raise emergency & notify donors"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Emergencies List */}
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg sm:text-xl font-semibold">
            <Activity className="size-5" /> Active & past emergencies
          </h2>
          {emergencies.length === 0 && <p className="text-sm text-muted-foreground">No emergencies raised yet.</p>}
          <AnimatePresence>
            {emergencies.map((er) => {
              const resp = responses[er.id] ?? [];
              const accepted = resp.filter((r) => r.status === "accepted").length;
              const rejected = resp.filter((r) => r.status === "rejected").length;
              return (
                <motion.div
                  key={er.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  layout
                >
                  <Card className={`glass ${er.status === "open" ? "border-destructive/40" : er.status === "in_progress" ? "border-primary/40" : ""}`}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                            <span className="text-gradient-emergency font-bold">{er.blood_group}</span>
                            <span className="text-muted-foreground">·</span>
                            <span>{er.units_required} units</span>
                            <span className="text-muted-foreground">·</span>
                            <span className={urgencyColor(er.urgency_level)}>{er.urgency_level}</span>
                          </CardTitle>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(er.created_at).toLocaleString()} · {er.patient_info ?? "—"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={er.status === "open" ? "destructive" : er.status === "in_progress" ? "default" : "secondary"}>
                            {er.status}
                          </Badge>
                          {er.status !== "closed" && er.status !== "cancelled" && (
                            <Button size="sm" variant="outline" onClick={() => openCloseDialog(er)}>
                              Close & confirm
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="size-4" /> {resp.length} matched</span>
                        <span className="flex items-center gap-1 text-primary"><CheckCircle className="size-3.5" /> {accepted} accepted</span>
                        {rejected > 0 && (
                          <span className="flex items-center gap-1 text-destructive"><XCircle className="size-3.5" /> {rejected} declined</span>
                        )}
                      </div>
                      {resp.length === 0 && <p className="text-xs text-muted-foreground">No donor responses yet.</p>}
                      <div className="grid gap-2 sm:grid-cols-2">
                        {resp.map((r) => (
                          <div key={r.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                {(donorNames[r.user_id] ?? "D")[0]}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium truncate">{donorNames[r.user_id] ?? "Donor"}</div>
                                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <MapPin className="size-3" /> {r.distance_km?.toFixed(1) ?? "—"} km
                                </span>
                              </div>
                            </div>
                            <Badge
                              variant={r.status === "accepted" ? "default" : r.status === "rejected" ? "secondary" : "outline"}
                              className="shrink-0 ml-2"
                            >
                              {r.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        </TabsContent>

        <TabsContent value="organs" className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
              <Users className="size-5" /> Organ Pledges for {hospital?.hospital_name ?? "Hospital"}
            </h2>
            {organPledges.length === 0 && <p className="text-sm text-muted-foreground">No organ pledges directed to your hospital yet.</p>}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {organPledges.map((p) => (
                <Card key={p.id} className="glass">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="font-semibold text-lg truncate">{p.profiles?.name || "Unknown Donor"}</div>
                      <Badge variant={p.status === "registered" ? "default" : "secondary"}>{p.status}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {p.organs.map((o) => (
                        <Badge key={o} variant="outline" className="text-[10px] uppercase">{o.replace("_", " ")}</Badge>
                      ))}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Phone: </span>{p.profiles?.phone || "N/A"}
                    </div>
                    {p.medical_notes && (
                      <div className="text-xs text-muted-foreground bg-surface/50 p-2 rounded-md border border-border/40">
                        {p.medical_notes}
                      </div>
                    )}
                    <div className="pt-2 flex flex-wrap gap-2">
                      {p.status === "registered" && (
                        <Button size="sm" onClick={() => updatePledgeStatus(p.id, "approved")} className="w-full bg-success text-success-foreground hover:bg-success/90">
                          Approve Pledge
                        </Button>
                      )}
                      {p.status === "approved" && (
                        <Button size="sm" onClick={() => updatePledgeStatus(p.id, "transplanted")} className="w-full bg-primary/20 text-primary border border-primary/50 hover:bg-primary/30">
                          Mark Transplanted
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
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
