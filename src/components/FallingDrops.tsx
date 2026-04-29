import { BloodDrop } from "./BloodDrop";

const drops = [
  { left: "8%", delay: "0s", duration: "3.4s", size: 14 },
  { left: "18%", delay: "1.2s", duration: "4.1s", size: 10 },
  { left: "32%", delay: "2.5s", duration: "3.8s", size: 16 },
  { left: "47%", delay: "0.6s", duration: "4.5s", size: 12 },
  { left: "61%", delay: "3.1s", duration: "3.6s", size: 14 },
  { left: "74%", delay: "1.8s", duration: "4.2s", size: 11 },
  { left: "88%", delay: "2.2s", duration: "3.9s", size: 15 },
];

export function FallingDrops() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {drops.map((d, i) => (
        <div
          key={i}
          className="absolute top-0 animate-blood-drop opacity-60"
          style={{
            left: d.left,
            animationDelay: d.delay,
            animationDuration: d.duration,
          }}
        >
          <BloodDrop size={d.size} />
        </div>
      ))}
    </div>
  );
}
