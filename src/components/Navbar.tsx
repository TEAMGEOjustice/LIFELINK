import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { BloodDrop } from "./BloodDrop";
import { Menu, X, LayoutDashboard } from "lucide-react";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/impact", label: "Impact" },
  { to: "/benefits", label: "Benefits" },
  { to: "/organ", label: "Organ" },
  { to: "/emergency", label: "Emergency" },
] as const;

export function Navbar() {
  const location = useLocation();
  const { user, role } = useAuth();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [capsule, setCapsule] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Position the hover capsule
  useEffect(() => {
    const idx =
      hoverIdx !== null
        ? hoverIdx
        : navItems.findIndex((n) => n.to === location.pathname);
    if (idx < 0) {
      setCapsule(null);
      return;
    }
    const el = itemRefs.current[idx];
    if (!el) return;
    const parent = el.parentElement!;
    const r = el.getBoundingClientRect();
    const pr = parent.getBoundingClientRect();
    setCapsule({ left: r.left - pr.left, width: r.width });
  }, [hoverIdx, location.pathname]);

  const dashboardTo = role === "hospital" ? "/hospital" : role === "admin" ? "/admin" : "/donor";

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6 sm:pt-4">
        <nav
          className="flex items-center justify-between rounded-2xl px-3 py-2.5 sm:px-5 sm:py-3 transition-all duration-300 backdrop-blur-xl"
          style={{
            background: scrolled ? "var(--nav-bg-scrolled)" : "var(--nav-bg-default)",
            border: `1px solid ${scrolled ? "var(--nav-border-scrolled)" : "var(--nav-border-default)"}`,
            boxShadow: scrolled ? "var(--nav-shadow-scrolled)" : "none",
          }}
        >
          <Link to="/" className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="relative">
              <BloodDrop size={20} />
              <div className="absolute -inset-1 rounded-full bg-destructive/30 blur-md -z-10" />
            </div>
            <span className="text-base sm:text-lg font-semibold tracking-tight">
              Life<span className="text-gradient-success">Link</span>
            </span>
          </Link>

          {/* Desktop nav with hover capsule */}
          <div
            className="relative hidden md:flex items-center gap-1"
            onMouseLeave={() => setHoverIdx(null)}
          >
            {capsule && (
              <span
                aria-hidden
                className="absolute top-1/2 -translate-y-1/2 rounded-full transition-all duration-300 ease-out"
                style={{
                  left: capsule.left,
                  width: capsule.width,
                  height: 34,
                  transitionProperty: "left, width, opacity",
                  background: "var(--nav-capsule-bg)",
                }}
              />
            )}
            {navItems.map((item, i) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  onMouseEnter={() => setHoverIdx(i)}
                  className={`relative z-10 px-3.5 py-2 text-sm rounded-full transition-colors duration-200 ${
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {user && role ? (
              /* Logged in — show dashboard button */
              <Link
                to={dashboardTo}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition-all duration-150 hover:shadow-[var(--glow-success)] active:scale-95"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            ) : (
              /* Not logged in */
              <>
                <Link
                  to="/auth"
                  className="hidden sm:inline-flex rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-all duration-150 hover:text-foreground"
                  style={{ ["--tw-bg-opacity" as string]: 1 }}
                >
                  Sign in
                </Link>
                <Link
                  to="/auth"
                  className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition-all duration-150 hover:shadow-[var(--glow-success)] active:scale-95"
                >
                  Get started
                </Link>
              </>
            )}
            <button
              onClick={() => setOpen((o) => !o)}
              className="md:hidden ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
              style={{ background: "transparent" }}
              aria-label="Menu"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        {open && (
          <div
            className="md:hidden mt-2 rounded-2xl backdrop-blur-xl p-2 animate-fade-in"
            style={{
              background: "var(--nav-mobile-bg)",
              border: "1px solid var(--nav-border-scrolled)",
            }}
          >
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground"
                activeProps={{ className: "block rounded-lg px-4 py-2.5 text-sm text-foreground bg-foreground/5" }}
              >
                {item.label}
              </Link>
            ))}
            {user && role ? (
              <Link
                to={dashboardTo}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-4 py-2.5 text-sm text-primary font-medium"
              >
                <LayoutDashboard className="h-3.5 w-3.5 inline mr-2" />
                Dashboard
              </Link>
            ) : (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-4 py-2.5 text-sm text-primary font-medium"
              >
                Sign in / Get started
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

