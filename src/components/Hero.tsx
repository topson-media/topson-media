import React from 'react';
import { Play, ArrowRight, ArrowDown } from 'lucide-react';
import { TOPSON_HERO_BADGE, TOPSON_PROFILE_IMAGE } from '../data/mockData';
import { useLanguage } from '../context/LanguageContext';

interface HeroProps {
  onWatchTutorials: () => void;
  onLiveChat: () => void;
  onExploreScroll: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  onWatchTutorials,
  onLiveChat,
  onExploreScroll,
}) => {
  const { t, language } = useLanguage();

  const kickerWords = t.hero.kicker;
  const headingLine1Words = t.hero.titleLine1.split(' ');
  const headingLine2Words = t.hero.titleLine2.split(' ');
  const subtextWords = t.hero.subtext.split(' ');

  return (
    <section id="hero" className="relative overflow-hidden pt-8 pb-12 sm:pt-10 sm:pb-16 lg:py-20 bg-white scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex flex-col-reverse md:grid md:grid-cols-2 md:items-center md:gap-6 lg:flex lg:flex-row lg:items-center lg:justify-between lg:gap-12 w-full">
          
          {/* Left Column: Bold Headline & Animated Copy (Underneath image on mobile, Left side on tablet/desktop) */}
          <div className="w-full md:max-w-none lg:max-w-xl flex flex-col items-start space-y-4 sm:space-y-6 lg:space-y-7">
            
            {/* Kicker: • THE EVERYDAY TECH ADVANTAGE */}
            <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold tracking-widest uppercase text-neutral-800">
              <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
              <div className="flex flex-wrap gap-x-1.5">
                {kickerWords.map((word, idx) => (
                  <span
                    key={`${language}-${idx}`}
                    className="animate-word"
                    style={{ animationDelay: `${idx * 90}ms` }}
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>

            {/* Mobile-Summarized Headline (< md) */}
            <h1 className="md:hidden text-3xl font-black text-neutral-900 tracking-tight leading-[1.08]">
              <span className="block">{t.hero.titleLine1}</span>
              <span className="block text-orange-500">{t.hero.titleLine2}</span>
            </h1>

            {/* Desktop Full Animated Headline (>= md) */}
            <h1 className="hidden md:block text-5xl lg:text-7xl font-black text-neutral-900 tracking-tight leading-[0.98]">
              <span className="block">
                {headingLine1Words.map((word, idx) => (
                  <span
                    key={`${language}-h1-${idx}`}
                    className="animate-word mr-2.5 sm:mr-3.5"
                    style={{ animationDelay: `${400 + idx * 100}ms` }}
                  >
                    {word}
                  </span>
                ))}
              </span>
              <span className="block text-orange-500">
                {headingLine2Words.map((word, idx) => (
                  <span
                    key={`${language}-h2-${idx}`}
                    className="animate-word mr-2.5 sm:mr-3.5"
                    style={{ animationDelay: `${620 + idx * 110}ms` }}
                  >
                    {word}
                  </span>
                ))}
              </span>
            </h1>

            {/* Mobile-Summarized Subtext (< md) */}
            <p className="md:hidden text-xs text-neutral-700 leading-relaxed font-medium">
              {t.hero.subtext}
            </p>

            {/* Desktop Full Animated Subtext (>= md) */}
            <p className="hidden md:flex text-base lg:text-lg text-neutral-800 max-w-lg leading-relaxed flex-wrap gap-x-1.5 gap-y-1">
              {subtextWords.map((word, idx) => {
                const isHighlight = ['Phone', 'PC', 'tutorials,', 'tutorials', 'Ikoranabuhanga'].some((hw) =>
                  word.includes(hw)
                );
                return (
                  <span
                    key={`${language}-sub-${idx}`}
                    className={`animate-word ${
                      isHighlight
                        ? 'font-bold text-neutral-950'
                        : 'text-neutral-700'
                    }`}
                    style={{ animationDelay: `${880 + idx * 45}ms` }}
                  >
                    {word}
                  </span>
                );
              })}
            </p>

            {/* Action Buttons: Easy touch targets (h-12 py-3) */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-1 sm:pt-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onWatchTutorials}
                className="h-12 px-6 py-3 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 active:scale-95 rounded-xl shadow-lg shadow-orange-500/25 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer inline-flex items-center justify-center gap-2.5 flex-1 sm:flex-initial"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{t.hero.watchTutorials}</span>
              </button>

              <button
                type="button"
                onClick={onLiveChat}
                className="h-12 px-6 py-3 text-sm font-bold text-neutral-900 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 active:scale-95 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer inline-flex items-center justify-center gap-2 flex-1 sm:flex-initial"
              >
                <span>{t.hero.liveChat}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom-left micro badge */}
            <div className="pt-4 sm:pt-6 border-t border-neutral-200 w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-orange-500/80 p-0.5 bg-white shadow-sm">
                    <img
                      src={TOPSON_PROFILE_IMAGE}
                      alt="Topson Media Profile"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold">
                    +
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold text-neutral-900">
                    {t.hero.makingTechEasy}
                  </div>
                  <div className="text-[11px] text-neutral-600 font-medium">
                    {t.hero.curiousMinds}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onExploreScroll}
                className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-neutral-700 hover:text-orange-600 transition-colors cursor-pointer"
              >
                <span>SCROLL TO EXPLORE</span>
                <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
              </button>
            </div>

          </div>

          {/* Right Column: Welcome Image inside Circular Neon Glow Frame (At top center on mobile, right on tablet/desktop) */}
          <div className="w-full md:w-full lg:w-auto flex justify-center items-center py-2 sm:py-4 shrink-0">
            <div className="relative w-52 h-52 sm:w-60 sm:h-60 md:w-76 md:h-76 lg:w-[450px] lg:h-[450px] aspect-square flex items-center justify-center mx-auto">
              
              {/* Circular Neon Glow Aura */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-orange-500/35 via-amber-500/20 to-orange-600/30 blur-2xl scale-110 pointer-events-none animate-pulse" />

              {/* Exact Circular Frame with Neon Glow and Smooth Floating Animation */}
              <div className="animate-float-visibility w-full h-full aspect-square rounded-full overflow-hidden bg-neutral-900 border-4 border-orange-500 shadow-[0_0_40px_rgba(249,115,22,0.45)] ring-4 ring-orange-500/30 relative group transition-all duration-500">
                
                {/* The Official Creator Portrait directly from local public PNG file */}
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
