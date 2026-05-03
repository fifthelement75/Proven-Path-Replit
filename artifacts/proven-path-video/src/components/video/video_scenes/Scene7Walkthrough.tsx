import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BASE = import.meta.env.BASE_URL;

interface CursorAction {
  at: number;
  x: string;
  y: string;
  click?: boolean;
}

interface Step {
  url: string;
  tab: string;
  img: string;
  label: string;
  sub: string;
  caption: string;
  cursor: CursorAction[];
  scrollPct?: number;
}

const STEPS: Step[] = [
  {
    url: 'app.provenpath.app/dashboard',
    tab: 'Dashboard',
    img: `${BASE}product/hero-dashboard.png`,
    label: 'Talent dashboard',
    sub: 'Live performance signal across your org',
    caption: 'Start with the live talent dashboard.',
    cursor: [
      { at: 600, x: '12%', y: '32%' },
      { at: 1400, x: '28%', y: '48%' },
      { at: 2200, x: '46%', y: '62%', click: true },
    ],
  },
  {
    url: 'app.provenpath.app/talent/competencies',
    tab: 'Competencies',
    img: `${BASE}product/competency-overview.png`,
    label: 'Competency intelligence',
    sub: 'Verified scores, not self-assessments',
    caption: 'Drill into a verified competency profile.',
    cursor: [
      { at: 600, x: '70%', y: '38%' },
      { at: 1500, x: '55%', y: '58%' },
      { at: 2300, x: '38%', y: '70%', click: true },
    ],
    scrollPct: 18,
  },
  {
    url: 'app.provenpath.app/talent/dev-plan',
    tab: 'Development plan',
    img: `${BASE}product/ai-dev-plan.png`,
    label: 'AI development plans',
    sub: '30 / 60 / 90 plans from real data',
    caption: 'Generate a 30 / 60 / 90 plan in one click.',
    cursor: [
      { at: 600, x: '78%', y: '22%', click: true },
      { at: 1600, x: '40%', y: '55%' },
      { at: 2300, x: '52%', y: '72%' },
    ],
    scrollPct: 30,
  },
  {
    url: 'app.provenpath.app/interviews/new',
    tab: 'Interview scorecard',
    img: `${BASE}product/interview-scorecard.png`,
    label: 'Structured interviews',
    sub: 'Calibrated scorecards, fewer bad hires',
    caption: 'Run a calibrated interview scorecard.',
    cursor: [
      { at: 700, x: '34%', y: '40%' },
      { at: 1500, x: '58%', y: '50%', click: true },
      { at: 2300, x: '70%', y: '68%' },
    ],
  },
  {
    url: 'app.provenpath.app/people/jane-doe/passport',
    tab: 'Career passport',
    img: `${BASE}product/portable-record.png`,
    label: 'Portable career record',
    sub: 'Verified, employer-attested, portable',
    caption: 'Each employee gets a portable, verified record.',
    cursor: [
      { at: 600, x: '40%', y: '38%' },
      { at: 1500, x: '60%', y: '55%' },
      { at: 2400, x: '78%', y: '24%', click: true },
    ],
  },
];

const STEP_MS = 3000;
const LOAD_MS = 380;

export function Scene7Walkthrough() {
  const [step, setStep] = useState(0);
  const [cursorIdx, setCursorIdx] = useState(0);
  const [clicking, setClicking] = useState(false);
  const [loading, setLoading] = useState(true);

  // Step advance loop
  useEffect(() => {
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % STEPS.length);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, []);

  // Per-step: loading bar + scripted cursor moves & clicks
  useEffect(() => {
    setCursorIdx(0);
    setClicking(false);
    setLoading(true);
    const loadDone = setTimeout(() => setLoading(false), LOAD_MS);

    const current = STEPS[step];
    const timers: number[] = [loadDone as unknown as number];
    current.cursor.forEach((action, i) => {
      const t1 = window.setTimeout(() => {
        setCursorIdx(i);
        if (action.click) {
          setClicking(true);
          const t2 = window.setTimeout(() => setClicking(false), 600);
          timers.push(t2);
        }
      }, action.at);
      timers.push(t1);
    });

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [step]);

  const current = STEPS[step];
  const cursorPos = current.cursor[cursorIdx] ?? current.cursor[0];

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
        transition={{ duration: 0.6 }}
      >
        Inside the platform
      </motion.div>

      <motion.h2
        className="font-display text-[3.2vw] font-semibold text-white text-center leading-tight mb-[2.5vh]"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
      >
        See it in motion.
      </motion.h2>

      {/* Browser-frame mockup */}
      <motion.div
        className="relative rounded-2xl border border-white/15 overflow-hidden shadow-[0_40px_120px_-20px_rgba(99,102,241,0.55)]"
        style={{ width: '66vw', aspectRatio: '16 / 9.6', background: '#0b1020' }}
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26, delay: 0.15 }}
      >
        {/* Faux browser chrome */}
        <div className="relative">
          {/* Title-bar row */}
          <div className="flex items-center gap-2 px-4 h-[3vh] bg-[#0f1430] border-b border-white/5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-400/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
            <div className="ml-3 flex items-center gap-1.5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={'tab' + step}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-t bg-[#131a36] border border-b-0 border-white/10 -mb-px"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="font-mono text-[0.62vw] text-white/80">{current.tab}</span>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* URL bar row */}
          <div className="flex items-center gap-2 px-4 h-[3vh] bg-[#131a36] border-b border-white/10 relative">
            <div className="flex items-center gap-1 text-white/40">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M9 18l6-6-6-6" />
              </svg>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
              </svg>
            </div>
            <div className="flex-1 h-[1.9vh] rounded-md bg-[#0b1020] border border-white/10 flex items-center px-3 gap-2">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgb(34 211 238)" strokeWidth="3">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V7a4 4 0 018 0v4" />
              </svg>
              <AnimatePresence mode="wait">
                <motion.span
                  key={'url' + step}
                  className="font-mono text-[0.66vw] text-white/70 truncate"
                  initial={{ opacity: 0, x: 4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.25 }}
                >
                  {current.url}
                </motion.span>
              </AnimatePresence>
            </div>
            <div className="font-mono text-[0.6vw] text-white/40">
              {String(step + 1).padStart(2, '0')} / {STEPS.length}
            </div>

            {/* Loading bar */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  key={'load' + step}
                  className="absolute left-0 bottom-0 h-[2px] bg-cyan-400"
                  initial={{ width: '0%', opacity: 1 }}
                  animate={{ width: '100%' }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: LOAD_MS / 1000, ease: 'easeOut' }}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Screen viewport */}
        <div className="relative w-full overflow-hidden" style={{ height: 'calc(100% - 6vh)' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={current.img}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.img
                src={current.img}
                alt=""
                className="absolute left-0 right-0 w-full object-cover"
                style={{ top: 0 }}
                initial={{ y: 0, scale: 1.02 }}
                animate={{ y: current.scrollPct ? `-${current.scrollPct}%` : 0, scale: 1 }}
                transition={{
                  y: { duration: STEP_MS / 1000 - 0.6, ease: 'easeInOut', delay: 0.6 },
                  scale: { duration: 0.6, ease: 'easeOut' },
                }}
              />
            </motion.div>
          </AnimatePresence>

          {/* Bottom gradient for caption legibility */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0b1020]/90 via-[#0b1020]/35 to-transparent pointer-events-none" />

          {/* Animated cursor */}
          <motion.div
            className="absolute pointer-events-none z-20"
            animate={{ left: cursorPos.x, top: cursorPos.y }}
            transition={{ type: 'spring', stiffness: 110, damping: 22 }}
          >
            <div className="relative">
              {/* Hover ring */}
              <motion.div
                className="absolute -inset-3 rounded-full border-2 border-cyan-400/80"
                animate={{
                  scale: clicking ? [1, 0.6, 1.4] : [0.9, 1.05, 0.9],
                  opacity: clicking ? [1, 1, 0] : [0.55, 0.9, 0.55],
                }}
                transition={{
                  duration: clicking ? 0.6 : 1.6,
                  repeat: clicking ? 0 : Infinity,
                  ease: 'easeInOut',
                }}
              />
              {/* Click ripple */}
              <AnimatePresence>
                {clicking && (
                  <motion.div
                    key="ripple"
                    className="absolute -inset-6 rounded-full border-2 border-cyan-300"
                    initial={{ scale: 0.5, opacity: 1 }}
                    animate={{ scale: 2.2, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.55, ease: 'easeOut' }}
                  />
                )}
              </AnimatePresence>
              {/* Cursor SVG */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 2L21 12L13 14L10 22L3 2Z"
                  fill="white"
                  stroke="#0b1020"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </motion.div>

          {/* Caption + label */}
          <div className="absolute left-[3%] bottom-[5%] right-[3%] flex items-end justify-between gap-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={'label' + step}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
                className="max-w-[70%]"
              >
                <div className="font-display text-[1.55vw] font-semibold text-white leading-tight">
                  {current.label}
                </div>
                <div className="text-[0.85vw] text-white/65 mt-0.5">{current.sub}</div>
                <div className="mt-1 text-[0.72vw] text-cyan-300/80 font-mono">
                  › {current.caption}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Step indicator dots */}
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className="h-1 rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? '22px' : '8px',
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
