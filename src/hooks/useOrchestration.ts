import { useScroll, useTransform, useVelocity, useSpring } from "framer-motion";

export type Beat = "idle" | "detect" | "match" | "dispatch" | "success";

export function useOrchestration() {
  const { scrollYProgress } = useScroll();

  // Premium smoothing for frames
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 25,
    mass: 0.8
  });

  const scrollVelocity = useVelocity(scrollYProgress);

  // 1. GLOBAL NARRATIVE BEATS
  const beat = useTransform(scrollYProgress, (v) => {
    if (v < 0.15) return "idle";
    if (v < 0.35) return "detect";
    if (v < 0.6)  return "match";
    if (v < 0.85) return "dispatch";
    return "success";
  });

  // 2. GLOBAL PULSE BUS
  const pulse = useTransform(scrollYProgress, (v) => {
    if (v < 0.35) return 0.3;
    if (v < 0.6)  return 0.7;
    if (v < 0.85) return 1;
    return 0.5;
  });

  // 3. BEAT-DRIVEN ANTI-GRAVITY
  const yOffset = useTransform(
    [scrollVelocity, beat],
    // @ts-ignore - framer-motion useTransform multiple values signature issue
    ([vel, b]: [number, Beat]) => {
      const intensity = {
        idle: 8,
        detect: 12,
        match: 18,
        dispatch: 22,
        success: 10
      }[b] || 8;
      
      // scroll down (vel > 0) -> background rises (y < 0)
      return -vel * intensity;
    }
  );

  return {
    scrollYProgress,
    smoothProgress,
    scrollVelocity,
    beat,
    pulse,
    yOffset
  };
}
