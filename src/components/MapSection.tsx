import { LiveMap } from "./LiveMap";
import { useSimulationStore } from "@/store/simulationStore";
import { Play, Pause, Radio, Waves, Route as RouteIcon } from "lucide-react";

interface MapSectionProps {
  role?: "hospital" | "donor";
  centerCoords?: { latitude: number; longitude: number };
}

export function MapSection({ role = "hospital", centerCoords }: MapSectionProps) {
  const { animations, toggleAnimation, setAllAnimations } = useSimulationStore();

  const allOn = animations.blink && animations.pulse && animations.routing;

  return (
    <div className="relative w-full h-[500px] lg:h-[600px] rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#05070d]">
      <LiveMap centerCoords={centerCoords} userRole={role} />

      {/* Animation controls — Overlaid on map */}
      <div className="absolute bottom-4 right-4 z-[10] rounded-lg border border-white/10 bg-black/60 backdrop-blur-md p-3 font-mono text-[11px] text-white/90 shadow-[0_8px_30px_rgba(0,0,0,0.45)] min-w-[200px]">
        <div className="flex items-center justify-between mb-2">
          <span className="tracking-[0.25em] text-white/60">ANIMATIONS</span>
          <button
            onClick={() => setAllAnimations(!allOn)}
            className="flex items-center gap-1 text-cyan-300 hover:text-cyan-200 transition-colors"
            aria-label={allOn ? "Pause all animations" : "Play all animations"}
          >
            {allOn ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {allOn ? (allOn ? "PAUSE" : "PLAY") : "PLAY"}
          </button>
        </div>

        <ControlRow
          icon={<Radio className="w-3 h-3" />}
          label="Donor Blink"
          active={animations.blink}
          onToggle={() => toggleAnimation("blink")}
        />
        <ControlRow
          icon={<Waves className="w-3 h-3" />}
          label="Pulse Wave"
          active={animations.pulse}
          onToggle={() => toggleAnimation("pulse")}
        />
        <ControlRow
          icon={<RouteIcon className="w-3 h-3" />}
          label="Routing"
          active={animations.routing}
          onToggle={() => toggleAnimation("routing")}
        />
      </div>
    </div>
  );
}

function ControlRow({
  icon,
  label,
  active,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="flex items-center gap-2 text-white/70">
        {icon}
        {label}
      </span>
      <button
        onClick={onToggle}
        className={`flex items-center gap-1 rounded px-2 py-0.5 transition-colors ${
          active
            ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
            : "bg-white/5 text-white/50 hover:bg-white/10"
        }`}
        aria-pressed={active}
        aria-label={`${active ? "Pause" : "Play"} ${label}`}
      >
        {active ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
        {active ? "ON" : "OFF"}
      </button>
    </div>
  );
}
