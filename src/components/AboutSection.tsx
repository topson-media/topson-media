import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface AboutSectionProps {
  onExploreTutorials: () => void;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ onExploreTutorials }) => {
  const { t } = useLanguage();
  return (
    // 1. COMPLETELY HIDE ON MOBILE: hidden md:block keeps it visible only on tablet and desktop
    <section id="about" className="hidden md:block py-10 sm:py-14 md:py-16 scroll-mt-20 border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Kicker: Clean, elegant Sans-Serif "WHO IS TOPSON MEDIA?" */}
        <div className="text-xs sm:text-sm font-sans font-semibold tracking-wider uppercase text-orange-600 mb-4 sm:mb-6 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <span>{t.about.kicker}</span>
        </div>

        {/* 2-Column Split: Semi-bold Headline on Left, Crisp Story on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start mb-8 sm:mb-12">
          <div className="lg:col-span-5">
            {/* 2. REDUCE FONT BOLDNESS: Refined font-semibold instead of harsh font-black */}
            <h2 className="font-sans font-semibold tracking-tight text-slate-900 text-3xl md:text-5xl antialiased leading-[1.15]">
              {t.about.title}
            </h2>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <p className="font-sans font-normal text-slate-600 leading-relaxed text-base sm:text-lg">
              {t.about.description}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onExploreTutorials}
                className="inline-flex items-center gap-2 font-sans font-medium text-slate-900 hover:text-orange-600 group text-sm sm:text-base cursor-pointer transition-colors"
              >
                <span>{t.about.exploreTutorials}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform text-orange-500" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
