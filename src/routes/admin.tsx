import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { DashboardNav } from "@/components/DashboardNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Activity, AlertTriangle, Droplet, Users, Trash2, Search, Hospital } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: () => (
    <RequireAuth allow={["admin"]}>
      <AdminDashboard />
    </RequireAuth>
  ),
});

function AdminDashboard() {
  const [stats, setStats] = useState({ donors: 0, hospitals: 0, emergencies: 0, donations: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    const [{ count: donors }, { count: hospitals }, { count: emergencies }, { count: donations }, { data: recentEmer }] =
      await Promise.all([
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "donor"),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "hospital"),
        supabase.from("emergency_requests").select("*", { count: "exact", head: true }),
        supabase.from("donations").select("*", { count: "exact", head: true }),
        supabase.from("emergency_requests").select("*").order("created_at", { ascending: false }).limit(10),
      ]);
    setStats({ donors: donors ?? 0, hospitals: hospitals ?? 0, emergencies: emergencies ?? 0, donations: donations ?? 0 });
    setRecent(recentEmer ?? []);
  };

  const loadUsers = async () => {
    setLoading(true);
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const { data: profiles } = await supabase.from("profiles").select("*");
    
    if (profiles && roles) {
      const combined = profiles.map(p => ({
        ...p,
        role: roles.find(r => r.user_id === p.id)?.role || 'unknown'
      }));
      setUsers(combined);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
    loadUsers();
    const ch = supabase
      .channel("admin-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "emergency_requests" }, loadStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "donations" }, loadStats)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const deleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to PERMANENTLY delete this user and all their data?")) return;
    
    const { error } = await supabase.rpc("delete_user_admin", { target_user_id: userId });
    if (error) return toast.error(error.message);
    
    toast.success("User deleted successfully");
    loadUsers();
    loadStats();
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) || 
    u.hospital_name?.toLowerCase().includes(search.toLowerCase())
  );

  const cards = [
    { title: "Donors", value: stats.donors, icon: Users, color: "text-success" },
    { title: "Hospitals", value: stats.hospitals, icon: Hospital, color: "text-primary" },
    { title: "Emergencies", value: stats.emergencies, icon: AlertTriangle, color: "text-destructive" },
    { title: "Donations", value: stats.donations, icon: Droplet, color: "text-destructive" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardNav title="Admin · Control Center" />
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Control</h1>
            <p className="text-sm text-muted-foreground italic">Manage users, track emergencies, and monitor system health.</p>
          </div>
          <Button onClick={() => { loadStats(); loadUsers(); }} variant="outline" size="sm">Refresh Data</Button>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <Card key={c.title} className="glass">
              <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{c.title}</CardTitle>
                <c.icon className={`size-4 ${c.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{c.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="feed" className="w-full space-y-6">
          <TabsList className="grid w-[400px] grid-cols-2">
            <TabsTrigger value="feed">Realtime Feed</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-6">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="size-5 text-primary" /> Recent emergencies
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recent.length === 0 && <p className="text-sm text-muted-foreground py-10 text-center">No emergencies yet.</p>}
                {recent.map((e) => (
                  <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 bg-surface/50 p-3 text-sm hover:bg-surface/80 transition-colors">
                    <div>
                      <span className="font-bold text-destructive">{e.blood_group}</span> · {e.units_required} units · <span className="capitalize">{e.urgency_level}</span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(e.created_at).toLocaleString()}</p>
                    </div>
                    <Badge variant={e.status === "open" ? "destructive" : e.status === "closed" ? "secondary" : "default"}>
                      {e.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name or hospital..." 
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <Card className="glass">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40 bg-surface/30">
                        <th className="px-4 py-3 text-left font-medium">User</th>
                        <th className="px-4 py-3 text-left font-medium">Role</th>
                        <th className="px-4 py-3 text-left font-medium">Contact</th>
                        <th className="px-4 py-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {loading ? (
                        <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground italic">Loading users...</td></tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground italic">No users found.</td></tr>
                      ) : filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium">{u.hospital_name || u.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{u.id}</div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={u.role === "hospital" ? "default" : u.role === "admin" ? "destructive" : "secondary"} className="capitalize">
                              {u.role}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {u.phone || "No phone"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => deleteUser(u.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
