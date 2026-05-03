import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BASE = import.meta.env.BASE_URL;

const STEPS = [
  {
    img: `${BASE}product/hero-dashboard.png`,
    label: 'Talent dashboard',
    sub: 'Live performance signal across your org',
    cursor: { x: '22%', y: '40%' },
  },
  {
    img: `${BASE}product/competency-overview.png`,
    label: 'Competency intelligence',
    sub: 'Verified scores, not self-assessments',
    cursor: { x: '70%', y: '55%' },
  },
  {
    img: `${BASE}product/ai-dev-plan.png`,
    label: 'AI development plans',
    sub: '30 / 60 / 90 plans from real data',
    cursor: { x: '40%', y: '60%' },
  },
  {
    img: `${BASE}product/interview-scorecard.png`,
    label: 'Structured interviews',
    sub: 'Calibrated scorecards, fewer bad hires',
    cursor: { x: '60%', y: '45%' },
  },
  {
    img: `${BASE}product/portable-record.png`,
    label: 'Portable career record',
    sub: 'Verified, employer-attested, portable',
    cursor: { x: '50%', y: '50%' },
  },
];

const STEP_MS = 1500;

export function Scene7Walkthrough() {
  const [step, setStep] = useState(0);
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    const intro = setTimeout(() => setIntroDone(true), 500);
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % STEPS.length);
    }, STEP_MS);
    return () => {
      clearTimeout(intro);
      window.clearInterval(id);
    };
  }, []);

  const current = STEPS[step];

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
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Inside the platform
      </motion.div>

      <motion.h2
        className="font-display text-[3.2vw] font-semibold text-white text-center leading-tight mb-[3.5vh]"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        See it in motion.
      </motion.h2>

      {/* Browser-frame mockup */}
      <motion.div
        className="relative rounded-2xl border border-white/15 overflow-hidden shadow-[0_40px_120px_-20px_rgba(99,102,241,0.55)]"
        style={{ width: '64vw', aspectRatio: '16 / 9.4', background: '#0b1020' }}
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26, delay: 0.15 }}
      >
        {/* Faux browser chrome */}
        <div className="flex items-center gap-2 px-4 h-[3.2vh] bg-[#131a36] border-b border-white/10">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-400/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
          <div className="ml-3 flex-1 h-[1.8vh] rounded-md bg-white/[0.05] border border-white/10 flex items-center px-3">
            <span className="font-mono text-[0.65vw] text-white/45">app.provenpath.app</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={'tab' + step}
              className="font-mono text-[0.65vw] uppercase tracking-[0.25em] text-cyan-300/70 px-2 py-0.5 rounded bg-cyan-400/10 border border-cyan-400/30"
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.3 }}
            >
              {String(step + 1).padStart(2, '0')} / {STEPS.length}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Screen viewport */}
        <div className="relative w-full" style={{ height: 'calc(100% - 3.2vh)' }}>
          <AnimatePresence mode="wait">
            <motion.img
              key={current.img}
              src={current.img}
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-top"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.45, ease: [0.65, 0, 0.35, 1] }}
            />
          </AnimatePresence>

          {/* Subtle gradient on bottom for label readability */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0b1020]/85 via-[#0b1020]/30 to-transparent pointer-events-none" />

          {/* Animated cursor that moves between screens */}
          {introDone && (
            <motion.div
              className="absolute pointer-events-none z-10"
              animate={{ left: current.cursor.x, top: current.cursor.y }}
              transition={{ type: 'spring', stiffness: 90, damping: 20 }}
            >
              <div className="relative">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 2L21 12L13 14L10 22L3 2Z"
                    fill="white"
                    stroke="#0b1020"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
                <motion.div
                  className="absolute -inset-3 rounded-full border-2 border-cyan-400"
                  initial={{ scale: 0.4, opacity: 0.9 }}
                  animate={{ scale: [0.4, 1.6], opacity: [0.9, 0] }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          )}

          {/* Step label card */}
          <div className="absolute left-[3%] bottom-[5%] right-[3%] flex items-end justify-between gap-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={'label' + step}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
              >
                <div className="font-display text-[1.6vw] font-semibold text-white leading-tight">
                  {current.label}
                </div>
                <div className="text-[0.85vw] text-white/65 mt-0.5">{current.sub}</div>
              </motion.div>
            </AnimatePresence>

            {/* Step indicator dots */}
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className="h-1 rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? '20px' : '8px',
                    background: i === step ? '#22d3ee' : 'rgba(255,255,255,0.25)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
