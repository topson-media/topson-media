import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, ArrowDown, X, Sparkles, ExternalLink } from 'lucide-react';
import { TOPSON_PROFILE_IMAGE } from '../data/mockData';
import { useLanguage } from '../context/LanguageContext';
import { MonetizationCampaign } from '../types';

interface HeroProps {
  onWatchTutorials: () => void;
  onLiveChat: () => void;
  onExploreScroll: () => void;
  isFullScreenIntegrated?: boolean;
  campaign?: MonetizationCampaign | null;
}

const FULL_BRAND_TITLE = 'TOPSON MEDIA';

export const Hero: React.FC<HeroProps> = ({
  onWatchTutorials,
  onLiveChat,
  onExploreScroll,
  isFullScreenIntegrated = false,
  campaign,
}) => {
  const { t } = useLanguage();

  // Interactive bouncing letter state
  const [bouncingIndex, setBouncingIndex] = useState<number | null>(null);

  // Sponsored Ad Dismiss & 5-Minute Recurring Reappearance Timer
  const [isAdDismissed, setIsAdDismissed] = useState(false);
  const adTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDismissAd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAdDismissed(true);

    if (adTimerRef.current) {
      clearTimeout(adTimerRef.current);
    }

    // Repeatedly display again after 5 minutes (300,000 ms)
    adTimerRef.current = setTimeout(() => {
      setIsAdDismissed(false);
    }, 5 * 60 * 1000);
  };

  useEffect(() => {
    return () => {
      if (adTimerRef.current) {
        clearTimeout(adTimerRef.current);
      }
    };
  }, []);

  // Handle letter click interaction
  const handleLetterClick = (index: number) => {
    setBouncingIndex(index);
    setTimeout(() => {
      setBouncingIndex(null);
    }, 800);
  };

  return (
    <section
      id="hero"
      className={
        isFullScreenIntegrated
          ? 'relative overflow-hidden w-full h-auto flex flex-col justify-center items-center text-slate-900 my-auto py-4 sm:py-6 md:py-8'
          : 'relative overflow-hidden py-8 md:py-12 bg-slate-50 text-slate-900 border-b border-slate-200 shadow-xs scroll-mt-20'
      }
    >
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className={`max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 relative z-10 w-full ${isFullScreenIntegrated ? 'my-auto' : ''}`}>
        <div className={`flex flex-col-reverse md:grid md:grid-cols-2 md:items-center w-full ${
          isFullScreenIntegrated
            ? 'gap-2.5 sm:gap-4 md:gap-6 md:mt-1 lg:gap-8 xl:gap-14'
            : 'gap-3 sm:gap-4 md:gap-6 md:mt-2 lg:gap-12'
        }`}>

          {/* Left Column: Welcome Message with Living Animated Words & Accessible Single-Color Action Buttons */}
          <div className={`w-full md:max-w-none lg:max-w-xl flex flex-col items-start ${
            isFullScreenIntegrated
              ? 'space-y-2 sm:space-y-3 md:space-y-4 lg:space-y-5'
              : 'space-y-2.5 sm:space-y-3.5 md:space-y-4 lg:space-y-6'
          }`}>

            {/* Top kicker badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-[10px] sm:text-[11px] md:text-xs font-medium tracking-wider uppercase shadow-xs">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-orange-500 animate-pulse" />
              <span>{t.hero.kicker}</span>
            </div>

            {/* Welcome Message Label */}
            <div className="text-xs sm:text-sm font-medium tracking-widest uppercase text-orange-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
              <span>WELCOME TO</span>
            </div>

            {/* Main Interactive Headline: CONTINUOUSLY ANIMATING WORDS WITH LIVING WAVE & INTERACTIVE BOUNCE */}
            <h1
              className="font-sans font-medium tracking-tight text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-slate-900 leading-tight select-none"
              aria-label="TOPSON MEDIA"
            >
              <span className="inline-flex flex-wrap items-baseline">
                {FULL_BRAND_TITLE.split('').map((char, index) => {
                  const isSpace = char === ' ';
                  const isBouncing = bouncingIndex === index;

                  if (isSpace) {
                    return (
                      <span key={`char-${index}`} className="inline-block w-2 sm:w-3 md:w-4">
                        &nbsp;
                      </span>
                    );
                  }

                  return (
                    <span
                      key={`char-${index}`}
                      onClick={() => handleLetterClick(index)}
                      className={`inline-block font-medium cursor-pointer transition-all duration-300 text-orange-600 hover:text-orange-500 hover:scale-125 hover:-translate-y-1 active:scale-95 animate-living-word ${
                        isBouncing ? 'animate-bounce text-amber-500' : ''
                      }`}
                      style={{
                        animationDelay: `${index * 120}ms`,
                        textShadow: '0 2px 10px rgba(234, 88, 12, 0.25)',
                      }}
                      title={`Letter ${char} - Click to bounce!`}
                    >
                      {char}
                    </span>
                  );
                })}
              </span>
            </h1>

            {/* Description text - non-bold typography */}
            <p className="hidden md:block text-xs sm:text-sm md:text-base lg:text-lg text-slate-600 max-w-lg leading-relaxed font-normal">
              {t.hero.subtext}
            </p>

            {/* SINGLE SOLID COLOR ACCESSIBLE BUTTONS */}
            <div className="grid grid-cols-3 gap-2 w-full px-2 items-center">
              
              {/* "Watch tutorials" button - Solid Accessible Orange */}
              <button
                type="button"
                onClick={onWatchTutorials}
                className="h-10 sm:h-11 md:h-12 px-1 sm:px-2 md:px-3 py-2 sm:py-2.5 text-xs md:text-sm font-medium whitespace-nowrap text-white bg-orange-600 hover:bg-orange-700 active:bg-orange-800 rounded-xl shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer inline-flex items-center justify-center gap-1 sm:gap-1.5 w-full min-w-0"
              >
                {/* Official YouTube Play Icon Vector */}
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white shrink-0" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                <span className="truncate">{t.hero.watchTutorials}</span>
              </button>

              {/* Global "Subscribe" Button - Solid Accessible YouTube Red */}
              <button
                type="button"
                onClick={() => window.open('https://youtube.com', '_blank')}
                className="h-10 sm:h-11 md:h-12 px-1 sm:px-2 md:px-3 py-2 sm:py-2.5 text-xs md:text-sm font-medium whitespace-nowrap text-white bg-[#dc2626] hover:bg-[#b91c1c] active:bg-[#991b1b] rounded-xl shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 cursor-pointer inline-flex items-center justify-center gap-1 sm:gap-1.5 w-full min-w-0"
                title="Subscribe to official channel on YouTube"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white shrink-0" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                <span className="truncate">Subscribe</span>
              </button>

              {/* "Live Chat" button - Solid Accessible Dark Slate */}
              <button
                type="button"
                onClick={onLiveChat}
                className="h-10 sm:h-11 md:h-12 px-1 sm:px-2 md:px-3 py-2 sm:py-2.5 text-xs md:text-sm font-medium whitespace-nowrap text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 rounded-xl shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 cursor-pointer inline-flex items-center justify-center gap-1 sm:gap-1.5 w-full min-w-0"
              >
                <span className="truncate">{t.hero.liveChat}</span>
                <ArrowRight className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              </button>
            </div>

            {/* Bottom-left Micro Profile Badge & Scroll Prompt */}
            <div className={`border-t border-slate-200/80 w-full flex flex-row items-center justify-between gap-2 sm:gap-4 ${
              isFullScreenIntegrated ? 'pt-2 sm:pt-2.5 md:pt-3' : 'pt-2.5 sm:pt-3 md:pt-4'
            }`}>
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="relative shrink-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full overflow-hidden border-2 border-orange-500 p-0.5 bg-white shadow-xs">
                    <img
                      src={TOPSON_PROFILE_IMAGE}
                      alt="Topson Media Profile"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[8px] sm:text-[9px] font-medium shadow-xs">
                    +
                  </span>
                </div>

                {/* Social media icons */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* YouTube */}
                  <a
                    href="https://www.youtube.com/@topson-media1"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white border border-slate-200 hover:border-orange-500 hover:bg-orange-50 text-slate-600 hover:text-orange-600 shadow-xs transition-colors flex items-center justify-center group active:scale-95"
                    title="YouTube channel"
                    aria-label="Topson Media on YouTube"
                  >
                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  </a>

                  {/* TikTok */}
                  <a
                    href="https://tiktok.com/@topsonmedia"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white border border-slate-200 hover:border-orange-500 hover:bg-orange-50 text-slate-600 hover:text-orange-600 shadow-xs transition-colors flex items-center justify-center group active:scale-95"
                    title="TikTok profile"
                    aria-label="Topson Media on TikTok"
                  >
                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
                    </svg>
                  </a>

                  {/* Instagram */}
                  <a
                    href="https://instagram.com/topson.media"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white border border-slate-200 hover:border-orange-500 hover:bg-orange-50 text-slate-600 hover:text-orange-600 shadow-xs transition-colors flex items-center justify-center group active:scale-95"
                    title="Instagram profile"
                    aria-label="Topson Media on Instagram"
                  >
                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>

                  {/* Facebook */}
                  <a
                    href="https://www.facebook.com/etienne.topson.kenedy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white border border-slate-200 hover:border-orange-500 hover:bg-orange-50 text-slate-600 hover:text-orange-600 shadow-xs transition-colors flex items-center justify-center group active:scale-95"
                    title="Facebook page"
                    aria-label="Topson Media on Facebook"
                  >
                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>
                </div>
              </div>

              <button
                type="button"
                onClick={onExploreScroll}
                className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-medium tracking-wider uppercase text-slate-500 hover:text-orange-600 transition-colors cursor-pointer shrink-0"
              >
                <span className="hidden xs:inline">SCROLL</span>
                <span className="xs:hidden">MORE</span>
                <ArrowDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-500 animate-bounce" />
              </button>
            </div>

          </div>

          {/* Right Column: SPONSORED AD (PLACED ABOVE, STRICTLY NOT COVERING THE WELCOME IMAGE) & CONTINUOUSLY ANIMATING WELCOME IMAGE */}
          <div className="w-full md:w-full lg:w-auto flex flex-col justify-center items-center py-1 sm:py-2 md:py-2 shrink-0">

            {/* SPONSORED BANNER: Placed cleanly ABOVE the welcome image container so it NEVER covers or touches the circular image */}
            {campaign && campaign.isActive && campaign.title && !isAdDismissed && (
              <aside
                aria-label="Sponsored advertisement"
                className="w-full max-w-[280px] sm:max-w-[340px] mb-3 sm:mb-4 animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-500 z-20"
              >
                <div className="relative bg-amber-400 border-2 border-orange-600 text-slate-950 rounded-xl p-2 sm:p-2.5 shadow-md shadow-orange-500/20 flex items-start justify-between gap-2 transition-transform hover:scale-[1.01]">
                  <a
                    href={campaign.redirectUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0 cursor-pointer block group"
                    title={campaign.title}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[9px] sm:text-[10px] font-medium tracking-wider uppercase bg-slate-950 text-white px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                        <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                        <span>SPONSORED</span>
                      </span>
                      <ExternalLink className="w-3 h-3 text-slate-900 group-hover:text-orange-950 transition-colors shrink-0" />
                    </div>

                    <div className="text-xs sm:text-sm font-medium text-slate-950 truncate leading-tight group-hover:underline">
                      {campaign.title}
                    </div>

                    {campaign.description && (
                      <p className="text-[10px] sm:text-[11px] text-slate-800 line-clamp-1 mt-0.5 font-normal">
                        {campaign.description}
                      </p>
                    )}
                  </a>

                  {/* 'X' Close Button with 5-minute recurring timer */}
                  <button
                    type="button"
                    onClick={handleDismissAd}
                    className="p-1 rounded-full bg-white/90 hover:bg-white text-slate-900 hover:text-black border border-slate-300 shadow-xs cursor-pointer shrink-0 transition-colors"
                    title="Close advertisement (will reappear in 5 minutes)"
                    aria-label="Close advertisement"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </aside>
            )}

            {/* Circular Profile Banner: CONTINUOUSLY ANIMATING, 100% UNOBSTRUCTED AND UNCOVERED */}
            <div className={`relative aspect-square flex items-center justify-center mx-auto ${
              isFullScreenIntegrated
                ? 'w-36 h-36 sm:w-44 sm:h-44 md:w-56 md:h-56 lg:w-[360px] lg:h-[360px] xl:w-[420px] xl:h-[420px]'
                : 'w-40 h-40 sm:w-48 sm:h-48 md:w-64 md:h-64 lg:w-[430px] lg:h-[430px]'
            }`}>

              {/* Continuous Breathing Warm Glow Aura */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-orange-500/25 via-amber-500/15 to-orange-600/20 blur-xl sm:blur-2xl scale-105 pointer-events-none animate-pulse" />

              {/* Exact Circular Welcome Image with CONTINUOUS FLOATING & PULSE ANIMATION */}
              <div className="animate-welcome-float w-full h-full aspect-square rounded-full overflow-hidden bg-white border-[3px] sm:border-4 border-orange-500 shadow-xl shadow-orange-500/20 ring-2 sm:ring-4 ring-orange-200/50 relative group transition-all duration-500">
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
