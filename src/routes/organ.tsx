import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/RequireAuth";
import { DashboardNav } from "@/components/DashboardNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Heart, ShieldCheck, Building2 } from "lucide-react";

const ORGANS = ["kidney", "liver", "heart", "lungs", "pancreas", "cornea", "bone_marrow", "skin"] as const;

export const Route = createFileRoute("/organ")({
  head: () => ({
    meta: [
      { title: "Organ Donation Registry — LifeLink" },
      { name: "description", content: "Pledge to be an organ donor. Save up to 8 lives. Legal consent + medical workflow." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <OrganRegistry />
    </RequireAuth>
  ),
});

interface Pledge {
  id: string;
  organs: string[];
  consent_given: boolean;
  next_of_kin_name: string | null;
  next_of_kin_phone: string | null;
  status: string;
  pledged_at: string;
}

function OrganRegistry() {
  const { user } = useAuth();
  const [pledge, setPledge] = useState<Pledge | null>(null);
  const [selectedOrgans, setSelectedOrgans] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [nokName, setNokName] = useState("");
  const [nokPhone, setNokPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [hospitals, setHospitals] = useState<{ id: string; name: string }[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<string>("any");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("organ_pledges")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPledge(data as any);
          setSelectedOrgans((data as any).organs);
          setConsent((data as any).consent_given);
          setNokName((data as any).next_of_kin_name ?? "");
          setNokPhone((data as any).next_of_kin_phone ?? "");
          setSelectedHospital((data as any).hospital_id ?? "any");
        }
      });
  }, [user]);

  useEffect(() => {
    const fetchHospitals = async () => {
      const { data: hospitalRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "hospital");
      if (!hospitalRoles || hospitalRoles.length === 0) return;
      
      const ids = hospitalRoles.map((r: any) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, hospital_name, name, latitude, longitude")
        .in("id", ids);

      if (profiles) {
        // Fetch user profile for distance calculation
        const { data: userProf } = await supabase
          .from("profiles")
          .select("latitude, longitude")
          .eq("id", user?.id)
          .maybeSingle();

        const sorted = profiles.map((h: any) => {
          let distance = null;
          if (userProf?.latitude && userProf?.longitude && h.latitude && h.longitude) {
            const rad = Math.PI / 180;
            const lat1 = userProf.latitude * rad;
            const lat2 = h.latitude * rad;
            const dLat = (h.latitude - userProf.latitude) * rad;
            const dLon = (h.longitude - userProf.longitude) * rad;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(lat1) * Math.cos(lat2) *
                      Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            distance = 6371 * c; // KM
          }
          return { ...h, distance };
        }).sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

        setHospitals(
          sorted.map((h: any) => ({ 
            id: h.id, 
            name: h.hospital_name || h.name || "Unknown Hospital",
            distance: h.distance 
          }))
        );
      }
    };
    fetchHospitals();
  }, [user]);

  const toggleOrgan = (o: string) =>
    setSelectedOrgans((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]));

  const submit = async () => {
    if (!user) return;
    if (!consent) return toast.error("Please give consent to register");
    if (selectedOrgans.length === 0) return toast.error("Select at least one organ");
    if (!nokName || !nokPhone) return toast.error("Next of kin info required");

    setLoading(true);
    const payload: any = {
      user_id: user.id,
      organs: selectedOrgans,
      consent_given: consent,
      next_of_kin_name: nokName,
      next_of_kin_phone: nokPhone,
      medical_notes: notes,
      hospital_id: selectedHospital === "any" ? null : selectedHospital,
    };
    const { error } = pledge
      ? await supabase.from("organ_pledges").update(payload).eq("id", pledge.id)
      : await supabase.from("organ_pledges").insert(payload);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Pledge registered. You're a hero. 💚");
    const { data } = await supabase.from("organ_pledges").select("*").eq("user_id", user.id).maybeSingle();
    if (data) setPledge(data as any);
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav title="Organ donation registry" />
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pledge your organs</h1>
          <p className="text-sm text-muted-foreground">One donor can save up to 8 lives. Your pledge is legally documented.</p>
        </div>

        {pledge && (
          <Card className="glass border-success/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-success" /> Active pledge
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-2">
                {pledge.organs.map((o) => (
                  <Badge key={o} variant="secondary">{o.replace("_", " ")}</Badge>
                ))}
              </div>
              <p className="text-muted-foreground">Status: {pledge.status} · Pledged {new Date(pledge.pledged_at).toLocaleDateString()}</p>
            </CardContent>
          </Card>
        )}

        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="size-5 text-destructive" fill="currentColor" />
              {pledge ? "Update pledge" : "Register pledge"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">Organs you wish to donate</label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {ORGANS.map((o) => (
                  <label
                    key={o}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm capitalize transition-colors ${
                      selectedOrgans.includes(o) ? "border-primary bg-primary/10" : "border-border bg-surface"
                    }`}
                  >
                    <Checkbox checked={selectedOrgans.includes(o)} onCheckedChange={() => toggleOrgan(o)} />
                    {o.replace("_", " ")}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Preferred Hospital (Optional)</label>
              <Select value={selectedHospital} onValueChange={setSelectedHospital}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Any verified hospital" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any verified hospital</SelectItem>
                  {hospitals.map((h: any) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name} {h.distance ? `(${h.distance.toFixed(1)} km)` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">Selecting a specific hospital directs your pledge directly to their organ registry panel.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Next of kin name</label>
                <Input value={nokName} onChange={(e) => setNokName(e.target.value)} placeholder="Family member name" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Next of kin phone</label>
                <Input value={nokPhone} onChange={(e) => setNokPhone(e.target.value)} placeholder="+91..." />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Medical notes (optional)</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Allergies, conditions, medications..." rows={3} />
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4 text-sm">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} className="mt-0.5" />
              <span>
                I voluntarily pledge to donate the selected organ(s) after my death. I understand this pledge is recorded
                and will be communicated to my next of kin and authorized medical authorities. I can withdraw consent
                anytime.
              </span>
            </label>

            <Button onClick={submit} disabled={loading} className="w-full">
              {loading ? "Saving..." : pledge ? "Update pledge" : "Register my pledge"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
