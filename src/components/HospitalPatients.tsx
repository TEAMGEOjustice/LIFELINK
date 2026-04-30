import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Plus, PhoneCall } from "lucide-react";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

interface Patient {
  id: string;
  name: string;
  phone: string;
  blood_group: string;
  last_donation_date: string | null;
  notes: string | null;
}

export function HospitalPatients({ hospitalId }: { hospitalId: string }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    blood_group: "O+",
    last_donation_date: "",
    notes: "",
  });

  const loadPatients = async () => {
    const { data, error } = await supabase
      .from("hospital_patients")
      .select("*")
      .eq("hospital_id", hospitalId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load patients");
    } else {
      setPatients(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPatients();
  }, [hospitalId]);

  const addPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) return toast.error("Name and Phone are required");
    
    setSaving(true);
    const { error } = await supabase.from("hospital_patients").insert({
      hospital_id: hospitalId,
      name: form.name,
      phone: form.phone,
      blood_group: form.blood_group,
      last_donation_date: form.last_donation_date || null,
      notes: form.notes || null,
    });

    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Patient added to registry");
      setForm({ name: "", phone: "", blood_group: "O+", last_donation_date: "", notes: "" });
      loadPatients();
    }
  };

  const deletePatient = async (id: string) => {
    const { error } = await supabase.from("hospital_patients").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Patient removed");
      loadPatients();
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-red-500" />
            Add Patient / Offline Donor
          </CardTitle>
          <CardDescription>Register individuals into your hospital's internal database.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addPatient} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input 
                value={form.name} 
                onChange={(e) => setForm({...form, name: e.target.value})} 
                className="bg-surface border-border"
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input 
                value={form.phone} 
                onChange={(e) => setForm({...form, phone: e.target.value})} 
                className="bg-surface border-border"
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Blood Group</Label>
              <Select value={form.blood_group} onValueChange={(v) => setForm({ ...form, blood_group: v })}>
                <SelectTrigger className="bg-surface border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Last Donation Date</Label>
              <Input 
                type="date" 
                value={form.last_donation_date} 
                onChange={(e) => setForm({...form, last_donation_date: e.target.value})} 
                className="bg-surface border-border"
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label>Medical Notes / Location</Label>
              <Input 
                value={form.notes} 
                onChange={(e) => setForm({...form, notes: e.target.value})} 
                placeholder="E.g., Lives near station, Has high BP"
                className="bg-surface border-border"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
              <Button type="submit" disabled={saving} className="bg-red-600 hover:bg-red-700 text-white">
                {saving ? "Saving..." : "Add to Registry"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-red-500" />
            Patient & Donor Registry
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading registry...</p>
          ) : patients.length === 0 ? (
            <p className="text-muted-foreground text-sm">No patients added yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase text-muted-foreground bg-surface/50">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Name</th>
                    <th className="px-4 py-3">Blood Group</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3 text-right rounded-tr-lg">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p) => (
                    <tr key={p.id} className="border-b border-border hover:bg-surface/30">
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3">
                        <span className="text-red-500 font-bold">{p.blood_group}</span>
                      </td>
                      <td className="px-4 py-3">{p.phone}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate" title={p.notes || ""}>
                        {p.notes || "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" className="h-8 border-border bg-transparent hover:bg-surface" asChild>
                            <a href={`tel:${p.phone}`}>
                              <PhoneCall className="h-3 w-3 mr-1 text-green-500" /> Call
                            </a>
                          </Button>
                          <Button size="sm" variant="destructive" className="h-8 bg-destructive/10 hover:bg-destructive/20 text-destructive" onClick={() => deletePatient(p.id)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
