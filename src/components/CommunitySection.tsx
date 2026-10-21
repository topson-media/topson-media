import React, { useState } from 'react';
import {
  Star,
  Lock,
  CheckCircle2,
  Quote,
  MessageSquare,
  Send,
  Heart,
  Trash2,
  Eye,
  EyeOff,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Award,
  Sparkles,
  MessageSquarePlus,
  LayoutGrid,
  SlidersHorizontal
} from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import { FeedbackItem, FeedbackReply, User } from '../types';
import { formatFeedbackTimeAgo } from '../utils/timeAgo';
import { useLanguage } from '../context/LanguageContext';
import { TopFanBadge } from './TopFanBadge';

interface CommunitySectionProps {
  feedbacks: FeedbackItem[];
  currentUser: User | null;
  onOpenAuth: () => void;
  onSubmitFeedback: (item: FeedbackItem) => void;
  onToggleLikeFeedback?: (feedbackId: string) => void;
  onAddReplyFeedback?: (feedbackId: string, reply: FeedbackReply) => void;
  onDeleteFeedback?: (feedbackId: string) => void;
  onHideFeedback?: (feedbackId: string, hidden: boolean) => void;
  onTogglePinFeedback?: (feedbackId: string, isPinned: boolean) => void;
  isStandalonePage?: boolean;
}

interface FeedbackCardProps {
  fb: FeedbackItem;
  currentUser: User | null;
  onOpenAuth: () => void;
  onToggleLikeFeedback?: (feedbackId: string) => void;
  onAddReplyFeedback?: (feedbackId: string, reply: FeedbackReply) => void;
  onDeleteFeedback?: (feedbackId: string) => void;
  onHideFeedback?: (feedbackId: string, hidden: boolean) => void;
  onTogglePinFeedback?: (feedbackId: string, isPinned: boolean) => void;
  activeReplyId: string | null;
  setActiveReplyId: (id: string | null) => void;
  replyTextMap: Record<string, string>;
  setReplyTextMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  language: 'en' | 'kn';
  isCarousel?: boolean;
}

const FeedbackCard: React.FC<FeedbackCardProps> = ({
  fb,
  currentUser,
  onOpenAuth,
  onToggleLikeFeedback,
  onAddReplyFeedback,
  onDeleteFeedback,
  onHideFeedback,
  onTogglePinFeedback,
  activeReplyId,
  setActiveReplyId,
  replyTextMap,
  setReplyTextMap,
  language,
  isCarousel = false,
}) => {
  const isLiked =
    (currentUser?.id && Array.isArray(fb.likedBy) && fb.likedBy.includes(currentUser.id)) ||
    !!fb.userLiked;
  const likesCount = Array.isArray(fb.likedBy)
    ? fb.likedBy.length
    : fb.likesCount !== undefined
    ? fb.likesCount
    : fb.likes || 0;
  const replies = fb.replies || [];
  const isReplying = activeReplyId === fb.id;
  const currentReplyText = replyTextMap[fb.id] || '';
  const hasFanBadge =
    fb.hasFanBadge ||
    fb.isTopFan ||
    (currentUser?.username?.toLowerCase() === (fb.authorName || fb.user || '').toLowerCase() &&
      (currentUser?.isTopFan || currentUser?.fanBadge));

  const handleLike = () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (onToggleLikeFeedback) {
      onToggleLikeFeedback(fb.id);
    }
  };

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentReplyText.trim()) return;
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    const newReply: FeedbackReply = {
      id: 'rep-' + Date.now(),
      authorName: currentUser.username,
      authorRole: currentUser.role === 'admin' ? 'Host / Creator' : 'Community Member',
      avatarUrl: currentUser.avatarUrl || '',
      content: currentReplyText.trim(),
      date: 'Just now',
    };
    if (onAddReplyFeedback) {
      onAddReplyFeedback(fb.id, newReply);
    }
    setReplyTextMap((prev) => ({ ...prev, [fb.id]: '' }));
    setActiveReplyId(null);
  };

  return (
    <div
      key={fb.id}
      className={`w-full rounded-3xl p-5 sm:p-7 md:p-8 bg-white border border-neutral-200/90 shadow-[0_4px_24px_rgba(249,115,22,0.15)] hover:border-orange-500/50 transition-all duration-300 flex flex-col justify-between overflow-hidden relative ${
        isCarousel ? 'sm:aspect-[16/9] min-h-[250px] sm:max-h-[380px]' : 'min-h-[280px]'
      }`}
    >
      <div className="overflow-y-auto custom-scrollbar pr-1">
        {/* Top Author Bar */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-orange-500 p-0.5 bg-neutral-100 shrink-0 shadow-xs">
              <img
                src={fb.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80'}
                alt={fb.authorName || fb.user || 'Member'}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-sm sm:text-base font-black text-neutral-900 leading-tight">
                  {fb.authorName || fb.user}
                </h4>
                {hasFanBadge && (
                  <TopFanBadge size="xs" />
                )}
                {fb.isPinned && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold shadow-2xs">
                    <span>📌</span>
                    <span>Pinned</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-500 font-medium">
                {fb.authorRole || 'Community Member'}
              </p>
            </div>
          </div>

          {/* Star rating */}
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-3.5 h-3.5 ${
                  s <= (fb.rating || 5)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-neutral-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="relative pl-3 border-l-2 border-orange-500/40 my-3">
          <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed font-normal whitespace-pre-wrap">
            &ldquo;{fb.content || fb.text}&rdquo;
          </p>
        </div>

        {/* Replies Thread */}
        {replies.length > 0 && (
          <div className="mt-3 pt-3 border-t border-neutral-100 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Replies ({replies.length})
            </span>
            {replies.map((rep) => (
              <div key={rep.id} className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 text-xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-neutral-800 mb-0.5">
                  <span>{rep.authorName}</span>
                  <span className="text-[10px] text-neutral-400 font-normal">{rep.date}</span>
                </div>
                <p className="text-neutral-600 text-[11px] leading-relaxed">{rep.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Reply input box */}
        {isReplying && (
          <form onSubmit={handleReplySubmit} className="mt-3 flex gap-2">
            <input
              type="text"
              value={currentReplyText}
              onChange={(e) =>
                setReplyTextMap((prev) => ({ ...prev, [fb.id]: e.target.value }))
              }
              placeholder="Write a reply..."
              className="flex-1 h-9 px-3 rounded-xl bg-neutral-100 text-xs border border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-900"
            />
            <button
              type="submit"
              className="h-9 px-3 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 cursor-pointer"
            >
              Reply
            </button>
          </form>
        )}
      </div>

      {/* Card Footer */}
      <div className="pt-3 border-t border-neutral-100 flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2">
          {/* Authentic 1-Time Like button */}
          <button
            type="button"
            onClick={handleLike}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              isLiked
                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border border-neutral-200'
            }`}
            title={isLiked ? 'Unlike review' : 'Like review (1 authentic like)'}
          >
            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span>{likesCount}</span>
            <span className="text-[10px] font-normal opacity-80">{isLiked ? 'Liked' : 'Like'}</span>
          </button>

          {/* Reply button */}
          <button
            type="button"
            onClick={() => {
              if (!currentUser) {
                onOpenAuth();
                return;
              }
              setActiveReplyId(isReplying ? null : fb.id);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border border-neutral-200 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-neutral-500" />
            <span>{replies.length}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-neutral-500 font-semibold flex items-center gap-1">
            <span>🕒</span>
            <span>{formatFeedbackTimeAgo(fb.createdAt || fb.date, language)}</span>
          </span>

          {/* Admin moderation */}
          {currentUser?.role === 'admin' && (
            <div className="flex items-center gap-1">
              {onTogglePinFeedback && (
                <button
                  type="button"
                  onClick={() => onTogglePinFeedback(fb.id, !fb.isPinned)}
                  className={`p-1 rounded-md transition-colors cursor-pointer ${
                    fb.isPinned
                      ? 'text-amber-700 bg-amber-100 hover:bg-amber-200'
                      : 'text-neutral-500 hover:text-amber-600 hover:bg-neutral-100'
                  }`}
                  title={fb.isPinned ? 'Unpin feedback' : 'Pin feedback to top'}
                >
                  <span className="text-xs">📌</span>
                </button>
              )}
              {onHideFeedback && (
                <button
                  type="button"
                  onClick={() => onHideFeedback(fb.id, !fb.hidden)}
                  className="p-1 rounded-md text-neutral-500 hover:text-amber-600 hover:bg-neutral-100 cursor-pointer"
                  title={fb.hidden ? 'Unhide' : 'Hide'}
                >
                  {fb.hidden ? <Eye className="w-3.5 h-3.5 text-amber-600" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              )}
              {onDeleteFeedback && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete review from "${fb.authorName || fb.user}"?`)) {
                      onDeleteFeedback(fb.id);
                    }
                  }}
                  className="p-1 rounded-md text-neutral-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const CommunitySection: React.FC<CommunitySectionProps> = ({
  feedbacks,
  currentUser,
  onOpenAuth,
  onSubmitFeedback,
  onToggleLikeFeedback,
  onAddReplyFeedback,
  onDeleteFeedback,
  onHideFeedback,
  onTogglePinFeedback,
  isStandalonePage = false,
}) => {
  const { t, language } = useLanguage();

  // View mode: 'carousel' or 'grid'
  const [viewMode, setViewMode] = useState<'carousel' | 'grid'>(isStandalonePage ? 'grid' : 'carousel');

  // Sorting mode: 'top' (highest likes & rating) vs 'new' (most recent)
  const [sortMode, setSortMode] = useState<'top' | 'new'>('top');

  // State handling logic as required:
  // Toggle (const [showInput, setShowInput] = useState(false))
  const [showInput, setShowInput] = useState<boolean>(false);
  const [text, setText] = useState<string>('');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Track active reply boxes per feedback id
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});

  // Community feedback carousel slider state
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Filter out hidden reviews for regular visitors; Admin sees all
  // Deduplicate by unique Firestore document ID as key component mapper to stop ghost duplicate displays
  // Prioritize pinned feedbacks to always float to the very top position
  const visibleFeedbacks = React.useMemo(() => {
    const list: FeedbackItem[] = feedbacks;
    const seen = new Set<string>();
    const deduplicated: FeedbackItem[] = [];
    for (const fb of list) {
      if (fb.id && !seen.has(fb.id)) {
        seen.add(fb.id);
        deduplicated.push(fb);
      }
    }
    const filtered = currentUser?.role === 'admin' ? deduplicated : deduplicated.filter((fb) => !fb.hidden);

    return [...filtered].sort((a, b) => {
      // Force pinned feedbacks to always float directly to the very top position
      const aPinned = a.isPinned ? 1 : 0;
      const bPinned = b.isPinned ? 1 : 0;
      if (aPinned !== bPinned) {
        return bPinned - aPinned;
      }
      if (sortMode === 'top') {
        const aScore = (a.likesCount ?? a.likes ?? 0) * 2 + (a.rating ?? 5);
        const bScore = (b.likesCount ?? b.likes ?? 0) * 2 + (b.rating ?? 5);
        return bScore - aScore;
      } else {
        const aTime = typeof a.createdAt === 'number' ? a.createdAt : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
        const bTime = typeof b.createdAt === 'number' ? b.createdAt : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
        return bTime - aTime;
      }
    });
  }, [feedbacks, currentUser, sortMode]);

  // Keep currentIndex within bounds
  React.useEffect(() => {
    if (currentIndex >= visibleFeedbacks.length && visibleFeedbacks.length > 0) {
      setCurrentIndex(visibleFeedbacks.length - 1);
    }
  }, [visibleFeedbacks.length, currentIndex]);

  const handlePrev = () => {
    if (visibleFeedbacks.length <= 1) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : visibleFeedbacks.length - 1));
  };

  const handleNext = () => {
    if (visibleFeedbacks.length <= 1) return;
    setCurrentIndex((prev) => (prev < visibleFeedbacks.length - 1 ? prev + 1 : 0));
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (diff > 45) {
      handleNext();
    } else if (diff < -45) {
      handlePrev();
    }
    setTouchStartX(null);
  };

  // Toggle "Andika igitekerezo" action
  const handleToggleInput = () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setShowInput((prev) => !prev);
  };

  // Async Firebase submittal logic as required:
  // Immediately disable submit button to prevent double-tap multi-triggers from sending duplicate records to Firestore
  const handleFeedbackSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return; // Strict double-tap guard

    const feedbackMessage = text.trim();
    if (!feedbackMessage) return;

    if (!currentUser) {
      onOpenAuth();
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const timestampMs = now.getTime();

      const docPayload = {
        text: feedbackMessage,
        user: currentUser.username,
        created_at: now,
        // UI & schema fields for instant seamless display
        content: feedbackMessage,
        authorName: currentUser.username,
        authorHandle: `@${currentUser.username.toLowerCase().replace(/\s+/g, '')}`,
        authorRole: currentUser.role === 'admin' ? 'Topson Media Host & Admin' : 'Community Member',
        avatarUrl: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80',
        rating: rating || 5,
        date: 'Just now',
        createdAt: timestampMs,
        verified: true,
        likes: 0,
        likesCount: 0,
        likedBy: [],
        hidden: false,
        hasFanBadge: !!(currentUser.isTopFan || currentUser.fanBadge),
        isTopFan: !!(currentUser.isTopFan || currentUser.fanBadge),
        replies: [],
      };

      // 1. Submit to Firestore collection "feedbacks"
      const docRef = await addDoc(collection(db, 'feedbacks'), docPayload);

      const newFeedbackItem: FeedbackItem = {
        id: docRef.id,
        ...docPayload,
      };

      // 2. Refresh local feed & push to admin dashboard
      onSubmitFeedback(newFeedbackItem);

      setText('');
      setSubmitSuccess(true);

      // 3. Smoothly close input card after short success acknowledgment
      setTimeout(() => {
        setSubmitSuccess(false);
        setShowInput(false);
      }, 1400);
    } catch (err) {
      console.warn('addDoc feedback fallback:', err);
      // Resilient fallback: ensure user's item drops into live state immediately
      const fallbackItem: FeedbackItem = {
        id: 'fb-' + Date.now(),
        text: feedbackMessage,
        user: currentUser.username,
        created_at: new Date(),
        content: feedbackMessage,
        authorName: currentUser.username,
        authorHandle: `@${currentUser.username.toLowerCase().replace(/\s+/g, '')}`,
        authorRole: 'Community Member',
        avatarUrl: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80',
        rating: rating || 5,
        date: 'Just now',
        createdAt: Date.now(),
        verified: true,
        likes: 0,
        likesCount: 0,
        likedBy: [],
        hidden: false,
        hasFanBadge: !!(currentUser.isTopFan || currentUser.fanBadge),
        isTopFan: !!(currentUser.isTopFan || currentUser.fanBadge),
        replies: [],
      };
      onSubmitFeedback(fallbackItem);
      setText('');
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setShowInput(false);
      }, 1200);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeClick = (feedbackId: string) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (onToggleLikeFeedback) {
      onToggleLikeFeedback(feedbackId);
    }
  };

  const handleReplySubmit = (feedbackId: string, e: React.FormEvent) => {
    e.preventDefault();
    const replyText = replyTextMap[feedbackId];
    if (!replyText?.trim()) return;
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    const newReply: FeedbackReply = {
      id: 'rep-' + Date.now(),
      authorName: currentUser.username,
      authorRole: currentUser.role === 'admin' ? 'Host / Creator' : 'Community Member',
      avatarUrl: currentUser.avatarUrl || '',
      content: replyText.trim(),
      date: 'Just now',
    };

    if (onAddReplyFeedback) {
      onAddReplyFeedback(feedbackId, newReply);
    }
    setReplyTextMap((prev) => ({ ...prev, [feedbackId]: '' }));
    setActiveReplyId(null);
  };

  return (
    <section id="community" className={`py-14 sm:py-20 scroll-mt-20 ${!isStandalonePage ? 'border-t border-neutral-200' : ''} bg-white`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Kicker */}
        <div className="text-xs font-bold tracking-widest uppercase text-neutral-800 mb-6 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
          <span>COMMUNITY HUB {isStandalonePage ? '· ALL REVIEWS' : ''}</span>
        </div>

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-neutral-900 tracking-tight leading-[1.05]">
              {t.communitySection.header}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 mt-1 font-medium max-w-xl">
              {t.communitySection.subtext}
            </p>
          </div>

          {/* Action Area: View Switcher + Count Badge + "Andika igitekerezo" */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            {/* View Mode Switcher: Carousel vs Grid */}
            <div className="flex items-center p-1 rounded-xl bg-neutral-100 border border-neutral-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('carousel')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'carousel'
                    ? 'bg-white text-orange-600 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
                title="Carousel View"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="text-[11px]">Carousel</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-orange-600 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
                title="Grid View (All Reviews)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="text-[11px]">All ({visibleFeedbacks.length})</span>
              </button>
            </div>

            {/* 6. Sorting Filters: "Top" and "New" */}
            <div className="flex items-center p-1 rounded-xl bg-neutral-100 border border-neutral-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setSortMode('top')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  sortMode === 'top'
                    ? 'bg-white text-orange-600 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
                title="Sort by top rated and liked"
              >
                Top
              </button>
              <button
                type="button"
                onClick={() => setSortMode('new')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  sortMode === 'new'
                    ? 'bg-white text-orange-600 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
                title="Sort by newly posted"
              >
                New
              </button>
            </div>

            <button
              type="button"
              onClick={handleToggleInput}
              className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 hover:from-orange-500 hover:to-amber-400 active:scale-95 transition-all shadow-[0_0_20px_rgba(249,115,22,0.45)] hover:shadow-[0_0_30px_rgba(249,115,22,0.7)] border border-orange-400/50 flex items-center gap-2 cursor-pointer shrink-0"
              title="Andika igitekerezo cyawe muri Topson Media"
            >
              {showInput ? (
                <>
                  <X className="w-4 h-4 text-white" />
                  <span>Funga</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 stroke-[3] text-white" />
                  <span>Andika igitekerezo</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DYNAMIC ACTIVE FEEDBACK TEXT AREA CARD (Toggled via showInput state)      */}
        {/* ========================================================================= */}
        {showInput && (
          <div className="mb-10 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-orange-500 shadow-[0_0_40px_rgba(249,115,22,0.3)] animate-in fade-in zoom-in-95 duration-200 max-w-2xl mx-auto w-full relative overflow-hidden text-white">
            {/* Ambient High-End Radial Glow */}
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-orange-500/25 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

            {/* Card Header with User Details */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-orange-500 p-0.5 bg-slate-900 shrink-0 shadow-[0_0_15px_rgba(249,115,22,0.6)]">
                  <img
                    src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80'}
                    alt={currentUser?.username || 'User'}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                    <span>{currentUser?.username || 'Topson Learner'}</span>
                    {(currentUser?.isTopFan || currentUser?.fanBadge) && (
                      <TopFanBadge size="xs" />
                    )}
                  </h3>
                  <p className="text-[11px] text-orange-400 font-bold">
                    Andika igitekerezo cyawe (Post Feedback)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowInput(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close feedback input"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {submitSuccess ? (
              <div className="py-8 text-center space-y-3 animate-in fade-in relative z-10">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(16,185,129,0.4)] animate-bounce">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-black text-white">Igitekerezo cyoherejwe neza!</h4>
                <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-sm mx-auto">
                  Murakoze cyane! Igitekerezo cyawe cyongewe muri showcase no muri dashboard y&apos;ubuyobozi.
                </p>
              </div>
            ) : currentUser ? (
              <form onSubmit={handleFeedbackSubmit} className="space-y-4 relative z-10">
                {/* Rating selection stars */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Amanota (Rating):
                    </label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 text-slate-600 hover:text-amber-400 transition-colors cursor-pointer"
                          aria-label={`Rate ${star} star`}
                        >
                          <Star
                            className={`w-5 h-5 ${
                              star <= (hoverRating || rating)
                                ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]'
                                : 'text-slate-600'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-amber-400 ml-2">
                        {rating} / 5 inyenyeri
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-400 font-medium">
                    Konti: <span className="text-white font-bold">{currentUser.email || currentUser.username}</span>
                  </span>
                </div>

                {/* Clean custom <textarea> */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Ubutumwa / Igitekerezo cyawe:
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Andika igitekerezo cyawe hano... Urugero: 'Inyigisho za Topson Media zaramfashije cyane kumenya ibya mudasobwa na telefone!'"
                    className="w-full p-4 text-xs sm:text-sm rounded-2xl bg-slate-900/90 border border-slate-700 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 text-white placeholder:text-slate-500 resize-none shadow-inner transition-all leading-relaxed"
                  />
                </div>

                {/* Dynamic Submit Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInput(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Reka (Cancel)
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || !text.trim()}
                    className="h-11 sm:h-12 px-6 rounded-xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 active:scale-95 transition-all shadow-[0_0_20px_rgba(249,115,22,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Biracyoherezwa...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-white" />
                        <span>Ohereza igitekerezo</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="py-6 text-center space-y-3 relative z-10">
                <Lock className="w-8 h-8 text-neutral-400 mx-auto" />
                <p className="text-xs text-slate-300 font-medium">
                  Banza winjire cyangwa ufungure konti ngo ushyireho igitekerezo.
                </p>
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="h-11 px-6 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black shadow-md cursor-pointer transition-all"
                >
                  Injira muri Topson Media
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* CAROUSEL / FEEDBACK DISPLAY (OR EMPTY STATE WITH "ANDIKA IGITEKEREZO")     */}
        {/* ========================================================================= */}
        {visibleFeedbacks.length === 0 ? (
          <div className="rounded-3xl p-8 sm:p-12 bg-white border border-neutral-200 shadow-sm text-center flex flex-col items-center justify-center min-h-[280px] space-y-4 max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 shadow-[0_0_20px_rgba(249,115,22,0.15)]">
              <MessageSquare className="w-8 h-8" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-neutral-900">
                {t.communitySection.noReviewsFound}
              </h3>
              <p className="text-xs sm:text-sm text-neutral-500 font-medium max-w-sm mx-auto">
                Ba uwa mbere ushyizeho igitekerezo cyawe cyiza hano cyangwa ubuhamya bwawe!
              </p>
            </div>

            {/* Striking "Andika igitekerezo" button inside the empty state block */}
            <button
              type="button"
              onClick={handleToggleInput}
              className="mt-2 h-11 sm:h-12 px-6 py-3 rounded-2xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 hover:from-orange-500 hover:to-amber-400 active:scale-95 transition-all shadow-[0_0_22px_rgba(249,115,22,0.5)] hover:shadow-[0_0_32px_rgba(249,115,22,0.75)] border border-orange-400/50 flex items-center gap-2.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Andika igitekerezo</span>
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* ========================================================================= */
          /* GRID VIEW: ALL REVIEWS MAPPED BY UNIQUE FIRESTORE DOC ID (key={f.id})      */
          /* ========================================================================= */
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleFeedbacks.map((f) => (
                <FeedbackCard
                  key={f.id}
                  fb={f}
                  currentUser={currentUser}
                  onOpenAuth={onOpenAuth}
                  onToggleLikeFeedback={onToggleLikeFeedback}
                  onAddReplyFeedback={onAddReplyFeedback}
                  onDeleteFeedback={onDeleteFeedback}
                  onHideFeedback={onHideFeedback}
                  onTogglePinFeedback={onTogglePinFeedback}
                  activeReplyId={activeReplyId}
                  setActiveReplyId={setActiveReplyId}
                  replyTextMap={replyTextMap}
                  setReplyTextMap={setReplyTextMap}
                  language={language}
                />
              ))}
            </div>

            {/* "Andika igitekerezo" Action Button under Grid */}
            <div className="flex flex-col items-center justify-center pt-2">
              <button
                type="button"
                onClick={handleToggleInput}
                className="h-11 sm:h-12 px-6 py-3 rounded-2xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 hover:from-orange-500 hover:to-amber-400 active:scale-95 transition-all shadow-[0_0_20px_rgba(249,115,22,0.45)] hover:shadow-[0_0_30px_rgba(249,115,22,0.7)] border border-orange-400/50 flex items-center gap-2.5 cursor-pointer shrink-0"
              >
                {showInput ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4 stroke-[3]" />}
                <span>{showInput ? 'Funga igitekerezo' : 'Andika igitekerezo'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* CAROUSEL VIEW: SLIDING REVIEWS MAPPED BY UNIQUE FIRESTORE DOC ID           */
          /* ========================================================================= */
          <div className="w-full max-w-3xl mx-auto">
            {/* Carousel Container with Neon-Orange Arrows on the Sides */}
            <div className="flex items-center gap-2 sm:gap-4 md:gap-5 justify-between">
              {/* Left Arrow Button (Neon-Orange Glow) */}
              <button
                type="button"
                onClick={handlePrev}
                disabled={visibleFeedbacks.length <= 1}
                aria-label="Previous student review"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-neutral-900 border-2 border-orange-500 text-orange-400 hover:text-white hover:bg-orange-600 hover:border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.45)] hover:shadow-[0_0_22px_rgba(249,115,22,0.7)] flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Previous student review (←)"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Single Integrated Sliding Card Component */}
              <div
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                className="flex-1 min-w-0"
              >
                {(() => {
                  const fb = visibleFeedbacks[currentIndex] || visibleFeedbacks[0];
                  if (!fb) return null;
                  return (
                    <FeedbackCard
                      key={fb.id}
                      fb={fb}
                      isCarousel={true}
                      currentUser={currentUser}
                      onOpenAuth={onOpenAuth}
                      onToggleLikeFeedback={onToggleLikeFeedback}
                      onAddReplyFeedback={onAddReplyFeedback}
                      onDeleteFeedback={onDeleteFeedback}
                      onHideFeedback={onHideFeedback}
                      onTogglePinFeedback={onTogglePinFeedback}
                      activeReplyId={activeReplyId}
                      setActiveReplyId={setActiveReplyId}
                      replyTextMap={replyTextMap}
                      setReplyTextMap={setReplyTextMap}
                      language={language}
                    />
                  );
                })()}
              </div>

              {/* Right Arrow Button (Neon-Orange Glow) */}
              <button
                type="button"
                onClick={handleNext}
                disabled={visibleFeedbacks.length <= 1}
                aria-label="Next student review"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-neutral-900 border-2 border-orange-500 text-orange-400 hover:text-white hover:bg-orange-600 hover:border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.45)] hover:shadow-[0_0_22px_rgba(249,115,22,0.7)] flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Next student review (→)"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Carousel Pagination Dots & Counter */}
            <div className="mt-6 flex flex-col items-center gap-2">
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {visibleFeedbacks.map((fb, idx) => (
                  <button
                    key={fb.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`Go to student review ${idx + 1}`}
                    className={`transition-all duration-300 rounded-full cursor-pointer ${
                      idx === currentIndex
                        ? 'w-7 h-2 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.6)]'
                        : 'w-2 h-2 bg-neutral-300 hover:bg-neutral-400'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[11px] font-bold text-neutral-500 tracking-wider">
                Student Review {currentIndex + 1} of {visibleFeedbacks.length}
              </span>
            </div>

            {/* SECONDARY "Andika igitekerezo" ACTION BUTTON UNDER CAROUSEL */}
            <div className="mt-7 flex flex-col items-center justify-center">
              <button
                type="button"
                onClick={handleToggleInput}
                className="h-12 px-6 py-3 rounded-2xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 hover:from-orange-500 hover:to-amber-400 active:scale-95 transition-all shadow-[0_0_20px_rgba(249,115,22,0.45)] hover:shadow-[0_0_30px_rgba(249,115,22,0.7)] border border-orange-400/50 flex items-center gap-2.5 cursor-pointer shrink-0"
              >
                {showInput ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4 stroke-[3]" />}
                <span>{showInput ? 'Funga igitekerezo' : 'Andika igitekerezo'}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
