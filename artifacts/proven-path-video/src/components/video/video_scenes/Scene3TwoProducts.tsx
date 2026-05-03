import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const BASE = import.meta.env.BASE_URL;

export function Scene3TwoProducts() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 2400),
      setTimeout(() => setPhase(4), 3600),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  const cards = [
    {
      tag: 'For employers',
      name: 'Proven Path',
      desc: 'HR teams unify hiring, performance, and growth on one verified data layer.',
      img: `${BASE}product/hero-dashboard.png`,
      accent: '#22d3ee',
      rot: -3,
    },
    {
      tag: 'For individuals',
      name: 'Career progression',
      desc: 'A portable, verified record of skills, growth, and impact that travels with you.',
      img: `${BASE}product/portable-record.png`,
      accent: '#818cf8',
      rot: 3,
    },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-[6vw]"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
    >
      <motion.div
        className="font-mono text-[0.85vw] uppercase tracking-[0.4em] text-cyan-300/70 mb-3"
        initial={{ opacity: 0, y: 10 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ duration: 0.5 }}
      >
        Two products · One verified record
      </motion.div>

      <motion.h2
        className="font-display text-[3.6vw] font-semibold text-white text-center leading-tight mb-[3.5vh]"
        initial={{ opacity: 0, y: 16 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ duration: 0.6, delay: 0.15 }}
      >
        Built for both sides<br />
        <span className="text-white/60">of the table.</span>
      </motion.h2>

      <div className="flex gap-[2.5vw] w-full max-w-[80vw] justify-center">
        {cards.map((c, i) => (
          <motion.div
            key={c.name}
            className="relative flex-1 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] backdrop-blur-xl overflow-hidden"
            style={{ aspectRatio: '4 / 3.4' }}
            initial={{ opacity: 0, y: 60, rotate: c.rot, scale: 0.92 }}
            animate={
              phase >= 2
                ? { opacity: 1, y: 0, rotate: c.rot * 0.3, scale: 1 }
                : { opacity: 0, y: 60, rotate: c.rot, scale: 0.92 }
            }
            transition={{
              type: 'spring',
              stiffness: 220,
              damping: 26,
              delay: phase >= 2 ? i * 0.12 : 0,
            }}
          >
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background: `radial-gradient(circle at 50% 0%, ${c.accent}55 0%, transparent 60%)`,
              }}
            />

            <div className="relative p-[2vw] h-full flex flex-col">
              <div className="flex items-center justify-between mb-[1vh]">
                <div
                  className="font-mono text-[0.7vw] uppercase tracking-[0.3em] px-2 py-1 rounded"
                  style={{ color: c.accent, background: c.accent + '18', border: `1px solid ${c.accent}40` }}
                >
                  {c.tag}
                </div>
                <div className="w-2 h-2 rounded-full" style={{ background: c.accent }} />
              </div>

              <div className="font-display text-[2.4vw] font-semibold text-white leading-tight">
                {c.name}
              </div>
              <div className="text-[0.95vw] text-white/55 mt-2 max-w-[20vw]">{c.desc}</div>

              <motion.div
                className="mt-auto rounded-lg overflow-hidden border border-white/10 shadow-2xl"
                style={{ aspectRatio: '16 / 9' }}
                initial={{ opacity: 0, y: 20 }}
                animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.08 }}
              >
                <img
                  src={c.img}
                  alt=""
                  className="w-full h-full object-cover object-top"
                />
              </motion.div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="mt-[3vh] flex items-center gap-3"
        initial={{ opacity: 0 }}
        animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="h-px w-[6vw] bg-cyan-400/40" />
        <div className="font-mono text-[0.85vw] uppercase tracking-[0.3em] text-cyan-300/80">
          Same data layer
        </div>
        <div className="h-px w-[6vw] bg-cyan-400/40" />
      </motion.div>
    </motion.div>
  );
}
