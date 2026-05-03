import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const BASE = import.meta.env.BASE_URL;

const PLAN_ROWS = [
  { day: '30', text: 'Stakeholder mapping · async writeups', delay: 0 },
  { day: '60', text: 'Lead a cross-team initiative end-to-end', delay: 0.18 },
  { day: '90', text: 'Mentor 2 ICs · publish a system design RFC', delay: 0.36 },
];

export function Scene4DevPlan() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => setPhase(4), 4200),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center px-[6vw]"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
    >
      <div className="grid grid-cols-2 gap-[3vw] items-center w-full max-w-[82vw]">
        {/* LEFT: type */}
        <div>
          <motion.div
            className="font-mono text-[0.8vw] uppercase tracking-[0.4em] text-cyan-300/80 mb-3"
            initial={{ opacity: 0, x: -20 }}
            animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.5 }}
          >
            Differentiator · 01
          </motion.div>

          <motion.h2
            className="font-display text-[4.2vw] font-semibold text-white leading-[1.02] tracking-tight"
            initial={{ opacity: 0, y: 16 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            AI development<br />
            plans, written<br />
            <span
              style={{
                background: 'linear-gradient(90deg, #22d3ee 0%, #818cf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              from real data.
            </span>
          </motion.h2>

          <motion.p
            className="text-[1.1vw] text-white/55 mt-5 max-w-[28vw]"
            initial={{ opacity: 0, y: 12 }}
            animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.6 }}
          >
            Personalized 30 / 60 / 90 plans built from verified competency scores —
            not boilerplate templates.
          </motion.p>
        </div>

        {/* RIGHT: animated dev plan card */}
        <motion.div
          className="relative rounded-xl overflow-hidden border border-white/10 bg-gradient-to-b from-[#131a36] to-[#0b1020] shadow-[0_30px_80px_-20px_rgba(99,102,241,0.4)]"
          style={{ aspectRatio: '4 / 3' }}
          initial={{ opacity: 0, x: 60, rotate: 4, scale: 0.95 }}
          animate={
            phase >= 1
              ? { opacity: 1, x: 0, rotate: 1.5, scale: 1 }
              : { opacity: 0, x: 60, rotate: 4, scale: 0.95 }
          }
          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        >
          <div className="absolute inset-0 opacity-60">
            <img
              src={`${BASE}product/ai-dev-plan.png`}
              alt=""
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0b1020]/40 via-[#0b1020]/70 to-[#0b1020]/95" />

          <div className="relative h-full p-[1.6vw] flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <div className="font-mono text-[0.7vw] uppercase tracking-[0.3em] text-cyan-300/80">
                AI generated
              </div>
            </div>
            <div className="font-display text-[1.4vw] font-semibold text-white">
              Senior Engineer · Q3 plan
            </div>

            <div className="mt-auto space-y-[0.9vh]">
              {PLAN_ROWS.map((r, i) => (
                <motion.div
                  key={r.day}
                  className="flex items-start gap-3 p-[0.9vw] rounded-lg border border-white/10 bg-white/[0.04] backdrop-blur-sm"
                  initial={{ opacity: 0, x: 30 }}
                  animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
                  transition={{ duration: 0.5, delay: r.delay, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div
                    className="font-mono text-[1vw] font-semibold px-2 py-0.5 rounded shrink-0"
                    style={{
                      color: '#22d3ee',
                      background: 'rgba(34, 211, 238, 0.12)',
                      border: '1px solid rgba(34,211,238,0.35)',
                    }}
                  >
                    {r.day}d
                  </div>
                  <div className="text-[0.9vw] text-white/85 leading-snug">{r.text}</div>
                  <motion.div
                    className="ml-auto w-4 h-4 rounded-full border border-cyan-400/50 shrink-0 mt-0.5"
                    initial={{ scale: 0 }}
                    animate={phase >= 3 ? { scale: 1, background: i === 0 ? '#22d3ee' : 'transparent' } : { scale: 0 }}
                    transition={{ delay: r.delay + 0.3, duration: 0.3 }}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
