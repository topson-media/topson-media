import React, { useEffect } from 'react';
import { X, Radio, Heart, Users, Sparkles, ExternalLink } from 'lucide-react';
import { User, LiveSession } from '../types';
import { LiveStudioCore } from './LiveStudioCore';

interface LiveScreeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  session: LiveSession | null;
  onOpenAuth: () => void;
}

export const LiveScreeningModal: React.FC<LiveScreeningModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  session,
  onOpenAuth,
}) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Live Screening Room"
    >
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shadow-xs">
              <Radio className={`w-4 h-4 ${session?.isLive ? 'animate-pulse text-rose-600' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                  Topson Media Live Screening Room
                </h3>
                {session?.isLive && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Official real-time interactive broadcast screening
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Close Live Screening Room"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-50/30">
          <LiveStudioCore
            currentUser={currentUser}
            mode="viewer"
            onOpenAuth={onOpenAuth}
          />
        </div>
      </div>
    </div>
  );
};
