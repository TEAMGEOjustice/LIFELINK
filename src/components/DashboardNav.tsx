import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { BloodDrop } from "./BloodDrop";
import { Button } from "./ui/button";
import { ArrowLeft, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

export function DashboardNav({ title }: { title: string }) {
  const { signOut, role } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.history.back();
    } else {
      navigate({ to: "/" });
    }
  };

  const navLinks = [
    ...(role === "donor"
      ? [
          { to: "/donor" as const, label: "Dashboard" },
          { to: "/rewards" as const, label: "Rewards" },
          { to: "/organ" as const, label: "Organs" },
        ]
      : []),
    ...(role === "hospital"
      ? [
          { to: "/hospital" as const, label: "Dashboard" },
          { to: "/inter-hospital" as const, label: "Inter-Hospital" },
        ]
      : []),
    ...(role === "admin" ? [{ to: "/admin" as const, label: "Monitor" }] : []),
    { to: "/profile" as const, label: "Profile" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl pb-safe">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <Link to="/" className="flex items-center gap-2 shrink-0">
            <BloodDrop size={20} />
            <span className="text-base sm:text-lg font-semibold tracking-tight">
              Life<span className="text-gradient-success">Link</span>
            </span>
          </Link>
          <span className="hidden border-l border-border/60 pl-3 text-sm text-muted-foreground md:inline truncate">
            {title}
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors"
              activeProps={{ className: "rounded-lg px-3 py-1.5 text-sm text-foreground bg-foreground/5" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden rounded-full border border-border/60 bg-secondary/40 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground sm:inline">
            {role}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
          >
            <LogOut className="size-4 mr-1" /> Sign out
          </Button>
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl px-4 py-2 animate-fade-in">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-4 py-2.5 text-sm text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              activeProps={{ className: "block rounded-lg px-4 py-2.5 text-sm text-foreground bg-foreground/5" }}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
              setMobileOpen(false);
            }}
            className="mt-1 w-full rounded-lg px-4 py-2.5 text-left text-sm text-destructive hover:bg-foreground/5"
          >
            <LogOut className="size-3.5 inline mr-2" />
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
