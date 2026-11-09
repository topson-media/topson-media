import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { TOPSON_PROFILE_IMAGE } from '../data/mockData';

interface PreloaderProps {
  onComplete?: () => void;
  durationMs?: number;
}

const BRAND_NAME = 'TOPSON MEDIA';

export const Preloader: React.FC<PreloaderProps> = ({
  onComplete,
  durationMs = 3800,
}) => {
  // 1. STATE CONTROLLER LIFE-CYCLE
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [displayedText, setDisplayedText] = useState<string>('');

  useEffect(() => {
    // Progressive Typewriter reveal for "TOPSON MEDIA"
    const totalChars = BRAND_NAME.length;
    const typeDelay = 400; // start typing after 400ms
    const typeInterval = Math.max(80, Math.floor((durationMs - 1200) / totalChars));

    let charIndex = 0;
    const startTimeout = setTimeout(() => {
      const typeTimer = setInterval(() => {
        charIndex++;
        setDisplayedText(BRAND_NAME.slice(0, charIndex));
        if (charIndex >= totalChars) {
          clearInterval(typeTimer);
        }
      }, typeInterval);

      return () => clearInterval(typeTimer);
    }, typeDelay);

    // Main completion timer for 3-5s flexible retention window
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
          key="cinematic-preloader"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.04,
            filter: 'blur(8px)',
            transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] },
          }}
          className="bg-black w-screen h-screen fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none"
          aria-label="Topson Media Welcome Preloader"
        >
          {/* Subtle Ambient Background Mesh */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(234,88,12,0.18),rgba(0,0,0,0))]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem]" />
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center px-4 max-w-lg text-center">
            
            {/* 2. VISUAL LAYOUT & ATTRACTIVE FLOATING ANIMATION */}
            <div className="relative flex items-center justify-center">
              {/* High-end glowing soft neon-orange radial backdrop */}
              <div
                className="absolute w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-full bg-gradient-to-tr from-orange-600/40 via-amber-500/30 to-orange-500/15 blur-2xl sm:blur-3xl pointer-events-none animate-pulse"
                style={{ animationDuration: '3s' }}
              />

              {/* Gentle pulsing breathing effect scaling continuously */}
              <motion.div
                animate={{
                  scale: [1, 1.055, 1],
                  y: [0, -6, 0],
                }}
                transition={{
                  duration: 3.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-full p-1 bg-gradient-to-b from-orange-500 to-amber-500/60 shadow-[0_0_50px_rgba(249,115,22,0.45)] ring-4 ring-orange-500/20"
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-black border-2 border-orange-400/80">
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
              </motion.div>
            </div>

            {/* 3. GEOMETRIC TYPOGRAPHY METADATA */}
            <div className="mt-6 sm:mt-8 flex flex-col items-center w-full max-w-4xl px-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[10px] sm:text-xs font-sans tracking-widest uppercase mb-2">
                <Sparkles className="w-3 h-3 text-orange-400 animate-spin" style={{ animationDuration: '4s' }} />
                <span>OFFICIAL STUDIO</span>
              </div>

              {/* INTENSE EXTRA-BOLD MASSIVE SCALE & HIGH-CONTRAST GLOWING GRADIENT */}
              <h1
                style={{ fontWeight: 900 }}
                className="preloader-brand-title font-sans font-black font-[900] uppercase text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-400 to-orange-600 min-h-[1.2em] flex items-center justify-center leading-none select-none text-center drop-shadow-[0_10px_35px_rgba(234,88,12,0.4)]"
              >
                <span>{displayedText}</span>
                {displayedText.length < BRAND_NAME.length && (
                  <span className="inline-block w-1 sm:w-1.5 md:w-2 h-10 sm:h-14 md:h-18 lg:h-20 bg-orange-500 ml-1.5 sm:ml-2 animate-pulse" />
                )}
              </h1>
            </div>

            {/* Cinematic Minimal Loading Indicator */}
            <div className="w-36 sm:w-48 h-1 bg-white/10 rounded-full mt-8 overflow-hidden">
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
              className="mt-6 inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-orange-400 transition-colors cursor-pointer py-1 px-3 rounded-full hover:bg-white/5 font-sans"
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
