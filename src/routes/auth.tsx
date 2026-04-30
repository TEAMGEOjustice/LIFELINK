import { createFileRoute, useNavigate, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BloodDrop } from "@/components/BloodDrop";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { sanitizeText, validatePasswordStrength, createRateLimiter } from "@/lib/security";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
  phone: z.string().trim().min(7).max(20),
  role: z.enum(["donor", "hospital"]),
  blood_group: z.string().optional(),
  hospital_name: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && role) {
      navigate({ to: role === "hospital" ? "/hospital" : role === "admin" ? "/admin" : "/donor" });
    }
  }, [user, role, loading, navigate]);

  const router = useRouter();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <button
          onClick={() => {
            if (window.history.length > 1) router.history.back();
            else navigate({ to: "/" });
          }}
          className="absolute left-4 top-4 sm:left-6 sm:top-6 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-muted-foreground backdrop-blur-md transition-all hover:bg-white/10 hover:text-foreground"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
            <BloodDrop size={28} />
            <span className="text-2xl font-semibold tracking-tight">
              Life<span className="text-gradient-success">Link</span>
            </span>
          </Link>
          <div className="glass rounded-2xl p-6">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>
              <TabsContent value="login"><LoginForm /></TabsContent>
              <TabsContent value="signup"><SignupForm /></TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const limiter = useMemo(() => createRateLimiter(5, 60000), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!limiter.check()) {
      toast.error("Too many login attempts. Please wait a minute.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Welcome back");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        <div className="relative">
          <Input id="login-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>

    

    
    </form>
  );
}

function SignupForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "donor" as "donor" | "hospital",
    blood_group: "O+",
    hospital_name: "",
    latitude: "",
    longitude: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);

  // Auto-fetch location in background on mount (cached if recent)
  useEffect(() => {
    const cached = localStorage.getItem("ll_geo");
    if (cached) {
      try {
        const { lat, lng, ts } = JSON.parse(cached);
        if (Date.now() - ts < 1000 * 60 * 60) {
          setForm((f) => ({ ...f, latitude: lat, longitude: lng }));
          return;
        }
      } catch {
        /* ignore */
      }
    }
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setForm((f) => ({ ...f, latitude: lat, longitude: lng }));
        localStorage.setItem("ll_geo", JSON.stringify({ lat, lng, ts: Date.now() }));
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 },
    );
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation unavailable");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setForm((f) => ({ ...f, latitude: lat, longitude: lng }));
        localStorage.setItem("ll_geo", JSON.stringify({ lat, lng, ts: Date.now() }));
        setLocating(false);
        toast.success("Location captured");
      },
      () => {
        setLocating(false);
        toast.error("Could not get location — enter manually");
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 },
    );
  };

  const pwdStrength = validatePasswordStrength(form.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    const cleanName = sanitizeText(form.name);
    const cleanHospital = sanitizeText(form.hospital_name);
    const parsed = signupSchema.safeParse({
      ...form,
      name: cleanName,
      hospital_name: cleanHospital,
      latitude: lat,
      longitude: lng,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!pwdStrength.valid) {
      toast.error("Password is too weak. Use at least 6 characters.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          name: cleanName,
          phone: form.phone.trim(),
          role: form.role,
          latitude: form.latitude,
          longitude: form.longitude,
          blood_group: form.role === "donor" ? form.blood_group : undefined,
          hospital_name: form.role === "hospital" ? cleanHospital : undefined,
        },
      },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Account created — you're signed in");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-4">
      <div className="space-y-2">
        <Label>I am a</Label>
        <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as "donor" | "hospital" })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="donor">Donor</SelectItem>
            <SelectItem value="hospital">Hospital</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="su-name">{form.role === "hospital" ? "Contact name" : "Full name"}</Label>
        <Input id="su-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>

      {form.role === "hospital" && (
        <div className="space-y-2">
          <Label htmlFor="su-hosp">Hospital name</Label>
          <Input id="su-hosp" value={form.hospital_name} onChange={(e) => setForm({ ...form, hospital_name: e.target.value })} required />
        </div>
      )}

      {form.role === "donor" && (
        <div className="space-y-2">
          <Label>Blood group</Label>
          <Select value={form.blood_group} onValueChange={(v) => setForm({ ...form, blood_group: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="su-email">Email</Label>
        <Input id="su-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-phone">Phone</Label>
        <Input id="su-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-pwd">Password (min 6)</Label>
        <div className="relative">
          <Input id="su-pwd" type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="new-password" />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {form.password.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  pwdStrength.score <= 1 ? "bg-red-500" : pwdStrength.score <= 2 ? "bg-yellow-500" : pwdStrength.score <= 3 ? "bg-primary/70" : "bg-primary"
                }`}
                style={{ width: `${(pwdStrength.score / 5) * 100}%` }}
              />
            </div>
            <span className={`text-[10px] ${
              pwdStrength.score <= 1 ? "text-red-400" : pwdStrength.score <= 2 ? "text-yellow-400" : "text-primary"
            }`}>{pwdStrength.feedback}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label>Latitude</Label>
          <Input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Longitude</Label>
          <Input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} required />
        </div>
      </div>
      <Button type="button" variant="outline" className="w-full" onClick={useMyLocation} disabled={locating}>
        {locating ? "Locating…" : form.latitude ? "Update location" : "Use my location"}
      </Button>

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}
