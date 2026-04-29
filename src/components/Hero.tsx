import { motion } from "framer-motion";

/**
 * Premium Cinematic Hero
 * - bg-transparent → global canvas shows through
 * - NO local hero-overlay (global overlay at z-1 handles contrast)
 * - Content at relative z-10 (within the z-2 content wrapper)
 */
export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center text-center bg-transparent">

      {/* Subtle bottom fade (helps text transition into next section) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

      {/* CONTENT */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 px-6 max-w-6xl"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8 inline-flex items-center gap-2 liquid-glass px-4 py-1.5 text-xs text-white/50 tracking-widest uppercase"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Next-Gen Medical Network
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-6xl md:text-8xl lg:text-9xl font-light tracking-tight leading-[1.05]"
        >
          From hours to <span className="italic font-serif text-white/60">minutes</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-6 text-lg md:text-xl text-white/60 max-w-2xl mx-auto"
        >
          LifeLink connects critical emergencies with verified donors in real time—when every second matters.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="mt-4 text-sm text-white/40"
        >
          Trusted by hospitals. Built for real-time response.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="mt-24 md:mt-32 flex flex-col sm:flex-row items-center justify-center gap-6"
        >
          <button className="bg-white text-black px-8 py-4 rounded-full shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:scale-105 transition font-medium">
            Save a Life →
          </button>
          <button className="glass-card px-8 py-4 rounded-full text-white/80 hover:bg-white/5 transition border border-white/10">
            Request Emergency
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}
