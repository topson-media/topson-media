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
  Award
} from 'lucide-react';
import { FeedbackItem, FeedbackReply, User } from '../types';
import { formatFeedbackTimeAgo } from '../utils/timeAgo';
import { useLanguage } from '../context/LanguageContext';
import { DEFAULT_COMMUNITY_FEEDBACKS } from '../services/firebase';

interface CommunitySectionProps {
  feedbacks: FeedbackItem[];
  currentUser: User | null;
  onOpenAuth: () => void;
  onSubmitFeedback: (item: FeedbackItem) => void;
  onToggleLikeFeedback?: (feedbackId: string) => void;
  onAddReplyFeedback?: (feedbackId: string, reply: FeedbackReply) => void;
  onDeleteFeedback?: (feedbackId: string) => void;
  onHideFeedback?: (feedbackId: string, hidden: boolean) => void;
  isStandalonePage?: boolean;
}

export const CommunitySection: React.FC<CommunitySectionProps> = ({
  feedbacks,
  currentUser,
  onOpenAuth,
  onSubmitFeedback,
  onToggleLikeFeedback,
  onAddReplyFeedback,
  onDeleteFeedback,
  onHideFeedback,
  isStandalonePage = false,
}) => {
  const { t, language } = useLanguage();
  const [name, setName] = useState<string>(currentUser?.username ?? '');
  const [role, setRole] = useState<string>('');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [message, setMessage] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);

  // Track active reply boxes per feedback id
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});

  // 2. COMMUNITY FEEDBACK CAROUSEL SLIDER STATE
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Filter out hidden reviews for regular visitors; Admin sees all
  const visibleFeedbacks = React.useMemo(() => {
    // 100% clean data pulled dynamically from real Firebase Firestore database collections only
    const list: FeedbackItem[] = feedbacks;
    if (currentUser?.role === 'admin') return list;
    return list.filter((fb) => !fb.hidden);
  }, [feedbacks, currentUser]);

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

  // Sync author name if currentUser changes
  React.useEffect(() => {
    if (currentUser?.username) {
      setName(currentUser.username);
    }
  }, [currentUser?.username]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const author = name.trim() || currentUser?.username || 'Community Member';
    const hasFanBadge = !!currentUser?.fanBadge;
    const newFeedback: FeedbackItem = {
      id: 'fb-' + Date.now(),
      authorName: author,
      authorHandle: `@${author.toLowerCase().replace(/\s+/g, '')}`,
      authorRole: role.trim() || 'Tech Enthusiast',
      avatarUrl: currentUser?.avatarUrl || '',
      rating,
      date: 'Just now',
      createdAt: Date.now(),
      content: message.trim(),
      verified: true,
      likes: 0,
      userLiked: false,
      hidden: false,
      hasFanBadge,
      replies: [],
    };

    onSubmitFeedback(newFeedback);
    setMessage('');
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setIsFormOpen(false);
    }, 2000);
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
    <section id="community" className={`py-16 sm:py-20 scroll-mt-20 ${!isStandalonePage ? 'border-t border-neutral-200' : ''} bg-white`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Kicker */}
        <div className="text-xs font-bold tracking-widest uppercase text-neutral-800 mb-6">
          COMMUNITY HUB {isStandalonePage ? '· ALL REVIEWS' : ''}
        </div>

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-neutral-900 tracking-tight leading-[1.05]">
              {t.communitySection.header}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 mt-1 font-medium">
              {t.communitySection.subtext}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="px-3 py-1.5 rounded-full bg-neutral-100 border border-neutral-200 text-[11px] font-bold text-neutral-800 flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span>{visibleFeedbacks.length} {t.communitySection.verifiedReviews}</span>
            </div>
          </div>
        </div>

        {/* 2. SINGLE INTEGRATED SLIDING CAROUSEL CARD (Compact Carousel/Swiper with Neon-Orange Arrows) */}
        {visibleFeedbacks.length === 0 ? (
          <div className="rounded-3xl p-10 bg-white border border-neutral-200 shadow-sm text-center flex flex-col items-center justify-center min-h-[260px] space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400">
              <MessageSquare className="w-7 h-7" />
            </div>
            <p className="text-xs sm:text-sm text-neutral-600 max-w-sm mx-auto font-medium">
              {t.communitySection.noReviewsFound}
            </p>
          </div>
        ) : (
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

              {/* Single Integrated Sliding Card Component with 16:9 Aspect Ratio */}
              <div
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                className="flex-1 min-w-0"
              >
                {(() => {
                  const fb = visibleFeedbacks[currentIndex] || visibleFeedbacks[0];
                  if (!fb) return null;
                  const isLiked =
                    (currentUser?.id && Array.isArray(fb.likedBy) && (fb.likedBy as string[]).includes(currentUser.id)) ||
                    !!fb.userLiked;
                  const likesCount = fb.likes || 0;
                  const replies = fb.replies || [];
                  const isReplying = activeReplyId === fb.id;
                  const currentReplyText = replyTextMap[fb.id] || '';
                  const hasFanBadge =
                    fb.hasFanBadge ||
                    (currentUser?.username?.toLowerCase() === fb.authorName.toLowerCase() &&
                      currentUser?.fanBadge);

                  return (
                    <div
                      key={fb.id}
                      className="w-full sm:aspect-[16/9] min-h-[250px] sm:max-h-[380px] rounded-3xl p-5 sm:p-7 md:p-8 bg-white border border-neutral-200/90 shadow-[0_4px_24px_rgba(249,115,22,0.15)] hover:border-orange-500/50 transition-all duration-300 flex flex-col justify-between overflow-hidden relative"
                    >
                      <div className="overflow-y-auto custom-scrollbar pr-1">
                        {/* Header: Author Identity & Rating */}
                        <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left justify-between gap-3 pb-3 border-b border-neutral-100">
                          <div className="flex flex-col items-center sm:flex-row sm:items-center gap-3 min-w-0">
                            {fb.avatarUrl ? (
                              <img
                                src={fb.avatarUrl}
                                alt={fb.authorName}
                                referrerPolicy="no-referrer"
                                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-orange-500/50 shrink-0 shadow-sm"
                              />
                            ) : (
                              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-neutral-900 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-sm ring-2 ring-orange-500/40">
                                {fb.authorName.slice(0, 1).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                                <span className="text-sm sm:text-base font-bold text-neutral-900 truncate">
                                  {fb.authorName}
                                </span>
                                {fb.verified && (
                                  <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0" />
                                )}
                                {hasFanBadge && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-white text-[9px] sm:text-[10px] font-black uppercase shadow-xs shrink-0 tracking-wide">
                                    <span>⭐</span> Top Fan
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] sm:text-xs text-neutral-500 font-medium truncate">
                                {fb.authorRole || 'Community Member'}
                              </div>
                            </div>
                          </div>

                          {/* 5-Star Rating */}
                          <div className="flex items-center gap-0.5 text-amber-400 shrink-0">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= (fb.rating || 5)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-neutral-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Content Quote */}
                        <div className="pt-3 pb-2 relative text-center sm:text-left">
                          <Quote className="w-6 h-6 text-neutral-200/70 absolute -top-1 left-0 sm:-left-1 -z-0 pointer-events-none" />
                          <p className="text-xs sm:text-sm text-neutral-800 leading-relaxed font-normal relative z-10 break-words px-1 sm:px-0">
                            &ldquo;{fb.content}&rdquo;
                          </p>
                        </div>

                        {/* Replies Thread (if any) */}
                        {replies.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-neutral-100 space-y-1.5 max-h-24 overflow-y-auto">
                            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                              Replies ({replies.length})
                            </div>
                            {replies.map((rep) => (
                              <div
                                key={rep.id}
                                className="p-2 rounded-xl bg-neutral-50 border border-neutral-200/60 text-[11px] space-y-0.5"
                              >
                                <div className="flex items-center justify-between font-bold text-neutral-800">
                                  <span>{rep.authorName}</span>
                                  <span className="text-[9px] text-neutral-400 font-normal">{rep.date}</span>
                                </div>
                                <p className="text-neutral-600 leading-snug">{rep.content}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Inline Reply Input Form */}
                        {isReplying && (
                          <form
                            onSubmit={(e) => handleReplySubmit(fb.id, e)}
                            className="mt-3 pt-2 border-t border-neutral-100 animate-in fade-in"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                required
                                value={currentReplyText}
                                onChange={(e) =>
                                  setReplyTextMap((prev) => ({ ...prev, [fb.id]: e.target.value }))
                                }
                                placeholder="Write a reply..."
                                className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900"
                              />
                              <button
                                type="submit"
                                disabled={!currentReplyText.trim()}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 rounded-xl transition-all cursor-pointer shrink-0"
                              >
                                <Send className="w-3 h-3" />
                              </button>
                            </div>
                          </form>
                        )}
                      </div>

                      {/* Card Footer Actions: single-click toggle like, count, and time uploaded */}
                      <div className="pt-3 mt-2 border-t border-neutral-100 flex items-center justify-between text-xs shrink-0">
                        <div className="flex items-center gap-2">
                          {/* 3. STRICT SINGLE-CLICK TOGGLE LIKE SYSTEM */}
                          <button
                            type="button"
                            onClick={() => handleLikeClick(fb.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              isLiked
                                ? 'bg-rose-50 text-rose-600 border border-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.25)] ring-1 ring-rose-400/30'
                                : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border border-neutral-200'
                            }`}
                            title={isLiked ? 'Unlike review' : 'Like review'}
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
                          {/* Track time when feedback was uploaded */}
                          <span className="text-[11px] text-neutral-500 font-semibold flex items-center gap-1">
                            <span>🕒</span>
                            <span>{formatFeedbackTimeAgo(fb.createdAt || fb.date, language)}</span>
                          </span>

                          {/* Admin moderation */}
                          {currentUser?.role === 'admin' && (
                            <div className="flex items-center gap-1">
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
                                    if (window.confirm(`Delete review from "${fb.authorName}"?`)) {
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

            {/* BUTTON 'Leave your review' UNDER FEEDBACK CARD */}
            <div className="mt-7 flex flex-col items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    onOpenAuth();
                  } else {
                    setIsFormOpen(!isFormOpen);
                  }
                }}
                className="h-12 px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm text-white bg-neutral-900 hover:bg-neutral-800 active:scale-95 transition-all shadow-md hover:shadow-orange-500/20 flex items-center gap-2.5 cursor-pointer shrink-0"
              >
                {isFormOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4 text-orange-500" />}
                <span>{isFormOpen ? t.communitySection.closeForm : t.communitySection.leaveReview}</span>
              </button>
            </div>

            {/* Expandable Review Form Box displayed right under the button */}
            {isFormOpen && (
              <div className="mt-6 p-6 sm:p-8 rounded-3xl bg-neutral-50 border border-neutral-200/80 shadow-md animate-in fade-in max-w-2xl mx-auto w-full">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-200">
                  <h3 className="text-lg font-bold text-neutral-900">
                    Share your experience
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {submitted ? (
                  <div className="py-6 text-center space-y-2 animate-in fade-in">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-bold text-neutral-900">Review published!</h4>
                    <p className="text-xs text-neutral-600 font-medium">
                      Your feedback is now visible in the community showcase above.
                    </p>
                  </div>
                ) : currentUser ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Rating stars */}
                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                        Your Rating
                      </label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1 text-neutral-300 hover:text-amber-400 transition-colors cursor-pointer"
                          >
                            <Star
                              className={`w-6 h-6 ${
                                star <= (hoverRating || rating)
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-neutral-300'
                              }`}
                            />
                          </button>
                        ))}
                        <span className="text-xs font-bold text-neutral-700 ml-2">
                          {rating} / 5 stars
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1">
                          Display Name
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your name"
                          className="w-full h-11 px-3.5 text-xs rounded-xl bg-white border border-neutral-300 text-neutral-900 focus:outline-none focus:border-neutral-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1">
                          Your Role or Device
                        </label>
                        <input
                          type="text"
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          placeholder="e.g. Android User, Learner"
                          className="w-full h-11 px-3.5 text-xs rounded-xl bg-white border border-neutral-300 text-neutral-900 focus:outline-none focus:border-neutral-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1">
                        Your Feedback
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Describe how a phone or PC tutorial helped you..."
                        className="w-full p-3 text-xs rounded-xl bg-white border border-neutral-300 text-neutral-900 focus:outline-none focus:border-neutral-900 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full h-12 py-3 px-4 font-bold text-xs sm:text-sm text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-all shadow-sm active:scale-98 cursor-pointer"
                    >
                      Post Review
                    </button>
                  </form>
                ) : (
                  <div className="py-6 text-center space-y-3">
                    <Lock className="w-8 h-8 text-neutral-400 mx-auto" />
                    <p className="text-xs text-neutral-600">Please sign in to submit feedback.</p>
                    <button
                      type="button"
                      onClick={onOpenAuth}
                      className="h-11 px-5 rounded-xl bg-neutral-900 text-white text-xs font-bold cursor-pointer"
                    >
                      Sign In
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  );
};
