import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const CAPS = [
  'AI Talent Insights',
  'Verified Performance Scoring',
  '360° Reviews',
  'Promotion Readiness',
  'Career Ladders',
  'Portable References',
];

export function Scene5Capabilities() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 3000),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

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
        The platform
      </motion.div>

      <motion.h2
        className="font-display text-[3.8vw] font-semibold text-white text-center leading-[1.05] mb-[5vh]"
        initial={{ opacity: 0, y: 14 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        Six capabilities. <span className="text-white/55">One verified spine.</span>
      </motion.h2>

      <div className="grid grid-cols-3 gap-[1.4vw] w-full max-w-[72vw]">
        {CAPS.map((cap, i) => (
          <motion.div
            key={cap}
            className="relative rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-[1.5vw] overflow-hidden"
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={phase >= 2 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24, delay: i * 0.07 }}
          >
            <motion.div
              className="absolute inset-0 opacity-0"
              style={{
                background:
                  'linear-gradient(120deg, transparent 30%, rgba(34,211,238,0.18) 50%, transparent 70%)',
              }}
              animate={{ opacity: [0, 0.6, 0], x: ['-100%', '100%'] }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                delay: i * 0.25,
                ease: 'easeInOut',
              }}
            />
            <div className="relative">
              <div className="font-mono text-[0.7vw] text-cyan-300/70 tracking-widest mb-2">
                0{i + 1}
              </div>
              <div className="font-display text-[1.5vw] font-semibold text-white leading-tight">
                {cap}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="mt-[5vh] font-mono text-[0.9vw] text-white/45 tracking-wide"
        initial={{ opacity: 0 }}
        animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        Free · Pro $9.99/mo · Enterprise
      </motion.div>
    </motion.div>
  );
}
