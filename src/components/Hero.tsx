import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowDown } from 'lucide-react';
import { TOPSON_PROFILE_IMAGE } from '../data/mockData';
import { useLanguage } from '../context/LanguageContext';

interface HeroProps {
  onWatchTutorials: () => void;
  onLiveChat: () => void;
  onExploreScroll: () => void;
  isFullScreenIntegrated?: boolean;
}

export const Hero: React.FC<HeroProps> = ({
  onWatchTutorials,
  onLiveChat,
  onExploreScroll,
  isFullScreenIntegrated = false,
}) => {
  const { t, language } = useLanguage();

  const fullLine1 = t.hero.titleLine1 || 'Tech that moves you.';
  const fullLine2 = t.hero.titleLine2 || 'Master Phone & PC.';

  // Typewriter text state for main headline
  const [typedLine1, setTypedLine1] = useState('');
  const [typedLine2, setTypedLine2] = useState('');
  const [isTypingLine1, setIsTypingLine1] = useState(true);
  const [isTypingComplete, setIsTypingComplete] = useState(false);

  useEffect(() => {
    // Reset typing animation on language or title change
    setTypedLine1('');
    setTypedLine2('');
    setIsTypingLine1(true);
    setIsTypingComplete(false);

    let charIndex1 = 0;
    let charIndex2 = 0;
    let timer1: NodeJS.Timeout;
    let timer2: NodeJS.Timeout;

    // Type Line 1 smoothly
    timer1 = setInterval(() => {
      if (charIndex1 < fullLine1.length) {
        charIndex1++;
        setTypedLine1(fullLine1.slice(0, charIndex1));
      } else {
        clearInterval(timer1);
        setIsTypingLine1(false);

        // Pause briefly, then type Line 2
        timer2 = setInterval(() => {
          if (charIndex2 < fullLine2.length) {
            charIndex2++;
            setTypedLine2(fullLine2.slice(0, charIndex2));
          } else {
            clearInterval(timer2);
            setIsTypingComplete(true);
          }
        }, 40);
      }
    }, 45);

    return () => {
      clearInterval(timer1);
      clearInterval(timer2);
    };
  }, [fullLine1, fullLine2, language]);

  return (
    <section
      id="hero"
      className={
        isFullScreenIntegrated
          ? 'relative overflow-hidden w-full h-auto flex flex-col justify-center items-center text-white my-auto py-4 sm:py-6 md:py-8'
          : 'relative overflow-hidden py-8 md:py-12 bg-gradient-to-b from-[#070709] via-[#0c0d12] to-[#07070a] text-white border-b border-neutral-800/80 scroll-mt-20'
      }
    >
      {/* FLOATING TECH PARTICLES & AMBIENT GLOWING SPARKS */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Subtle high-tech grid mesh */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-70" />

        {/* Ambient floating tech sparks */}
        <span className="absolute top-1/4 left-[12%] w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_10px_#f97316] animate-particle-1" />
        <span className="absolute top-2/3 left-[22%] w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_12px_#fbbf24] animate-particle-2" />
        <span className="absolute top-1/3 left-[45%] w-1 h-1 rounded-full bg-orange-300 shadow-[0_0_8px_#f97316] animate-particle-3" />
        <span className="absolute bottom-1/4 left-[32%] w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_10px_#f97316] animate-particle-4" />
        <span className="absolute top-1/5 right-[18%] w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_12px_#f97316] animate-particle-2" />
        <span className="absolute bottom-1/3 right-[28%] w-1 h-1 rounded-full bg-amber-300 shadow-[0_0_8px_#f59e0b] animate-particle-1" />
        <span className="absolute top-1/2 right-[42%] w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_10px_#f97316] animate-particle-3" />
      </div>

      {/* SOFT GLOWING ORANGE/NEON RADIAL GRADIENT BACKDROP */}
      <div
        className="absolute right-0 lg:right-4 top-1/2 -translate-y-1/2 w-[260px] sm:w-[380px] md:w-[480px] lg:w-[620px] h-[260px] sm:h-[380px] md:h-[480px] lg:h-[620px] bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.22)_0%,rgba(249,115,22,0.08)_40%,transparent_70%)] blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* 2. TABLET & MOBILE VIEWPORT OPTIMIZED CONTAINER: Tighter vertical gaps & padding */}
      <div className={`max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 relative z-10 w-full ${isFullScreenIntegrated ? 'my-auto' : ''}`}>
        <div className={`flex flex-col-reverse md:grid md:grid-cols-2 md:items-center w-full ${
          isFullScreenIntegrated
            ? 'gap-2.5 sm:gap-4 md:gap-6 md:mt-1 lg:gap-8 xl:gap-14'
            : 'gap-3 sm:gap-4 md:gap-6 md:mt-2 lg:gap-12'
        }`}>

          {/* Left Column: Headline with Typing Effect & Action Buttons */}
          <div className={`w-full md:max-w-none lg:max-w-xl flex flex-col items-start ${
            isFullScreenIntegrated
              ? 'space-y-2 sm:space-y-3 md:space-y-4 lg:space-y-5'
              : 'space-y-2.5 sm:space-y-3.5 md:space-y-4 lg:space-y-6'
          }`}>

            {/* Top tag with smooth fade-in reveal animation and neon pill badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[10px] sm:text-[11px] md:text-xs font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(249,115,22,0.2)] animate-in fade-in slide-in-from-top-2 duration-700">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-orange-500 animate-pulse" />
              <span>{t.hero.kicker}</span>
            </div>

            {/* Main Heading with Slow, Smooth Typing Animation - Scaled for compact mobile/tablet */}
            <h1 className={`font-black tracking-tight leading-[1.05] sm:leading-[0.98] ${
              isFullScreenIntegrated
                ? 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl min-h-[54px] sm:min-h-[72px] md:min-h-[96px] lg:min-h-[130px]'
                : 'text-2xl sm:text-3xl md:text-5xl lg:text-7xl min-h-[58px] sm:min-h-[84px] md:min-h-[120px] lg:min-h-[160px]'
            }`}>
              <span className="block text-white">
                {typedLine1}
                {isTypingLine1 && (
                  <span className="inline-block w-1 sm:w-1.5 h-6 sm:h-8 md:h-10 lg:h-14 bg-orange-500 ml-1 translate-y-0.5 animate-type-cursor" />
                )}
              </span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400">
                {typedLine2}
                {!isTypingLine1 && !isTypingComplete && (
                  <span className="inline-block w-1 sm:w-1.5 h-6 sm:h-8 md:h-10 lg:h-14 bg-orange-500 ml-1 translate-y-0.5 animate-type-cursor" />
                )}
                {isTypingComplete && (
                  <span className="inline-block w-1 sm:w-1.5 h-6 sm:h-8 md:h-10 lg:h-14 bg-orange-500/80 ml-1 translate-y-0.5 animate-type-cursor" />
                )}
              </span>
            </h1>

            {/* 1. MOBILE VIEWPORT OPTIMIZATION: COMPLETELY HIDE description text on mobile using hidden md:block */}
            <p className="hidden md:block text-xs sm:text-sm md:text-base lg:text-lg text-neutral-300 max-w-lg leading-relaxed font-normal">
              {t.hero.subtext}
            </p>

            {/* 2. GLOBAL BRANDED BUTTONS: Watch Tutorials, Subscribe, and Live Chat */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-2.5 md:gap-3 w-full sm:w-auto pt-0.5 sm:pt-1">
              
              {/* "Watch tutorials" button with official YouTube play icon vector & striking neon-orange pulse glowing shadow */}
              <button
                type="button"
                onClick={onWatchTutorials}
                className="h-10 sm:h-11 md:h-12 px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm font-black text-white bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 rounded-xl shadow-[0_0_15px_rgba(249,115,22,0.5)] hover:shadow-[0_0_35px_rgba(249,115,22,0.7)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer inline-flex items-center justify-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial shrink-0"
              >
                {/* Official YouTube Play Icon Vector */}
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white shrink-0" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                <span className="truncate">{t.hero.watchTutorials}</span>
              </button>

              {/* Global Branded "Subscribe" Button (Mobile, Tablet, Desktop) */}
              <button
                type="button"
                onClick={() => window.open('https://youtube.com', '_blank')}
                className="h-10 sm:h-11 md:h-12 px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm font-black text-white bg-[#FF0000] hover:bg-[#e60000] rounded-xl shadow-[0_0_15px_rgba(255,0,0,0.55)] hover:shadow-[0_0_28px_rgba(255,0,0,0.85)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 cursor-pointer inline-flex items-center justify-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial shrink-0"
                title="Subscribe to official channel on YouTube"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white shrink-0" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                <span>Subscribe</span>
              </button>

              {/* "Live Chat" button with futuristic transparent cyber-border style turning neon-orange on hover */}
              <button
                type="button"
                onClick={onLiveChat}
                className="h-10 sm:h-11 md:h-12 px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm font-bold text-white bg-neutral-900/80 backdrop-blur-md border border-neutral-700/80 hover:border-orange-500 hover:bg-orange-500/15 hover:shadow-[0_0_20px_rgba(249,115,22,0.45)] hover:text-orange-400 active:scale-[0.98] rounded-xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer inline-flex items-center justify-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial shrink-0"
              >
                <span>{t.hero.liveChat}</span>
                <ArrowRight className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              </button>
            </div>

            {/* Bottom-left Micro Profile Badge & Scroll Prompt - Compact layout */}
            <div className={`border-t border-neutral-800/80 w-full flex flex-row items-center justify-between gap-2 sm:gap-4 ${
              isFullScreenIntegrated ? 'pt-2 sm:pt-2.5 md:pt-3' : 'pt-2.5 sm:pt-3 md:pt-4'
            }`}>
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="relative shrink-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full overflow-hidden border-2 border-orange-500 p-0.5 bg-neutral-900 shadow-sm shadow-orange-500/30">
                    <img
                      src={TOPSON_PROFILE_IMAGE}
                      alt="Topson Media Profile"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[8px] sm:text-[9px] font-bold shadow-xs">
                    +
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-bold text-white truncate">
                    {t.hero.makingTechEasy}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-neutral-400 font-medium truncate">
                    {t.hero.curiousMinds}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onExploreScroll}
                className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-neutral-400 hover:text-orange-400 transition-colors cursor-pointer shrink-0"
              >
                <span className="hidden xs:inline">SCROLL</span>
                <span className="xs:hidden">MORE</span>
                <ArrowDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-400 animate-bounce" />
              </button>
            </div>

          </div>

          {/* Right Column: Perfectly Centered Circular Profile Banner with Glowing Neon-Orange Border */}
          <div className="w-full md:w-full lg:w-auto flex justify-center items-center py-1 sm:py-2 md:py-2 shrink-0">
            <div className={`relative aspect-square flex items-center justify-center mx-auto ${
              isFullScreenIntegrated
                ? 'w-32 h-32 sm:w-40 sm:h-40 md:w-52 md:h-52 lg:w-[340px] lg:h-[340px] xl:w-[400px] xl:h-[400px]'
                : 'w-36 h-36 sm:w-44 sm:h-44 md:w-60 md:h-60 lg:w-[420px] lg:h-[420px]'
            }`}>

              {/* Circular Neon Glow Aura */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-orange-500/35 via-amber-500/20 to-orange-600/30 blur-xl sm:blur-2xl scale-110 pointer-events-none animate-pulse" />

              {/* Exact Circular Frame with Neon Glow and Smooth Floating Animation */}
              <div className="animate-float-visibility w-full h-full aspect-square rounded-full overflow-hidden bg-neutral-900 border-[3px] sm:border-4 border-orange-500 shadow-[0_0_35px_rgba(249,115,22,0.55)] ring-2 sm:ring-4 ring-orange-500/30 relative group transition-all duration-500">
                {/* Official Creator Portrait */}
                <img
                  src="/welcome.png"
                  alt="Topson Media Welcome Image"
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== 'https://i.postimg.cc/Hsb9TQcX/profile.png') {
                      target.src = 'https://i.postimg.cc/Hsb9TQcX/profile.png';
                    }
                  }}
                />

                {/* Subtle Inner Circular Highlight */}
                <div className="absolute inset-0 rounded-full pointer-events-none ring-1 ring-inset ring-orange-400/30" />
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
