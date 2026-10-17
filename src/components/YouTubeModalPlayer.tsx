import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  ExternalLink,
  ThumbsUp,
  Share2,
  Check,
  Eye,
  Calendar,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Maximize2
} from 'lucide-react';
import { VideoItem, User } from '../types';
import { TOPSON_PROFILE_IMAGE } from '../data/mockData';

interface YouTubeModalPlayerProps {
  video: VideoItem | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  onLikeVideo?: (videoId: string) => void;
  onCommentSubmit?: (videoId: string, commentText: string) => void;
}

/**
 * 3. BULLETPROOF LINK EXTRACTOR UTILITY
 * Deploys an ultra-robust Regular Expression & fallback string parser.
 * Handles:
 * - https://www.youtube.com/watch?v=VIDEO_ID (with any query params like &t=, &ab_channel=)
 * - https://youtu.be/VIDEO_ID (short mobile share link, with query params like ?si=)
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * - Raw clean 11-character Video ID string
 */
export function extractCleanYouTubeId(urlOrId?: string | null): string | null {
  if (!urlOrId) return null;
  const input = String(urlOrId).trim();

  // 1. Raw 11-char ID check
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  // 2. Comprehensive official regex for all YouTube domain variants
  const primaryRegex =
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|shorts\/|live\/|watch\?(?:.*&)?v=))([a-zA-Z0-9_-]{11})/;
  const primaryMatch = input.match(primaryRegex);
  if (primaryMatch && primaryMatch[1]) {
    return primaryMatch[1];
  }

  // 3. Fallback for query parameter variants [?&]v=11_CHAR_ID
  const vMatch = input.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (vMatch && vMatch[1]) {
    return vMatch[1];
  }

  // 4. Fallback string split for youtu.be/
  if (input.includes('youtu.be/')) {
    const after = input.split('youtu.be/')[1];
    if (after) {
      const cleanId = after.split(/[?#&]/)[0];
      if (/^[a-zA-Z0-9_-]{11}$/.test(cleanId)) {
        return cleanId;
      }
    }
  }

  return null;
}

/**
 * 1. OFFICIAL EMBEDDED URL FORMAT GENERATOR
 * Generates official embedded gateway with high-security parameter extensions:
 * `https://youtube.com/embed/{videoId}?autoplay=1&enablejsapi=1&rel=0&origin=https://vercel.app`
 * Dynamically binds production origin to guarantee authentic, organic analytics synchronization.
 */
export function generateOfficialEmbedUrl(videoId: string, customOrigin?: string): string {
  const cleanId = extractCleanYouTubeId(videoId);
  if (!cleanId) return '';

  const siteOrigin =
    customOrigin ||
    (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null'
      ? window.location.origin
      : 'https://vercel.app');

  const encodedOrigin = encodeURIComponent(siteOrigin);
  return `https://www.youtube.com/embed/${cleanId}?autoplay=1&enablejsapi=1&rel=0&origin=${encodedOrigin}&widget_referrer=${encodedOrigin}`;
}

export const YouTubeModalPlayer: React.FC<YouTubeModalPlayerProps> = ({
  video,
  isOpen,
  onClose,
  currentUser,
  onLikeVideo,
  onCommentSubmit,
}) => {
  const [copiedShare, setCopiedShare] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Extract clean 11-char YouTube ID
  const videoId = useMemo(() => {
    if (!video) return null;
    return (
      extractCleanYouTubeId(video.youtubeId) ||
      extractCleanYouTubeId(video.videoUrl) ||
      null
    );
  }, [video]);

  // Build the official native iframe source URL
  const embedSourceUrl = useMemo(() => {
    if (!videoId) return '';
    return generateOfficialEmbedUrl(videoId);
  }, [videoId]);

  if (!isOpen || !video) return null;

  const isLiked =
    currentUser?.id && Array.isArray(video.likedBy)
      ? video.likedBy.includes(currentUser.id)
      : false;

  const handleShareClick = () => {
    const shareUrl = videoId
      ? `https://www.youtube.com/watch?v=${videoId}`
      : video.videoUrl || window.location.href;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 3000);
    }
  };

  /**
   * 3. YOUTUBE ACTION LINK INTERFACE:
   * Launches clean web target redirect directly to https://www.youtube.com/watch?v=${videoId}
   * so viewers can legally hit like and drop a comment directly on the channel network.
   */
  const handleYouTubeAction = (action: 'like' | 'comment') => {
    if (videoId) {
      const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
      window.open(watchUrl, '_blank', 'noopener,noreferrer');
    }
    if (action === 'like' && onLikeVideo) {
      onLikeVideo(video.id);
    } else if (action === 'comment') {
      setIsCommentsOpen(true);
    }
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !onCommentSubmit) return;
    onCommentSubmit(video.id, newComment.trim());
    setNewComment('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-neutral-950 border border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200"
      >
        {/* Top Header Bar */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-orange-500/80 shrink-0 bg-white shadow-2xs">
              <img
                src={TOPSON_PROFILE_IMAGE}
                alt="Topson Media"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-white tracking-wider uppercase truncate">
                  Topson Media
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[10px] font-semibold text-neutral-400 hidden sm:inline">
                  Official Tutorial
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-medium truncate max-w-md">
                {video.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {videoId && (
              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Watch directly on YouTube Channel"
              >
                <ExternalLink className="w-3.5 h-3.5 text-red-500" />
                <span className="hidden sm:inline">YouTube</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close video player"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 1 & 2. NATIVE IFRAME COMPONENT CODE & ATTRIBUTES */}
        <div className="relative aspect-video w-full bg-black overflow-hidden shadow-2xl">
          {videoId ? (
            <iframe
              src={embedSourceUrl}
              title={video.title}
              className="w-full h-full rounded-xl aspect-video border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="eager"
            />
          ) : (
            /* Fallback for direct device uploaded files */
            <video
              src={
                video.videoUrl ||
                'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
              }
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain bg-black"
            />
          )}
        </div>

        {/* Player Action Strip & Metadata */}
        <div className="p-4 sm:p-6 bg-white text-neutral-900 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-neutral-950 leading-snug">
                {video.title}
              </h2>
              <div className="flex items-center gap-3 mt-1 text-xs text-neutral-600 font-medium flex-wrap">
                <span className="inline-flex items-center gap-1 text-neutral-900 font-bold bg-neutral-100 px-2.5 py-0.5 rounded-full text-[11px]">
                  <Eye className="w-3.5 h-3.5 text-orange-600" />
                  {video.views || `${video.viewsCount || 0} views`}
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  {video.date || 'Topson Media'}
                </span>
                <span>&bull;</span>
                <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 font-bold text-[11px]">
                  {video.category}
                </span>
              </div>
            </div>

            {/* Action Buttons: Like, Share, Comments */}
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => handleYouTubeAction('like')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  isLiked
                    ? 'bg-orange-500 text-white shadow-orange-500/20'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                }`}
                title="Like on YouTube (Opens official channel video)"
              >
                <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-white' : ''}`} />
                <span>{video.likes || 0}</span>
              </button>

              <button
                type="button"
                onClick={handleShareClick}
                className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Copy share link"
              >
                {copiedShare ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-neutral-600" />
                    <span>Share</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleYouTubeAction('comment')}
                className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Comment on YouTube (Opens official channel video)"
              >
                <MessageSquare className="w-3.5 h-3.5 text-neutral-600" />
                <span>{video.comments?.length || 0}</span>
              </button>
            </div>
          </div>

          {/* Description */}
          {video.description && (
            <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed font-normal bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/60">
              {video.description}
            </p>
          )}

          {/* Comments Panel */}
          {isCommentsOpen && (
            <div className="pt-2 border-t border-neutral-100 space-y-3 animate-in fade-in duration-200">
              <h4 className="text-xs font-black uppercase tracking-wider text-neutral-500">
                Community Discussion ({video.comments?.length || 0})
              </h4>

              {onCommentSubmit && (
                <form onSubmit={handleSendComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={
                      currentUser
                        ? 'Add a public comment...'
                        : 'Sign in to join the discussion...'
                    }
                    className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-neutral-300 bg-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    Post
                  </button>
                </form>
              )}

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {video.comments && video.comments.length > 0 ? (
                  video.comments.map((c, i) => (
                    <div
                      key={c.id || i}
                      className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/60 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-neutral-500 text-[10px]">
                        <span className="font-bold text-neutral-800">{c.authorName}</span>
                        <span>{c.timestamp}</span>
                      </div>
                      <p className="text-neutral-700">{c.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-neutral-400 italic py-2">
                    No comments yet. Be the first to share your thoughts on this tutorial!
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
