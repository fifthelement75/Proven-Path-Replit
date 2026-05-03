import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const BASE = import.meta.env.BASE_URL;

const LINES = [
  { text: 'Hire smarter.', accent: '#22d3ee' },
  { text: 'Develop faster.', accent: '#818cf8' },
  { text: 'Retain longer.', accent: '#fbbf24' },
];

export function Scene6Closing() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 2400),
      setTimeout(() => setPhase(3), 3400),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
    >
      <div className="text-center px-[8vw]">
        {LINES.map((line, i) => (
          <motion.div
            key={line.text}
            className="font-display font-semibold text-[6.5vw] leading-[1.02] tracking-tight"
            style={{ color: line.accent }}
            initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
            animate={
              phase >= 1
                ? { opacity: 1, y: 0, filter: 'blur(0px)' }
                : { opacity: 0, y: 30, filter: 'blur(8px)' }
            }
            transition={{
              duration: 0.7,
              delay: phase >= 1 ? i * 0.4 : 0,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {line.text}
          </motion.div>
        ))}

        <motion.div
          className="mt-[6vh] flex items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-[0_10px_40px_-10px_rgba(34,211,238,0.6)]">
            <img src={`${BASE}logo.png`} alt="Proven Path" className="w-9 h-9 object-contain" />
          </div>
          <div className="font-display text-[2.4vw] font-semibold text-white tracking-tight">
            Proven Path
          </div>
        </motion.div>

        <motion.div
          className="mt-[2vh] font-mono text-[1.1vw] tracking-[0.3em] uppercase text-cyan-300/80"
          initial={{ opacity: 0, letterSpacing: '0.1em' }}
          animate={phase >= 3 ? { opacity: 1, letterSpacing: '0.3em' } : { opacity: 0, letterSpacing: '0.1em' }}
          transition={{ duration: 0.8 }}
        >
          provenpath.app
        </motion.div>
      </div>
    </motion.div>
  );
}
