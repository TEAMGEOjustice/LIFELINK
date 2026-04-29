import { motion } from "framer-motion";

/**
 * Premium Minimalist Emergency Demo
 * Features:
 * - Liquid-glass status container
 * - Real-time state simulation visual
 * - Cinematic typography
 */
export function EmergencyDemo() {
  return (
    <section id="emergency" className="py-40 px-6 text-center">
      <motion.h2 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-5xl md:text-7xl mb-10 tracking-tight"
      >
        Real-time <span className="italic text-white/40 font-light">response</span>
      </motion.h2>

      <motion.p 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 0.4 }}
        viewport={{ once: true }}
        className="text-white max-w-xl mx-auto mb-16 font-light"
      >
        Experience the precision of LifeLink matching as it connects critical 
        needs with verified responders in seconds.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 30 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="glass-card max-w-2xl mx-auto p-12 border-white/10 relative overflow-hidden group"
      >
        {/* Decorative inner glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        
        <div className="flex flex-col gap-6 relative z-10">
          <div className="flex justify-between items-center text-sm tracking-widest uppercase text-white/40 font-bold">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
              Emergency Created
            </span>
            <span className="flex items-center gap-2">
              AI Matching
              <span className="flex gap-0.5">
                <span className="h-1 w-1 rounded-full bg-white/20 animate-bounce" />
                <span className="h-1 w-1 rounded-full bg-white/20 animate-bounce [animation-delay:0.2s]" />
                <span className="h-1 w-1 rounded-full bg-white/20 animate-bounce [animation-delay:0.4s]" />
              </span>
            </span>
          </div>

          <div className="h-px bg-white/10 w-full" />

          <div className="flex justify-between items-center">
            <span className="text-white text-lg font-medium tracking-tight">Top Donor Found</span>
            <span className="text-primary font-bold tracking-tight bg-primary/10 px-3 py-1 rounded-full text-xs">
              2.1 km away
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-white/60 font-light">Response Status</span>
            <motion.span 
              initial={{ opacity: 0, x: 10 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="text-primary font-black uppercase tracking-widest text-xs flex items-center gap-2"
            >
              <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
              Accepted
            </motion.span>
          </div>
        </div>

        {/* Bottom decorative scan line */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </motion.div>
    </section>
  );
}
