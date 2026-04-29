import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/RequireAuth";
import { DashboardNav } from "@/components/DashboardNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { User, Building2, Phone, Save, Loader2, MapPin, Activity } from "lucide-react";

export const Route = createFileRoute("/profile")({
  component: () => (
    <RequireAuth>
      <ProfilePage />
    </RequireAuth>
  ),
});

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

function ProfilePage() {
  const { user } = useAuth();
  const [role, setRole] = useState<"donor" | "hospital" | "admin" | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  
  // Donor specific fields
  const [bloodGroup, setBloodGroup] = useState<string>("O+");
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      // 1. Get role
      const { data: roleData } = await supabase.rpc("get_user_role", { _user_id: user.id });
      setRole(roleData as any);

      // 2. Get main profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("name, phone, hospital_name")
        .eq("id", user.id)
        .maybeSingle();
        
      if (prof) {
        setName(prof.name || "");
        setPhone(prof.phone || "");
        setHospitalName(prof.hospital_name || "");
      }

      // 3. Get donor profile if donor
      if (roleData === "donor") {
        const { data: dProf } = await supabase
          .from("donor_profiles")
          .select("blood_group, is_available")
          .eq("user_id", user.id)
          .maybeSingle();
        if (dProf) {
          setBloodGroup(dProf.blood_group);
          setIsAvailable(dProf.is_available);
        }
      }

      setLoading(false);
    };

    loadProfile();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    try {
      // Update public.profiles
      const { error: pErr } = await supabase
        .from("profiles")
        .update({
          name,
          phone,
          hospital_name: role === "hospital" ? hospitalName : null,
        })
        .eq("id", user.id);

      if (pErr) throw pErr;

      // Update public.donor_profiles if donor
      if (role === "donor") {
        const { error: dErr } = await supabase
          .from("donor_profiles")
          .update({
            blood_group: bloodGroup as any,
            is_available: isAvailable,
          })
          .eq("user_id", user.id);

        if (dErr) throw dErr;
      }

      toast.success("Profile updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-black text-white">
        <DashboardNav />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-red-500" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <DashboardNav />
      <main className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
            <p className="text-muted-foreground mt-2">
              Manage your personal information and preferences.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <Card className="bg-zinc-950 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <User className="h-5 w-5 text-red-500" />
                  General Information
                </CardTitle>
                <CardDescription>
                  This information is used to contact you during emergencies.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {role === "hospital" && (
                  <div className="space-y-2">
                    <Label htmlFor="hospital_name">Hospital/Clinic Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                      <Input
                        id="hospital_name"
                        value={hospitalName}
                        onChange={(e) => setHospitalName(e.target.value)}
                        className="pl-9 bg-zinc-900 border-zinc-800"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">{role === "hospital" ? "Contact Person Name" : "Full Name"}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-9 bg-zinc-900 border-zinc-800"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-9 bg-zinc-900 border-zinc-800"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    value={user?.email || ""}
                    disabled
                    className="bg-zinc-900 border-zinc-800 text-zinc-500"
                  />
                  <p className="text-xs text-zinc-500">Email cannot be changed directly.</p>
                </div>
              </CardContent>
            </Card>

            {role === "donor" && (
              <Card className="bg-zinc-950 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Activity className="h-5 w-5 text-red-500" />
                    Medical & Availability
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2 max-w-sm">
                    <Label>Blood Group</Label>
                    <Select value={bloodGroup} onValueChange={setBloodGroup}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-800">
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950 border-zinc-800">
                        {BLOOD_GROUPS.map((g) => (
                          <SelectItem key={g} value={g} className="focus:bg-zinc-900">
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base font-semibold text-white">Available for Donation</Label>
                      <p className="text-sm text-zinc-400">
                        Turn this off if you are temporarily unable to donate (e.g., recently donated, health issues).
                      </p>
                    </div>
                    <Switch
                      checked={isAvailable}
                      onCheckedChange={setIsAvailable}
                      className="data-[state=checked]:bg-red-600"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-4">
              <Button
                type="submit"
                disabled={saving}
                className="bg-red-600 text-white hover:bg-red-700 w-full sm:w-auto min-w-[120px]"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
