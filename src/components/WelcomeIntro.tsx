import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

interface WelcomeIntroProps {
  onComplete: () => void;
}

const BRAND_LETTERS = ['T', 'O', 'P', 'S', 'O', 'N', ' ', 'M', 'E', 'D', 'I', 'A'];
const TOTAL_DURATION_MS = 6000; // 6 seconds total
const STEP_MS = TOTAL_DURATION_MS / BRAND_LETTERS.length; // 500ms per letter

export const WelcomeIntro: React.FC<WelcomeIntroProps> = ({ onComplete }) => {
  const [revealedCount, setRevealedCount] = useState<number>(0);
  const [isExiting, setIsExiting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    // Reveal letters one by one every 500ms
    const letterTimer = setInterval(() => {
      setRevealedCount((prev) => {
        const next = prev + 1;
        if (next >= BRAND_LETTERS.length) {
          clearInterval(letterTimer);
          return BRAND_LETTERS.length;
        }
        return next;
      });
    }, STEP_MS);

    // Smooth progress bar update over 6 seconds
    const progressStartTime = Date.now();
    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - progressStartTime;
      const pct = Math.min(100, Math.round((elapsed / TOTAL_DURATION_MS) * 100));
      setProgress(pct);
    }, 50);

    // At exactly 6 seconds, direct after writing the full word: trigger exit & animate home page
    const completionTimer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        onComplete();
      }, 700); // 700ms smooth fade out transition
    }, TOTAL_DURATION_MS);

    return () => {
      clearInterval(letterTimer);
      clearInterval(progressTimer);
      clearTimeout(completionTimer);
    };
  }, [onComplete]);

  const handleSkip = () => {
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 400);
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white text-slate-900 transition-all duration-700 select-none overflow-hidden ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      aria-label="Welcome to Topson Media"
    >
      {/* Subtle background ambient glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <div className="w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] rounded-full bg-gradient-to-tr from-orange-500/10 via-amber-400/10 to-orange-600/5 blur-3xl animate-pulse" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center px-4 max-w-4xl text-center">
        {/* Welcome Kicker */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs sm:text-sm font-medium tracking-widest uppercase mb-6 sm:mb-8 shadow-xs animate-in fade-in duration-500">
          <Sparkles className="w-3.5 h-3.5 text-orange-500 animate-spin" style={{ animationDuration: '4s' }} />
          <span>WELCOME TO</span>
        </div>

        {/* 6-SECOND LETTER DROP ANIMATION: Words flowing from top into screen */}
        <div className="flex items-center justify-center flex-wrap gap-x-1 sm:gap-x-2 md:gap-x-3 mb-8 sm:mb-12">
          {BRAND_LETTERS.map((char, index) => {
            const isRevealed = index < revealedCount;
            const isSpace = char === ' ';

            if (isSpace) {
              return (
                <span
                  key={`intro-space-${index}`}
                  className="inline-block w-3 sm:w-6 md:w-8"
                  aria-hidden="true"
                >
                  &nbsp;
                </span>
              );
            }

            if (!isRevealed) {
              return (
                <span
                  key={`intro-char-${index}`}
                  className="inline-block opacity-0 w-6 sm:w-10 md:w-14 lg:w-18"
                  aria-hidden="true"
                >
                  {char}
                </span>
              );
            }

            return (
              <span
                key={`intro-char-${index}`}
                className="inline-block text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-medium tracking-tight text-orange-600 transition-all duration-300"
                style={{
                  animation: 'dropLetterFromScreenTop 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                  textShadow: '0 4px 20px rgba(234, 88, 12, 0.35)',
                }}
              >
                {char}
              </span>
            );
          })}
        </div>

        {/* 6-Second Progress Bar */}
        <div className="w-48 sm:w-64 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 mb-6 shadow-2xs">
          <div
            className="h-full bg-orange-600 transition-all duration-100 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Skip button for quick access */}
        <button
          type="button"
          onClick={handleSkip}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 hover:text-orange-600 transition-colors cursor-pointer py-1.5 px-3 rounded-lg hover:bg-orange-50 font-medium"
        >
          <span>Enter Website</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
