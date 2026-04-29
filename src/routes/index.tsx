import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { ImpactCounter } from "@/components/ImpactCounter";
import { Benefits } from "@/components/Benefits";
import { EmergencyDemo } from "@/components/EmergencyDemo";
import { CtaFooter } from "@/components/CtaFooter";
import { ProtocolAnimation } from "@/components/ProtocolAnimation";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LifeLink — Smart Blood & Organ Donation Network" },
      {
        name: "description",
        content:
          "LifeLink connects hospitals with verified blood and organ donors in real time. Privacy-first, geo-matched, life-saving.",
      },
      { property: "og:title", content: "LifeLink — Every Drop Saves a Life" },
      {
        property: "og:description",
        content:
          "Real-time donor matching for emergencies. Blood & organ donation, redefined.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      {/* Layer 0+1 — PERSISTENT BACKGROUND (fixed, behind everything) */}
      <ProtocolAnimation />

      {/* Layer 2 — ALL CONTENT (scrolls naturally over canvas) */}
      <div
        className="relative opacity-0 animate-[fadeIn_1s_ease_forwards]"
        style={{ zIndex: 2 }}
      >
        <Navbar />
        <Hero />
        <HowItWorks />
        <ImpactCounter />
        <Benefits />
        <EmergencyDemo />
        <CtaFooter />
      </div>
    </>
  );
}
