import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Menu, Sun, Moon, LogOut, ShieldCheck, Home, Film, Users, MessageSquare, Mail, ChevronRight, Globe } from 'lucide-react';
import { User } from '../types';
import { TOPSON_PROFILE_IMAGE } from '../data/mockData';
import { useLanguage } from '../context/LanguageContext';

export type NavSection = 'home' | 'tutorials' | 'community' | 'chat' | 'contact' | 'admin';

interface NavbarProps {
  currentUser: User | null;
  onOpenAuth: (mode?: 'signin' | 'signup' | 'admin') => void;
  onLogout: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  matchingCount: number;
  activeNav: NavSection;
  onNavClick: (section: NavSection) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenAuth,
  onLogout,
  searchQuery,
  onSearchChange,
  isDarkMode = false,
  onToggleDarkMode,
  matchingCount,
  activeNav,
  onNavClick,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close mobile/tablet menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock background scroll when mobile transparent overlay is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [mobileMenuOpen]);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems: { label: string; id: NavSection; icon: React.ReactNode }[] = [
    {
      label: t.nav.home,
      id: 'home',
      icon: <Home className="w-4 h-4 text-cyan-600 transition-colors" />,
    },
    {
      label: t.nav.videos,
      id: 'tutorials',
      icon: <Film className="w-4 h-4 text-orange-500 transition-colors" />,
    },
    {
      label: t.nav.community,
      id: 'community',
      icon: <Users className="w-4 h-4 text-purple-600 transition-colors" />,
    },
    {
      label: t.nav.chat,
      id: 'chat',
      icon: <MessageSquare className="w-4 h-4 text-blue-500 transition-colors" />,
    },
    {
      label: t.nav.contact,
      id: 'contact',
      icon: <Mail className="w-4 h-4 text-amber-500 transition-colors" />,
    },
  ];

  const handleNavSelect = (id: NavSection) => {
    onNavClick(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm border-b border-neutral-200/80 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex flex-row items-center justify-between gap-2 sm:gap-3 w-full">
        
        {/* Left: Brand Logo & Wordmark */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavClick('home')}
            className="flex items-center gap-2 sm:gap-2.5 focus-visible:outline-none rounded-lg group text-left cursor-pointer"
            aria-label="Topson Media Home"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border border-neutral-300 bg-white shrink-0 shadow-2xs">
              <img
                src={TOPSON_PROFILE_IMAGE}
                alt="Topson Media Logo"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <span className="text-xs sm:text-base font-black tracking-wider uppercase text-neutral-900 whitespace-nowrap">
              TOPSON MEDIA
            </span>
          </button>
        </div>

        {/* Center: Desktop Navigation Links (Accessible via menu on Mobile & Tablet to prevent crowding) */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-xs xl:text-sm whitespace-nowrap shrink-0">
          {navItems.map((item) => {
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavSelect(item.id)}
                className={`px-2.5 xl:px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-bold flex items-center gap-1 xl:gap-1.5 ${
                  isActive
                    ? 'bg-neutral-900 text-white shadow-2xs'
                    : 'text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* ADMIN NAV (Only visible when logged in as admin) */}
          {currentUser?.role === 'admin' && (
            <button
              type="button"
              onClick={() => handleNavSelect('admin')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                activeNav === 'admin'
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-neutral-100 text-neutral-900 border-neutral-200 hover:border-neutral-400'
              }`}
              title="Admin Creator Studio"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
              <span>{t.nav.adminStudio}</span>
            </button>
          )}
        </nav>

        {/* Right: Language Switcher [EN | KN] + Search Bar + Auth / Hamburger */}
        <div className="flex flex-row items-center gap-1.5 sm:gap-2 md:gap-2.5 lg:gap-3 shrink-0">
          
          {/* 2. SLEEK MODERN LANGUAGE SWITCHER TOGGLE: [EN | KN] Placed near ADMIN / Auth Area */}
          <div
            className="inline-flex items-center p-0.5 rounded-xl bg-neutral-100 border border-neutral-200 shadow-2xs"
            role="group"
            aria-label="Language selection toggle"
          >
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-black transition-all cursor-pointer ${
                language === 'en'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
              }`}
              title="Switch to English (EN)"
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('kn')}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-black transition-all cursor-pointer ${
                language === 'kn'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
              }`}
              title="Hindura mu Kinyarwanda (KN)"
            >
              KN
            </button>
          </div>

          {/* Functional Dynamic Search: placeholder="search" / "shakisha" */}
          <div className="relative">
            <label htmlFor="nav-search-input" className="sr-only">
              {t.nav.searchPlaceholder}
            </label>
            <div className="relative flex items-center">
              <input
                id="nav-search-input"
                ref={searchInputRef}
                type="text"
                value={searchQuery ?? ''}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  if (activeNav !== 'tutorials') {
                    onNavClick('tutorials');
                  }
                }}
                placeholder={t.nav.searchPlaceholder}
                className={`py-1.5 sm:py-2 text-xs sm:text-sm rounded-full transition-all duration-300 ease-out focus:outline-none ${
                  isSearchFocused || searchQuery
                    ? 'w-28 xs:w-40 sm:w-52 md:w-44 lg:w-64 pl-8 sm:pl-9 pr-7 sm:pr-8 bg-white border border-neutral-900 text-neutral-900'
                    : 'w-16 xs:w-24 sm:w-28 md:w-28 lg:w-32 pl-7 sm:pl-8 pr-2.5 sm:pr-3 bg-neutral-100 border border-neutral-200 text-neutral-900 placeholder:text-neutral-500 hover:border-neutral-400 cursor-pointer font-medium'
                }`}
              />
              <Search className="absolute left-2.5 w-3.5 h-3.5 text-neutral-500 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 p-0.5 rounded-full text-neutral-400 hover:text-neutral-900 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              )}
            </div>

            {/* Quick search match counter popup */}
            {searchQuery && (
              <div className="absolute top-full mt-1.5 right-0 w-48 sm:w-52 py-2 px-3 bg-white rounded-xl shadow-lg border border-neutral-200 text-xs text-neutral-800 flex items-center justify-between z-50">
                <span className="font-medium">{t.nav.matchingTutorials}</span>
                <span className="font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded">
                  {matchingCount} {t.nav.found}
                </span>
              </div>
            )}
          </div>

          {/* Desktop User Auth / Admin Account (Hidden on Mobile & Tablet) */}
          <div className="hidden lg:flex items-center">
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-neutral-200">
                <div
                  className="w-8 h-8 rounded-full overflow-hidden border border-neutral-300 bg-white shrink-0 flex items-center justify-center shadow-2xs"
                  title={currentUser.role === 'admin' ? 'Admin: Topson Media' : currentUser.username}
                >
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.username}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-neutral-900 text-white font-bold text-xs flex items-center justify-center">
                      {currentUser.username.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="hidden xl:flex flex-col text-left max-w-[120px]">
                  <span className="text-xs font-bold text-neutral-900 truncate flex items-center gap-1">
                    <span>{currentUser.username}</span>
                    {currentUser.fanBadge && <span title={t.nav.topFan}>⭐</span>}
                  </span>
                  {currentUser.role === 'admin' ? (
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-orange-600 -mt-0.5">
                      {t.nav.admin}
                    </span>
                  ) : currentUser.fanBadge ? (
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-amber-600 -mt-0.5">
                      {t.nav.topFan}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  title={t.nav.signOut}
                  className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                  aria-label={t.nav.signOut}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onOpenAuth('signin')}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  {t.nav.signIn}
                </button>
              </div>
            )}
          </div>

          {/* Modern Sleek Hamburger Menu Icon on Mobile & Tablet */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 sm:p-2 rounded-xl text-neutral-800 hover:text-neutral-950 hover:bg-neutral-100 transition-colors cursor-pointer active:scale-95 shrink-0"
            aria-label="Toggle navigation drawer"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-neutral-900" />
            ) : (
              <Menu className="w-5 h-5 text-neutral-900" />
            )}
          </button>

        </div>

      </div>

      {/* Instant Transparent Glassmorphism Slide-out Overlay on Right Side of Mobile & Tablet Viewport */}
      {mobileMenuOpen && typeof document !== 'undefined' && createPortal(
        <>
          {/* Subtle click-away backdrop */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-xs z-50 lg:hidden animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Dynamic Full-Height Overlay Positioned Strictly on the RIGHT side of mobile & tablet viewport */}
          <div
            className={`fixed top-0 right-0 w-[80%] sm:w-[65%] md:w-[380px] max-w-[400px] h-screen z-50 lg:hidden flex flex-col justify-between ${
              isDarkMode
                ? 'bg-black/90 text-white'
                : 'bg-white/95 text-neutral-900'
            } backdrop-blur-lg shadow-2xl border-l border-neutral-200/80 animate-in slide-in-from-right duration-200 overflow-y-auto`}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Menu"
          >
            {/* Top Bar with Brand & Top-Right "X" (Close) Icon */}
            <div className="w-full flex items-center justify-between px-5 pt-5 pb-3 border-b border-neutral-200/50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full overflow-hidden border border-neutral-300 bg-white shrink-0 shadow-xs">
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

              {/* "X" (Close) Icon in top right corner */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-full hover:bg-neutral-500/15 transition-colors cursor-pointer active:scale-95"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Language Switcher Inside Drawer */}
            <div className="px-5 pt-4">
              <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-700">
                  <Globe className="w-4 h-4 text-orange-500" />
                  <span>Language / Ururimi</span>
                </div>
                <div className="inline-flex items-center p-0.5 rounded-xl bg-white border border-neutral-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      language === 'en'
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('kn')}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      language === 'kn'
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    KN
                  </button>
                </div>
              </div>
            </div>

            {/* Vertically Stacked Navigation Routes List with Clean, Bold Typography */}
            <div className="flex-1 px-5 py-4 flex flex-col justify-start">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-3">
                MENU
              </span>
              <nav className="flex flex-col space-y-2 w-full">
                {navItems.map((item) => {
                  const isActive = activeNav === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavSelect(item.id)}
                      className={`w-full text-left py-2.5 px-3 rounded-xl text-sm font-black tracking-tight transition-all duration-150 flex items-center gap-3 cursor-pointer ${
                        isActive
                          ? 'bg-orange-500/10 text-orange-600 drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]'
                          : 'text-neutral-900 hover:text-orange-500 hover:bg-neutral-100/60'
                      }`}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}

                {/* Admin Studio inside overlay if user is admin */}
                {currentUser?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => handleNavSelect('admin')}
                    className={`w-full text-left py-2.5 px-3 rounded-xl text-sm font-black tracking-tight transition-all duration-150 flex items-center gap-3 cursor-pointer ${
                      activeNav === 'admin'
                        ? 'bg-orange-500/10 text-orange-600'
                        : 'text-neutral-900 hover:text-orange-500 hover:bg-neutral-100/60'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-orange-500 shrink-0" />
                    <span>{t.nav.adminStudio}</span>
                  </button>
                )}
              </nav>
            </div>

            {/* Sign in / Sign out button at the bottom of drawer */}
            <div className="p-5 border-t border-neutral-200/50 flex flex-col gap-3">
              {currentUser && (
                <div className="text-xs font-semibold text-neutral-600 truncate flex items-center gap-1.5 flex-wrap">
                  <span>Signed in as</span>
                  <span className="font-bold text-neutral-900">{currentUser.username}</span>
                  {currentUser.fanBadge && (
                    <span className="px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[8px] font-black uppercase shadow-xs tracking-wide">
                      ⭐ Top Fan
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2">
                {!currentUser ? (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenAuth('signin');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full px-4 py-2.5 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 text-sm font-bold shadow-sm cursor-pointer transition-all active:scale-95 text-center"
                  >
                    {t.nav.signIn}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full border border-red-500/50 text-red-500 hover:bg-red-500/10 hover:border-red-500 rounded-lg px-4 py-2.5 font-bold text-sm tracking-wide transition-all inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t.nav.signOut}</span>
                  </button>
                )}
              </div>

              {/* Subtle Bottom Brand Watermark */}
              <div className="text-[10px] text-center font-bold text-neutral-400 tracking-wider uppercase pt-1">
                Topson Media &bull; Tech Hub
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </header>
  );
};

