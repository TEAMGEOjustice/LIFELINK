import { Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { BloodDrop } from "./BloodDrop";
import { LayoutDashboard } from "lucide-react";

/**
 * Premium Floating Navbar
 * Features:
 * - Liquid-glass pill design
 * - Dynamic auth state integration
 * - Route-aware active states
 */
export function Navbar() {
  const { user, role } = useAuth();
  const location = useLocation();

  const dashboardTo = role === "hospital" ? "/hospital" : role === "admin" ? "/admin" : "/donor";

  const navItems = [
    { to: "/", label: "Features" },
    { to: "/how-it-works", label: "How it works" },
    { to: "/impact", label: "Impact" },
  ];

  return (
    <div className="fixed top-8 left-0 right-0 flex justify-center z-50 px-4">
      <div className="liquid-glass px-3 py-2 sm:px-8 sm:py-3 flex items-center gap-4 sm:gap-10 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
        
        {/* LOGO */}
        <Link to="/" className="flex items-center gap-2 transition-transform hover:scale-105 active:scale-95">
          <BloodDrop size={18} />
          <span className="font-semibold text-base sm:text-lg tracking-tight">LifeLink</span>
        </Link>

        {/* DESKTOP NAV */}
        <div className="hidden md:flex gap-8 text-white/50 text-xs font-medium uppercase tracking-widest">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link 
                key={item.to} 
                to={item.to} 
                className={`transition-colors hover:text-white ${active ? "text-white" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              to={dashboardTo}
              className="bg-white text-black px-4 py-2 rounded-full text-xs font-bold hover:scale-105 transition active:scale-95 flex items-center gap-2 shadow-lg"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </Link>
          ) : (
            <Link
              to="/auth"
              className="bg-white text-black px-5 py-2 rounded-full text-xs font-bold hover:scale-105 transition active:scale-95 shadow-lg"
            >
              Get Started
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
