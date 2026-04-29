import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { BloodDrop } from "./BloodDrop";

/**
 * Premium Minimalist Footer & CTA
 * Features:
 * - Liquid-glass CTA container
 * - Cinematic minimalist typography
 * - Clean grid-less layout
 */
export function CtaFooter() {
  return (
    <section className="relative py-40 overflow-hidden">
      <div className="mx-auto max-w-6xl px-6">
        
        {/* MAIN CTA CARD */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="glass-card relative overflow-hidden p-16 sm:p-24 text-center border-white/5"
        >
          {/* Subtle Glow Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent opacity-50" />
          
          <div className="relative z-10">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="mb-10 inline-flex items-center justify-center p-4 rounded-full bg-white/5"
            >
              <BloodDrop size={48} />
            </motion.div>

            <h2 className="text-5xl md:text-7xl font-medium tracking-tight mb-8 leading-[1.1]">
              Join the network. <br />
              <span className="italic text-white/40 font-light">Be the reason.</span>
            </h2>

            <p className="mx-auto mt-8 max-w-xl text-white/40 text-lg font-light leading-relaxed">
              Always anonymous. Always secure. Built for hospitals, 
              powered by a global network of heroes.
            </p>

            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link 
                to="/auth" 
                className="inline-flex items-center justify-center rounded-full bg-white px-10 py-4 text-sm font-bold text-black transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_rgba(255,255,255,0.1)]"
              >
                Become a Donor
              </Link>
              <Link 
                to="/auth" 
                className="liquid-glass px-10 py-4 text-sm font-medium text-white/70 transition-all hover:text-white hover:bg-white/5 border-white/10"
              >
                Hospital Portal
              </Link>
            </div>
          </div>
        </motion.div>

        {/* MINIMALIST FOOTER */}
        <footer className="mt-24 flex flex-col items-center justify-between gap-6 border-t border-white/5 pt-12 text-[10px] tracking-[0.2em] uppercase text-white/20 sm:flex-row font-bold">
          <div className="flex items-center gap-3">
            <BloodDrop size={16} />
            <span>
              LifeLink <span className="text-white/40">Core v3.2</span>
            </span>
          </div>
          <div className="flex gap-8">
            <span className="hover:text-white/60 transition-colors cursor-pointer">Privacy</span>
            <span className="hover:text-white/60 transition-colors cursor-pointer">Terms</span>
            <span className="text-white/10">© {new Date().getFullYear()}</span>
          </div>
        </footer>
      </div>
    </section>
  );
}
