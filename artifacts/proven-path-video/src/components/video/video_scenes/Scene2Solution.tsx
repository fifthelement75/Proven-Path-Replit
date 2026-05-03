import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const STREAMS = [
  { label: 'Assessments', color: '#22d3ee', angle: -36 },
  { label: 'Interviews', color: '#818cf8', angle: -12 },
  { label: '360° Reviews', color: '#fbbf24', angle: 12 },
  { label: 'Skill scoring', color: '#fb7185', angle: 36 },
];

export function Scene2Solution() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 150),
      setTimeout(() => setPhase(2), 1300),
      setTimeout(() => setPhase(3), 2600),
      setTimeout(() => setPhase(4), 3800),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
    >
      <div className="relative w-[60vw] h-[60vh] flex items-center justify-center">
        {STREAMS.map((s, i) => {
          const rad = (s.angle * Math.PI) / 180;
          const distance = 28;
          const sx = -Math.sin(rad) * distance;
          const sy = -Math.cos(rad) * distance - 4;
          return (
            <motion.div
              key={s.label}
              className="absolute font-mono text-[1vw] tracking-wider px-3 py-1.5 rounded-md border backdrop-blur-sm"
              style={{
                borderColor: s.color + '55',
                background: s.color + '14',
                color: s.color,
                left: '50%',
                top: '50%',
              }}
              initial={{ x: `${sx}vw`, y: `${sy}vh`, opacity: 0, scale: 0.85 }}
              animate={
                phase >= 2
                  ? { x: '-50%', y: '-50%', opacity: 0, scale: 0.6, filter: 'blur(8px)' }
                  : phase >= 1
                  ? { x: `${sx}vw`, y: `${sy}vh`, opacity: 0.95, scale: 1 }
                  : { x: `${sx}vw`, y: `${sy}vh`, opacity: 0, scale: 0.85 }
              }
              transition={{
                duration: phase >= 2 ? 0.9 : 0.55,
                delay: phase >= 2 ? i * 0.04 : i * 0.1,
                ease: [0.65, 0, 0.35, 1],
              }}
            >
              {s.label}
            </motion.div>
          );
        })}

        {STREAMS.map((s, i) => (
          <motion.div
            key={'line' + i}
            className="absolute origin-bottom"
            style={{
              left: '50%',
              top: '50%',
              width: '2px',
              height: '32vh',
              background: `linear-gradient(180deg, ${s.color}00 0%, ${s.color}cc 70%, ${s.color} 100%)`,
              transform: `translate(-50%, -100%) rotate(${s.angle + 180}deg)`,
              transformOrigin: 'bottom center',
            }}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={
              phase >= 2
                ? { scaleY: 1, opacity: 0 }
                : phase >= 1
                ? { scaleY: 1, opacity: 0.7 }
                : { scaleY: 0, opacity: 0 }
            }
            transition={{ duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}

        <motion.div
          className="absolute rounded-full"
          style={{
            width: '28vh',
            height: '28vh',
            background:
              'radial-gradient(circle, rgba(99,102,241,0.55) 0%, rgba(34,211,238,0.25) 50%, transparent 75%)',
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={phase >= 2 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />

        <motion.div
          className="absolute flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] backdrop-blur-xl px-8 py-6 text-center"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={phase >= 3 ? { scale: 1, opacity: 1 } : { scale: 0.6, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        >
          <div>
            <div className="font-mono text-[0.75vw] uppercase tracking-[0.35em] text-cyan-300/80 mb-2">
              Single source of truth
            </div>
            <div className="font-display text-[2.6vw] font-semibold text-white leading-tight">
              Verified performance<br />intelligence.
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-[8vh] left-0 right-0 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
      >
        <div className="font-display text-[1.5vw] text-white/70">
          One platform. <span className="text-cyan-300">One verified record.</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
