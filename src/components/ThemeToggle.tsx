import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      id="theme-toggle"
      onClick={toggleTheme}
      className="theme-toggle-btn group fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-500 hover:scale-110 hover:shadow-xl active:scale-95"
      style={{
        background: isDark
          ? "linear-gradient(135deg, oklch(0.22 0 0), oklch(0.16 0 0))"
          : "linear-gradient(135deg, #ffffff, #f0ede8)",
        border: isDark
          ? "1px solid oklch(1 0 0 / 12%)"
          : "1px solid oklch(0 0 0 / 10%)",
        boxShadow: isDark
          ? "0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)"
          : "0 4px 24px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04)",
      }}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span
        className="relative flex h-5 w-5 items-center justify-center"
        style={{
          transition: "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
          transform: isDark ? "rotate(0deg)" : "rotate(180deg)",
        }}
      >
        {isDark ? (
          <Sun className="h-5 w-5 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]" />
        ) : (
          <Moon className="h-5 w-5 text-indigo-500 drop-shadow-[0_0_6px_rgba(99,102,241,0.4)]" />
        )}
      </span>
      {/* Glow ring on hover */}
      <span
        className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          boxShadow: isDark
            ? "0 0 20px rgba(251,191,36,0.2), 0 0 40px rgba(251,191,36,0.08)"
            : "0 0 20px rgba(99,102,241,0.2), 0 0 40px rgba(99,102,241,0.08)",
        }}
      />
    </button>
  );
}
