import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1Hook } from './video_scenes/Scene1Hook';
import { Scene2Solution } from './video_scenes/Scene2Solution';
import { Scene3TwoProducts } from './video_scenes/Scene3TwoProducts';
import { Scene4DevPlan } from './video_scenes/Scene4DevPlan';
import { Scene5Capabilities } from './video_scenes/Scene5Capabilities';
import { Scene7Walkthrough } from './video_scenes/Scene7Walkthrough';
import { Scene6Closing } from './video_scenes/Scene6Closing';

export const SCENE_DURATIONS = {
  hook: 6800,
  solution: 7000,
  products: 7200,
  devplan: 7800,
  capabilities: 7400,
  walkthrough: 15400,
  closing: 6800,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  hook: Scene1Hook,
  solution: Scene2Solution,
  products: Scene3TwoProducts,
  devplan: Scene4DevPlan,
  capabilities: Scene5Capabilities,
  walkthrough: Scene7Walkthrough,
  closing: Scene6Closing,
};

const ORB_POSITIONS = [
  { x: '15%', y: '25%', scale: 1, hue: 'rgba(99,102,241,0.55)' },
  { x: '75%', y: '20%', scale: 1.2, hue: 'rgba(34,211,238,0.45)' },
  { x: '35%', y: '70%', scale: 1.4, hue: 'rgba(129,140,248,0.5)' },
  { x: '70%', y: '60%', scale: 1.1, hue: 'rgba(34,211,238,0.4)' },
  { x: '25%', y: '40%', scale: 1.3, hue: 'rgba(251,191,36,0.25)' },
  { x: '78%', y: '40%', scale: 1.4, hue: 'rgba(34,211,238,0.45)' },
  { x: '50%', y: '55%', scale: 1.5, hue: 'rgba(99,102,241,0.6)' },
];

const ORB2_POSITIONS = [
  { x: '80%', y: '70%' },
  { x: '20%', y: '75%' },
  { x: '70%', y: '25%' },
  { x: '15%', y: '30%' },
  { x: '60%', y: '20%' },
  { x: '15%', y: '60%' },
  { x: '30%', y: '65%' },
];

interface VideoTemplateProps {
  durations?: Record<string, number>;
  loop?: boolean;
  onSceneChange?: (sceneKey: string) => void;
}

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  onSceneChange,
}: VideoTemplateProps = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey as string);
  const safeIndex = sceneIndex >= 0 ? sceneIndex : 0;
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey as string];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#07091a]">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at top, #1e1b4b 0%, #131a36 35%, #0b1020 70%, #07091a 100%)',
        }}
      />

      <motion.div
        className="absolute inset-0 grid-bg"
        style={{ maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)' }}
        animate={{ backgroundPosition: ['0px 0px', '56px 56px'] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      />

      <motion.div
        className="absolute rounded-full blur-3xl pointer-events-none"
        style={{
          width: '55vh',
          height: '55vh',
          background: `radial-gradient(circle, ${ORB_POSITIONS[safeIndex].hue} 0%, transparent 65%)`,
          left: 0,
          top: 0,
        }}
        animate={{
          x: `calc(${ORB_POSITIONS[safeIndex].x} - 27.5vh)`,
          y: `calc(${ORB_POSITIONS[safeIndex].y} - 27.5vh)`,
          scale: ORB_POSITIONS[safeIndex].scale,
        }}
        transition={{ duration: 1.4, ease: [0.65, 0, 0.35, 1] }}
      />
      <motion.div
        className="absolute rounded-full blur-3xl pointer-events-none"
        style={{
          width: '40vh',
          height: '40vh',
          background:
            'radial-gradient(circle, rgba(34,211,238,0.35) 0%, transparent 65%)',
          left: 0,
          top: 0,
        }}
        animate={{
          x: `calc(${ORB2_POSITIONS[safeIndex].x} - 20vh)`,
          y: `calc(${ORB2_POSITIONS[safeIndex].y} - 20vh)`,
        }}
        transition={{ duration: 1.6, ease: [0.65, 0, 0.35, 1] }}
      />

      <motion.div
        className="absolute w-2 h-2 rounded-full bg-cyan-400/80 pointer-events-none"
        style={{ left: '8%', top: '12%' }}
        animate={{ y: [0, 30, 0], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-1.5 h-1.5 rounded-full bg-indigo-400/70 pointer-events-none"
        style={{ right: '10%', bottom: '14%' }}
        animate={{ y: [0, -24, 0], opacity: [0.3, 0.9, 0.3] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="absolute top-[3vh] left-[3vw] flex items-center z-30"
        animate={{ opacity: safeIndex >= 1 && safeIndex < 6 ? 1 : 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="px-2.5 py-1.5 rounded-lg bg-white/95 backdrop-blur-sm">
          <img
            src={`${import.meta.env.BASE_URL}provenpath-logo.png`}
            alt="Proven Path"
            className="h-[3.2vh] w-auto object-contain"
          />
        </div>
      </motion.div>

      <motion.div
        className="absolute top-[3vh] right-[3vw] font-mono text-[0.75vw] tracking-[0.3em] text-white/40 z-30"
        animate={{ opacity: safeIndex < 6 ? 1 : 0 }}
        transition={{ duration: 0.4 }}
      >
        0{Math.min(safeIndex + 1, 7)} / 07
      </motion.div>

      <div className="absolute inset-0 noise opacity-40 pointer-events-none mix-blend-overlay" />

      <AnimatePresence initial={false} mode="wait">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>
    </div>
  );
}
