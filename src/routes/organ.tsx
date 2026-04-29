import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/RequireAuth";
import { DashboardNav } from "@/components/DashboardNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ExternalLink, ShieldCheck, CircleCheckBig } from "lucide-react";

export const Route = createFileRoute("/organ")({
  head: () => ({
    meta: [
      { title: "Organ Donation Registration — LifeLink" },
      {
        name: "description",
        content:
          "Save your identity details and continue registration on the official NOTTO portal.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <OrganRegistrationPage />
    </RequireAuth>
  ),
});

const ID_PROOF_TYPES = [
  { value: "aadhaar", label: "Aadhaar" },
  { value: "passport", label: "Passport" },
  { value: "driving_license", label: "Driving License" },
  { value: "voter_id", label: "Voter ID" },
  { value: "other", label: "Other" },
] as const;

const NOTTO_REGISTER_URL = "https://www.notto.abdm.gov.in/";

type IdProofType = (typeof ID_PROOF_TYPES)[number]["value"];

function OrganRegistrationPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    dob: "",
    address: "",
    id_proof_type: "aadhaar" as IdProofType,
    id_proof_value: "",
  });
  const [confirmState, setConfirmState] = useState<{
    confirmed: boolean;
    at: string | null;
  }>({ confirmed: false, at: null });

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "name, dob, address, id_proof_type, id_proof_value, notto_self_confirmed_testing, notto_self_confirmed_at",
        )
        .eq("id", user.id)
        .maybeSingle();
      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      if (!data) return;
      setForm({
        name: data.name ?? "",
        dob: data.dob ?? "",
        address: data.address ?? "",
        id_proof_type: (data.id_proof_type as IdProofType) ?? "aadhaar",
        id_proof_value: data.id_proof_value ?? "",
      });
      setConfirmState({
        confirmed: !!data.notto_self_confirmed_testing,
        at: data.notto_self_confirmed_at ?? null,
      });
    };
    loadProfile();
  }, [user]);

  const validate = () => {
    if (form.name.trim().length < 2 || form.name.trim().length > 80) {
      toast.error("Name must be between 2 and 80 characters");
      return false;
    }
    if (!form.dob) {
      toast.error("DOB is required");
      return false;
    }
    if (!form.address.trim()) {
      toast.error("Address is required");
      return false;
    }
    if (!form.id_proof_type) {
      toast.error("ID proof type is required");
      return false;
    }
    if (!form.id_proof_value.trim()) {
      toast.error("ID proof value is required");
      return false;
    }
    return true;
  };

  const saveProfile = async (extra?: { markStarted?: boolean; markConfirmedTesting?: boolean }) => {
    if (!user) return { ok: false };
    if (!validate()) return { ok: false };

    setSaving(true);
    const now = new Date().toISOString();
    const payload: {
      name: string;
      dob: string;
      address: string;
      id_proof_type: IdProofType;
      id_proof_value: string;
      notto_registration_started_at?: string;
      notto_self_confirmed_testing?: boolean;
      notto_self_confirmed_at?: string;
    } = {
      name: form.name.trim(),
      dob: form.dob,
      address: form.address.trim(),
      id_proof_type: form.id_proof_type,
      id_proof_value: form.id_proof_value.trim(),
    };

    if (extra?.markStarted) {
      payload.notto_registration_started_at = now;
    }
    if (extra?.markConfirmedTesting) {
      payload.notto_self_confirmed_testing = true;
      payload.notto_self_confirmed_at = now;
    }

    const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return { ok: false };
    }
    return { ok: true, now };
  };

  const handleRegisterClick = async () => {
    const result = await saveProfile({ markStarted: true });
    if (!result.ok) return;
    toast.success("Details saved. Opening NOTTO registration...");
    window.open(NOTTO_REGISTER_URL, "_blank", "noopener,noreferrer");
  };

  const awardTestingBadgeAndCertificate = async () => {
    if (!user) return;

    const { data: existingBadge } = await supabase
      .from("badges")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", "NOTTO Self-Confirmed")
      .maybeSingle();

    if (!existingBadge) {
      await supabase.from("badges").insert({
        user_id: user.id,
        name: "NOTTO Self-Confirmed",
        tier: "silver",
      });
    }

    const { data: existingCert } = await supabase
      .from("certificates")
      .select("id")
      .eq("user_id", user.id)
      .contains("metadata", { type: "notto_self_confirmed_testing" })
      .limit(1)
      .maybeSingle();

    if (!existingCert) {
      await supabase.from("certificates").insert({
        user_id: user.id,
        metadata: {
          type: "notto_self_confirmed_testing",
          source: "organ_page_testing_button",
        },
      });
    }
  };

  const handleTestingConfirm = async () => {
    const result = await saveProfile({ markConfirmedTesting: true });
    if (!result.ok) return;
    await awardTestingBadgeAndCertificate();
    setConfirmState({ confirmed: true, at: result.now ?? new Date().toISOString() });
    toast.success("Testing confirmation saved. Badge/certificate synced.");
  };

  const confirmLabel = useMemo(() => {
    if (!confirmState.confirmed) return "Pending";
    if (!confirmState.at) return "Confirmed (testing)";
    return `Confirmed (testing) on ${new Date(confirmState.at).toLocaleString()}`;
  }, [confirmState]);

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav title="Organ donation registration" />
      <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Official organ donor registration
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            We will save your details, then take you to the official government form.
          </p>
        </div>

        <Card className="glass border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ShieldCheck className="size-5 text-primary" /> Keep this ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-sm">
              <Badge variant="outline" className="justify-center py-1.5">
                Name
              </Badge>
              <Badge variant="outline" className="justify-center py-1.5">
                DOB
              </Badge>
              <Badge variant="outline" className="justify-center py-1.5">
                Address
              </Badge>
              <Badge variant="outline" className="justify-center py-1.5">
                ID proof
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Your details (saved in LifeLink)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notto-name">Name</Label>
              <Input
                id="notto-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
                disabled={loading || saving}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="notto-dob">DOB</Label>
                <Input
                  id="notto-dob"
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                  disabled={loading || saving}
                />
              </div>

              <div className="space-y-2">
                <Label>ID proof type</Label>
                <Select
                  value={form.id_proof_type}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, id_proof_type: value as IdProofType }))
                  }
                  disabled={loading || saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ID_PROOF_TYPES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notto-id-proof">ID proof value</Label>
              <Input
                id="notto-id-proof"
                value={form.id_proof_value}
                onChange={(e) => setForm((f) => ({ ...f, id_proof_value: e.target.value }))}
                placeholder="Enter your ID number"
                disabled={loading || saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notto-address">Address</Label>
              <Textarea
                id="notto-address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Current residential address"
                rows={3}
                disabled={loading || saving}
              />
            </div>

            <div className="rounded-lg border border-border/50 bg-surface p-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Status: </span>
              {confirmLabel}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button onClick={handleRegisterClick} disabled={loading || saving}>
                <ExternalLink className="mr-2 size-4" />
                Register on NOTTO
              </Button>
              <Button variant="outline" onClick={handleTestingConfirm} disabled={loading || saving}>
                <CircleCheckBig className="mr-2 size-4" />
                Confirm registration (testing only)
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Even when using testing confirmation, complete official registration on NOTTO to
              finalize your government donor record.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
