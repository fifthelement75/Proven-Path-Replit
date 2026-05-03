import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const FRAGMENTS = [
  { label: 'Resume', x: '12%', y: '22%', rot: -6 },
  { label: 'Gut feel', x: '72%', y: '18%', rot: 4 },
  { label: 'Ref calls', x: '8%', y: '70%', rot: 7 },
  { label: 'Spreadsheets', x: '68%', y: '74%', rot: -5 },
  { label: 'LinkedIn', x: '46%', y: '12%', rot: 0 },
  { label: 'Annual review', x: '52%', y: '78%', rot: -2 },
];

export function Scene1Hook() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3200),
      setTimeout(() => setPhase(4), 4400),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
    >
      {FRAGMENTS.map((f, i) => (
        <motion.div
          key={f.label}
          className="absolute font-mono text-[1.1vw] tracking-wide px-3 py-1.5 rounded border border-white/10 bg-white/[0.03] text-white/55 backdrop-blur-sm"
          style={{ left: f.x, top: f.y }}
          initial={{ opacity: 0, scale: 0.8, rotate: f.rot, y: 20 }}
          animate={
            phase >= 3
              ? { opacity: 0, scale: 0.6, rotate: f.rot * 2, y: -40, filter: 'blur(6px)' }
              : phase >= 1
              ? { opacity: [0, 0.85, 0.7][Math.min(phase, 2)] ?? 0.7, scale: 1, rotate: f.rot, y: 0 }
              : { opacity: 0, scale: 0.8, rotate: f.rot, y: 20 }
          }
          transition={{ duration: 0.5, delay: phase >= 3 ? i * 0.04 : i * 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          {f.label}
        </motion.div>
      ))}

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center px-12 max-w-[68vw]">
          <motion.div
            className="font-mono text-[0.85vw] uppercase tracking-[0.4em] text-cyan-300/70 mb-4"
            initial={{ opacity: 0, letterSpacing: '0.2em' }}
            animate={phase >= 1 ? { opacity: 1, letterSpacing: '0.4em' } : { opacity: 0, letterSpacing: '0.2em' }}
            transition={{ duration: 0.7 }}
          >
            The hiring problem
          </motion.div>

          <h1
            className="font-display text-[7vw] font-bold leading-[0.95] tracking-tight text-white"
            style={{ perspective: '1000px' }}
          >
            {'HR is'.split('').map((c, i) => (
              <motion.span
                key={'a' + i}
                style={{ display: 'inline-block', whiteSpace: 'pre' }}
                initial={{ opacity: 0, y: 50, rotateX: -40 }}
                animate={phase >= 2 ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 50, rotateX: -40 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26, delay: phase >= 2 ? i * 0.04 : 0 }}
              >
                {c}
              </motion.span>
            ))}
            <br />
            {'flying blind.'.split('').map((c, i) => (
              <motion.span
                key={'b' + i}
                style={{
                  display: 'inline-block',
                  whiteSpace: 'pre',
                  background: 'linear-gradient(180deg, #fff 0%, #94a3b8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
                initial={{ opacity: 0, y: 50, rotateX: -40 }}
                animate={phase >= 2 ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 50, rotateX: -40 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26, delay: phase >= 2 ? 0.25 + i * 0.035 : 0 }}
              >
                {c}
              </motion.span>
            ))}
          </h1>

          <motion.p
            className="mt-6 text-[1.25vw] text-white/55 max-w-[40vw] mx-auto"
            initial={{ opacity: 0, y: 14 }}
            animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            Decisions made on resumes, gut feel, and disconnected tools.
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}
