import { useMemo } from "react";

/**
 * Floating medical-themed background particles.
 * Pure CSS animation — no JS per-frame, zero impact on interactivity.
 * Rendered once at root level across all pages.
 */

interface Particle {
  id: number;
  symbol: string;
  size: number;
  x: number;
  delay: number;
  duration: number;
  opacity: number;
  drift: number;
}

const SYMBOLS = ["✚", "♥", "💧", "⬡", "◉", "✦"];

export function FloatingParticles({ count = 18 }: { count?: number }) {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      symbol: SYMBOLS[i % SYMBOLS.length],
      size: 8 + Math.random() * 14,
      x: Math.random() * 100,
      delay: Math.random() * 25,
      duration: 20 + Math.random() * 20,
      opacity: 0.03 + Math.random() * 0.06,
      drift: -30 + Math.random() * 60,
    }));
  }, [count]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute animate-float-particle select-none"
          style={{
            left: `${p.x}%`,
            bottom: "-5%",
            fontSize: `${p.size}px`,
            opacity: p.opacity,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ["--drift" as string]: `${p.drift}px`,
            color:
              p.symbol === "♥" || p.symbol === "💧"
                ? "var(--emergency)"
                : "var(--primary)",
            filter: "blur(0.5px)",
          }}
        >
          {p.symbol}
        </span>
      ))}
    </div>
  );
}
