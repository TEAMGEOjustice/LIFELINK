import { useEffect, useRef, useState, useCallback } from "react";

/**
 * ProtocolAnimation — Fixed full-viewport background canvas.
 *
 * Architecture:
 *   Layer 0 (z-0)  → Canvas (fixed, scroll-driven frames, anti-gravity)
 *   Layer 1 (z-[1]) → Dark overlay (contrast / readability)
 *   Layer 2 (z-[2]) → All website content
 *
 * Key decisions:
 *   - NO Framer Motion for scroll — manual rAF tracking avoids all container warnings
 *   - NO bg-black on container — canvas IS the background
 *   - NO negative z-index — uses z-0 to stay in the root stacking context
 *   - pointer-events-none on everything — clicks pass through to content
 */
export function ProtocolAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const loadedRef = useRef(false);
  const currentFrameRef = useRef(0);
  const scrollProgressRef = useRef(0);
  const velocityRef = useRef(0);
  const lastScrollRef = useRef(0);
  const lastTimeRef = useRef(0);

  const TOTAL_FRAMES = 40;

  // ── PRELOAD ALL FRAMES ─────────────────────────────────────────────
  useEffect(() => {
    let loadedCount = 0;
    const imgs: HTMLImageElement[] = [];

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      const frameNum = i.toString().padStart(3, "0");
      img.src = `/frames/ezgif-frame-${frameNum}.jpg`;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === TOTAL_FRAMES) {
          imagesRef.current = imgs;
          loadedRef.current = true;
        }
      };
      imgs.push(img);
    }
  }, []);

  // ── CANVAS SIZING ──────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ── RENDER LOOP (single rAF — handles scroll, velocity, draw) ────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);

      // 1. READ SCROLL STATE
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? scrollTop / docHeight : 0;
      scrollProgressRef.current = progress;

      // 2. COMPUTE VELOCITY (for anti-gravity + scale drift)
      const dt = lastTimeRef.current ? (now - lastTimeRef.current) / 1000 : 0.016;
      lastTimeRef.current = now;
      const rawVelocity = (scrollTop - lastScrollRef.current) / (dt * 1000);
      lastScrollRef.current = scrollTop;
      // Smooth velocity with exponential decay
      velocityRef.current += (rawVelocity - velocityRef.current) * 0.1;
      const velocity = Math.max(-1, Math.min(1, velocityRef.current));

      // 3. COMPUTE FRAME INDEX (smooth lerp toward target)
      const targetFrame = progress * (TOTAL_FRAMES - 1);
      currentFrameRef.current += (targetFrame - currentFrameRef.current) * 0.08;
      const frameIdx = Math.floor(Math.min(Math.max(currentFrameRef.current, 0), TOTAL_FRAMES - 1));

      // 4. DRAW FRAME
      if (loadedRef.current && imagesRef.current[frameIdx]?.complete) {
        const img = imagesRef.current[frameIdx];

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Cover-fit
        const scaleFit = Math.max(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width - img.width * scaleFit) / 2;
        const y = (canvas.height - img.height * scaleFit) / 2;

        ctx.drawImage(img, x, y, img.width * scaleFit, img.height * scaleFit);
      }

      // 5. ANTI-GRAVITY + SCALE DRIFT (applied via CSS transform)
      const yOffset = velocity * -20; // scroll down → bg rises
      const scaleDrift = 1 + velocity * -0.02; // scroll down → bg shrinks slightly
      // Idle breathing: gentle sine wave
      const breathe = Math.sin(now / 1000 / 6 * Math.PI * 2) * 3;

      canvas.style.transform = `translateY(${yOffset + breathe}px) scale(${scaleDrift})`;
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      {/* Layer 0 — BACKGROUND CANVAS (z-0, no bg-black!) */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ opacity: 0.4 }}
        />
      </div>

      {/* Layer 1 — DARK OVERLAY (contrast for readability) */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      >
        <div className="w-full h-full bg-gradient-to-b from-black/50 via-black/20 to-black/60" />
      </div>
    </>
  );
}
