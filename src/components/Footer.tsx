import React, { useState } from 'react';
import { Mail, Phone, Check, Copy } from 'lucide-react';
import { TOPSON_PROFILE_IMAGE } from '../data/mockData';
import { useLanguage } from '../context/LanguageContext';
import { WhatsAppIcon } from './WhatsAppIcon';

export const Footer: React.FC = () => {
  const { t } = useLanguage();
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const socialLinks = [
    {
      name: 'TikTok',
      url: 'https://www.tiktok.com/@topsonmedia',
      icon: (
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-black border border-neutral-800 flex items-center justify-center hover:scale-105 transition-all shadow-sm group">
          <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none">
            <path
              d="M17.5 7.2a4.6 4.6 0 0 1-3.6-3.4H11v12.2a2.6 2.6 0 1 1-2.6-2.6c.4 0 .7.1 1.1.2V10.2a6 6 0 0 0-1.1-.1 6 6 0 1 0 6 6V8.9a7.9 7.9 0 0 0 4.2 1.3V7.2a4.7 4.7 0 0 1-1.1 0z"
              fill="#25F4EE"
              transform="translate(-0.8, -0.6)"
            />
            <path
              d="M17.5 7.2a4.6 4.6 0 0 1-3.6-3.4H11v12.2a2.6 2.6 0 1 1-2.6-2.6c.4 0 .7.1 1.1.2V10.2a6 6 0 0 0-1.1-.1 6 6 0 1 0 6 6V8.9a7.9 7.9 0 0 0 4.2 1.3V7.2a4.7 4.7 0 0 1-1.1 0z"
              fill="#FE2C55"
              transform="translate(0.8, 0.6)"
            />
            <path
              d="M17.5 7.2a4.6 4.6 0 0 1-3.6-3.4H11v12.2a2.6 2.6 0 1 1-2.6-2.6c.4 0 .7.1 1.1.2V10.2a6 6 0 0 0-1.1-.1 6 6 0 1 0 6 6V8.9a7.9 7.9 0 0 0 4.2 1.3V7.2a4.7 4.7 0 0 1-1.1 0z"
              fill="#FFFFFF"
            />
          </svg>
        </div>
      ),
    },
    {
      name: 'YouTube',
      url: 'https://www.youtube.com/@topson-media1',
      icon: (
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FF0000] flex items-center justify-center text-white hover:scale-105 transition-all shadow-sm shadow-red-500/30">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-white" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        </div>
      ),
    },
    {
      name: 'Facebook',
      url: 'https://www.facebook.com/etienne.topson.kenedy',
      icon: (
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1877F2] flex items-center justify-center text-white hover:scale-105 transition-all shadow-sm shadow-blue-500/30">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-white" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </div>
      ),
    },
    {
      name: 'Instagram',
      url: 'https://instagram.com/topson_media',
      icon: (
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white hover:scale-105 transition-all shadow-sm shadow-pink-500/30">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-white" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
        </div>
      ),
    },
    {
      name: 'WhatsApp',
      url: 'https://wa.me/250794903078',
      icon: (
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#25D366] flex items-center justify-center text-white hover:scale-105 transition-all shadow-sm shadow-emerald-500/30">
          <WhatsAppIcon className="w-5 h-5 fill-white" />
        </div>
      ),
    },
  ];

  return (
    <footer className="border-t border-neutral-200 bg-white py-6 sm:py-14 text-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* MOBILE VIEWPORT ONLY (Ultra-compact horizontal alignment layout) */}
        <div className="flex flex-col items-center text-center space-y-4 md:hidden pb-4">
          {/* Logo & Brand Wordmark */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-orange-500/90 p-0.5 bg-white shrink-0 shadow-xs">
              <img
                src={TOPSON_PROFILE_IMAGE}
                alt="Topson Media Logo"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <span className="text-xs font-black tracking-wider uppercase text-neutral-900">
              TOPSON MEDIA
            </span>
          </div>

          {/* FOLLOW US ON: closely grouped in a single horizontal row */}
          <div className="space-y-1.5 w-full">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">
              FOLLOW US ON
            </span>
            <div className="flex flex-row items-center justify-center gap-2">
              {socialLinks.map((s) => (
                <a
                  key={s.name}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  className="scale-90"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* CONTACT US ON: single compact row with smaller font sizes */}
          <div className="space-y-1.5 w-full">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">
              CONTACT US ON
            </span>
            <div className="flex flex-row items-center justify-center gap-2.5 flex-wrap text-xs">
              <a
                href="mailto:topsonkenedy@gmail.com"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-800 hover:text-orange-600 transition-colors shadow-2xs font-semibold text-[11px]"
                title="Send email to Topson Media"
              >
                <Mail className="w-3.5 h-3.5 text-orange-500" />
                <span>mail topson media</span>
              </a>

              <a
                href="https://wa.me/250794903078"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-800 hover:text-emerald-600 transition-colors shadow-2xs font-semibold text-[11px]"
                title="Message on WhatsApp"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-[#25D366] flex items-center justify-center text-white shrink-0">
                  <WhatsAppIcon className="w-2.5 h-2.5 fill-white" />
                </div>
                <span>0794903078</span>
              </a>
            </div>
          </div>

          {/* EXPLORE: arranged horizontally in a single row */}
          <div className="w-full pt-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-1.5">
              EXPLORE
            </span>
            <div className="flex flex-row justify-center gap-4 text-xs font-semibold text-neutral-600">
              <a href="#hero" className="hover:text-orange-600 transition-colors">Home</a>
              <a href="#videos" className="hover:text-orange-600 transition-colors">Videos</a>
              <a href="#community" className="hover:text-orange-600 transition-colors">Community</a>
              <a href="#live-chat" className="hover:text-orange-600 transition-colors">Live Chat</a>
            </div>
          </div>
        </div>

        {/* DESKTOP & TABLET VIEWPORT ONLY (Full 4-Column Layout) */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-12 gap-8 pb-10">
          
          {/* Column 1 (4 cols): Logo and Brand Mission */}
          <div className="lg:col-span-4 flex flex-col items-start text-left space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-orange-500/90 p-0.5 bg-white shrink-0 shadow-xs">
                <img
                  src={TOPSON_PROFILE_IMAGE}
                  alt="Topson Media Logo"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span className="text-base font-black tracking-wider uppercase text-neutral-900">
                TOPSON MEDIA
              </span>
            </div>

            <p className="text-sm text-neutral-600 max-w-sm leading-relaxed font-normal">
              Empowering you with tech, one useful tip at a time. Phone shortcuts, PC performance, and practical digital skills.
            </p>
          </div>

          {/* Column 2 (3 cols): Follow us on (closely spaced icons) */}
          <div className="lg:col-span-3 flex flex-col items-start text-left">
            <h4 className="text-xs font-bold text-neutral-900 mb-3 uppercase tracking-wider">
              Follow us on
            </h4>
            <div className="flex items-center justify-start gap-2.5">
              {socialLinks.map((s) => (
                <a
                  key={s.name}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Column 3 (3 cols): Contact us on */}
          <div className="lg:col-span-3 flex flex-col items-start text-left">
            <h4 className="text-xs font-bold text-neutral-900 mb-3 uppercase tracking-wider">
              Contact us on
            </h4>
            <div className="space-y-2 flex flex-col items-start">
              
              {/* Mail Topson Media */}
              <a
                href="mailto:topsonkenedy@gmail.com"
                className="group cursor-pointer flex items-center gap-2.5 contact-hover-glow"
                title="Send email to Topson Media"
              >
                <div className="w-8 h-8 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-orange-500 shrink-0 group-hover:border-orange-500/50 transition-colors shadow-2xs">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs font-semibold text-neutral-800 group-hover:text-orange-600 transition-colors">
                  <span>mail topson media</span>
                </div>
              </a>

              {/* WhatsApp 0794903078 */}
              <a
                href="https://wa.me/250794903078"
                target="_blank"
                rel="noopener noreferrer"
                className="group cursor-pointer flex items-center gap-2.5 contact-hover-glow"
                title="Message on WhatsApp"
              >
                <div className="w-8 h-8 rounded-xl bg-[#25D366] flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-all shadow-sm shadow-emerald-500/20">
                  <WhatsAppIcon className="w-4 h-4 fill-white" />
                </div>
                <div className="flex flex-col text-left text-xs font-semibold text-neutral-800 group-hover:text-emerald-600 transition-colors">
                  <span className="font-bold">0794903078</span>
                  <span className="text-[10px] text-neutral-500 font-medium">WhatsApp &amp; Call</span>
                </div>
              </a>

            </div>
          </div>

          {/* Column 4 (2 cols): Explore */}
          <div className="lg:col-span-2 flex flex-col items-start text-left">
            <h4 className="text-xs font-bold text-neutral-900 mb-3 uppercase tracking-wider">
              Explore
            </h4>
            <ul className="space-y-2 text-xs text-neutral-600 font-semibold">
              <li>
                <a href="#hero" className="hover:text-orange-600 transition-colors">Home</a>
              </li>
              <li>
                <a href="#videos" className="hover:text-orange-600 transition-colors">Videos</a>
              </li>
              <li>
                <a href="#community" className="hover:text-orange-600 transition-colors">Community</a>
              </li>
              <li>
                <a href="#live-chat" className="hover:text-orange-600 transition-colors">Live Chat</a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Copyright line */}
        <div className="pt-5 sm:pt-8 border-t border-neutral-200 text-center">
          <p className="text-[11px] sm:text-xs text-neutral-500 font-medium tracking-wide">
            © 2024 Topson Media. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  );
};
