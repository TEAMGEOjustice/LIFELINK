import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Activity, Cpu, Bell, ShieldCheck } from "lucide-react";

const steps = [
  {
    title: "Emergency Created",
    desc: "A hospital initiates a critical blood or organ request through our AI-integrated command center.",
    icon: Activity,
    color: "var(--emergency)",
  },
  {
    title: "AI Matches Donors",
    desc: "The LifeLink engine identifies the most compatible, verified donors within a precise geo-radius.",
    icon: Cpu,
    color: "var(--primary)",
  },
  {
    title: "Alerts Sent",
    desc: "Smart notifications are broadcasted instantly to donors with the exact emergency location and blood type.",
    icon: Bell,
    color: "var(--primary)",
  },
  {
    title: "Response Locked",
    desc: "The first responder is securely locked for the delivery, ensuring a streamlined life-saving mission.",
    icon: ShieldCheck,
    color: "var(--primary)",
  },
];

export function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.1, 0.9, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.1], [0.95, 1]);

  return (
    <section 
      id="how-it-works" 
      ref={containerRef}
      className="relative py-40 px-6 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div 
          style={{ opacity, scale }}
          className="text-center mb-32"
        >
          <h2 className="text-6xl md:text-8xl font-light tracking-tighter mb-6">
            The LifeLink <span className="italic text-white/60 font-extralight">Protocol</span>
          </h2>
          <p className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
            A high-performance coordination layer designed for sub-second matching and zero-latency emergency response.
          </p>
          <p className="mt-4 text-white/60 text-sm">
            From 2–6 hour delays to under 5 minutes.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-24 gap-y-32 relative">
          {steps.map((step, i) => (
            <StepCard 
              key={i} 
              step={step} 
              index={i} 
              isEven={i % 2 === 0} 
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCard({ step, index, isEven }: { step: typeof steps[0], index: number, isEven: boolean }) {
  const Icon = step.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ 
        delay: index * 0.25, 
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1] 
      }}
      className={`relative flex items-center ${isEven ? "md:justify-end" : "md:justify-start"}`}
    >
      <div className="glass-card p-10 max-w-md group relative overflow-hidden transition-all duration-500 hover:scale-[1.02]">
        {/* Hover Glow */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
          style={{ 
            background: `radial-gradient(circle at center, color-mix(in oklab, ${step.color} 10%, transparent) 0%, transparent 70%)` 
          }}
        />

        <div className="flex items-start gap-6 relative z-10">
          <div 
            className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 group-hover:scale-110 transition-transform duration-500"
            style={{ color: step.color }}
          >
            <Icon size={28} strokeWidth={1.5} />
          </div>
          
          <div>
            <div className="text-[10px] font-bold text-white/20 mb-3 tracking-[0.4em] uppercase">
              Phase 0{index + 1}
            </div>
            <h3 className="text-2xl font-medium mb-3 text-white group-hover:text-primary transition-colors">
              {step.title}
            </h3>
            <p className="text-white/40 text-sm leading-relaxed font-light">
              {step.desc}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
