import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { TOPSON_PROFILE_IMAGE } from '../data/mockData';

interface PreloaderProps {
  onComplete?: () => void;
  durationMs?: number;
}

// 2. BRAND MOTIVATIONAL SLOGAN TEXT IN ALL CAPITAL LETTERS
const BRAND_SLOGAN = 'LEARN & GAIN SKILLS';

export const Preloader: React.FC<PreloaderProps> = ({
  onComplete,
  durationMs = 3800,
}) => {
  // 1. STATE CONTROLLER LIFE-CYCLE
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [displayedText, setDisplayedText] = useState<string>('');

  useEffect(() => {
    // Progressive Typewriter reveal for "LEARN & GAIN SKILLS"
    const totalChars = BRAND_SLOGAN.length;
    const typeDelay = 350; // brief pause before typing starts
    const typeInterval = Math.max(65, Math.floor((durationMs - 1100) / totalChars));

    let charIndex = 0;
    const startTimeout = setTimeout(() => {
      const typeTimer = setInterval(() => {
        charIndex++;
        setDisplayedText(BRAND_SLOGAN.slice(0, charIndex));
        if (charIndex >= totalChars) {
          clearInterval(typeTimer);
        }
      }, typeInterval);

      return () => clearInterval(typeTimer);
    }, typeDelay);

    // Main completion timer for smooth lifecycle transition
    const completionTimer = setTimeout(() => {
      setIsLoading(false);
    }, durationMs);

    return () => {
      clearTimeout(startTimeout);
      clearTimeout(completionTimer);
    };
  }, [durationMs]);

  // Handle immediate dismiss
  const handleDismiss = () => {
    setIsLoading(false);
  };

  return (
    <AnimatePresence
      onExitComplete={() => {
        if (onComplete) onComplete();
      }}
    >
      {isLoading && (
        <motion.div
          key="cinematic-white-preloader"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.04,
            filter: 'blur(8px)',
            transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] },
          }}
          className="bg-slate-50 w-screen h-screen fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden select-none px-3"
          aria-label="Topson Media Welcome Preloader"
        >
          {/* Subtle Ambient Light Grid Mesh */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(249,115,22,0.12),rgba(255,255,255,0))]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.025)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem]" />
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-5xl text-center">
            
            {/* 1. DYNAMIC CIRCLING BACKDROP BEHIND PROFILE (Profile Image Remains 100% Static) */}
            <div className="relative flex items-center justify-center mb-4 sm:mb-6">
              
              {/* Luminous Neon-Orange Radial Glow Field for White Background */}
              <div
                className="absolute w-48 h-48 sm:w-60 sm:h-60 md:w-72 md:h-72 rounded-full bg-gradient-to-tr from-orange-500/25 via-amber-400/20 to-transparent blur-3xl pointer-events-none animate-pulse"
                style={{ animationDuration: '3s' }}
              />

              {/* DUAL-CONCENTRIC DECORATIVE BLUR RING: Endless Infinite 6s CSS Rotation */}
              <div
                className="absolute -inset-4 sm:-inset-6 md:-inset-8 rounded-full pointer-events-none animate-spin"
                style={{
                  animationDuration: '6s',
                  animationTimingFunction: 'linear',
                  animationIterationCount: 'infinite',
                }}
              >
                {/* Outer concentric gradient border ring */}
                <div className="w-full h-full rounded-full border-2 border-dashed border-orange-500/40 p-2 sm:p-3">
                  {/* Inner neon energy arc with high-contrast gradient colors */}
                  <div className="w-full h-full rounded-full border-2 sm:border-[3px] border-t-amber-500 border-r-orange-600 border-b-transparent border-l-amber-400/40 shadow-[0_0_20px_rgba(249,115,22,0.4)]" />
                </div>
              </div>

              {/* Counter-spinning subtle secondary energy orbital particles */}
              <div
                className="absolute -inset-2 sm:-inset-3 rounded-full pointer-events-none animate-spin"
                style={{
                  animationDuration: '10s',
                  animationTimingFunction: 'linear',
                  animationDirection: 'reverse',
                  animationIterationCount: 'infinite',
                }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b] absolute top-0 left-1/2 -translate-x-1/2" />
                <div className="w-2 h-2 rounded-full bg-orange-600 shadow-[0_0_8px_#ea580c] absolute bottom-0 left-1/2 -translate-x-1/2" />
              </div>

              {/* FIXED 100% STATIC PROFILE AVATAR CONTAINER (Strictly Zero Spin) */}
              <div className="relative z-10 w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-full p-1 bg-white border-2 border-orange-500 shadow-xl shadow-orange-500/25 ring-4 ring-orange-200/60">
                <div className="w-full h-full rounded-full overflow-hidden bg-white">
                  <img
                    src="/welcome.png"
                    alt="topson media"
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== TOPSON_PROFILE_IMAGE) {
                        target.src = TOPSON_PROFILE_IMAGE;
                      }
                    }}
                  />
                </div>
              </div>

            </div>

            {/* Top Studio Kicker Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-[10px] sm:text-xs font-sans tracking-widest uppercase mb-1 shadow-2xs">
              <Sparkles className="w-3 h-3 text-orange-500 animate-spin" style={{ animationDuration: '4s' }} />
              <span>OFFICIAL STUDIO</span>
            </div>

            {/* 2. TEXT CONTENT & MAXIMUM GEOMETRIC BOLDNESS: "LEARN & GAIN SKILLS"
                Exact Tailwind specification: font-sans font-black tracking-tight text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-orange-600 to-amber-500 drop-shadow-[0_4px_12px_rgba(249,115,22,0.2)] uppercase whitespace-nowrap mt-8 */}
            <div className="w-full flex items-center justify-center overflow-hidden px-1 whitespace-nowrap">
              <h1
                style={{ fontWeight: 900 }}
                className="preloader-brand-title font-sans font-black font-[900] tracking-tight text-2xl xs:text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-orange-600 to-amber-500 drop-shadow-[0_4px_12px_rgba(249,115,22,0.2)] uppercase whitespace-nowrap mt-8 min-h-[1.2em] flex items-center justify-center leading-none select-none text-center"
              >
                <span>{displayedText}</span>
                {displayedText.length < BRAND_SLOGAN.length && (
                  <span className="inline-block w-1 sm:w-1.5 md:w-2 h-7 sm:h-12 md:h-16 lg:h-20 bg-orange-600 ml-1 sm:ml-2 animate-pulse" />
                )}
              </h1>
            </div>

            {/* Minimalist Light Loading Bar */}
            <div className="w-36 sm:w-48 h-1.5 bg-slate-200 rounded-full mt-6 sm:mt-8 overflow-hidden shadow-2xs">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{
                  repeat: Infinity,
                  duration: 1.5,
                  ease: 'easeInOut',
                }}
                className="w-1/2 h-full bg-gradient-to-r from-transparent via-orange-500 to-transparent"
              />
            </div>

            {/* Optional Dismiss button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="mt-6 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-orange-600 transition-colors cursor-pointer py-1.5 px-3.5 rounded-full hover:bg-orange-50 border border-slate-200/80 font-sans shadow-2xs"
            >
              <span>Skip Intro</span>
              <ArrowRight className="w-3 h-3" />
            </button>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
