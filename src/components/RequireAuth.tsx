import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

interface RequireAuthProps {
  children: ReactNode;
  allow?: ("donor" | "hospital" | "admin")[];
}

export function RequireAuth({ children, allow }: RequireAuthProps) {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (allow && role && !allow.includes(role)) {
      navigate({ to: role === "hospital" ? "/hospital" : "/donor" });
    }
  }, [user, role, loading, allow, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }
  if (allow && role && !allow.includes(role)) return null;
  return <>{children}</>;
}
