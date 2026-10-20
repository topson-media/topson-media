import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Mail,
  Calendar,
  Eye,
  Award,
  ShieldCheck,
  ShieldAlert,
  MessageSquare,
  MessageCircle,
  Star,
  RefreshCw,
  ExternalLink,
  Heart,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  UserCheck,
  UserX,
  Trash2
} from 'lucide-react';
import { User, FeedbackItem, ChatMessage } from '../types';
import { TOPSON_PROFILE_IMAGE } from '../data/mockData';
import { TopFanBadge } from './TopFanBadge';
import { fetchUserActivityHistoryInDb } from '../services/firebase';

interface UserDetailsModalProps {
  user: User;
  isSuspended: boolean;
  onClose: () => void;
  onToggleStatus: (userId: string, username: string) => void;
  onAwardFanBadge: (userId: string, username: string) => void;
  onDeleteUser: (userId: string, username: string) => void;
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  user,
  isSuspended,
  onClose,
  onToggleStatus,
  onAwardFanBadge,
  onDeleteUser,
}) => {
  const [activeAccordion, setActiveAccordion] = useState<'all' | 'feedbacks' | 'chat'>('all');
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);
  const [userFeedbacks, setUserFeedbacks] = useState<FeedbackItem[]>([]);
  const [userChatMessages, setUserChatMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingHistory(true);
    fetchUserActivityHistoryInDb(user.id, user.username, user.email)
      .then((history) => {
        if (isMounted) {
          setUserFeedbacks(history.feedbacks);
          setUserChatMessages(history.chatMessages);
          setIsLoadingHistory(false);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch user activity history:', err);
        if (isMounted) setIsLoadingHistory(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user.id, user.username, user.email]);

  const visits = user.visitsCount || 1;
  const isTopFan = !!user.isTopFan || !!user.fanBadge;
  const isPendingBadge = !!user.fanBadgeOffered && !user.fanBadge;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-slate-950/95 backdrop-blur-2xl rounded-3xl border border-orange-500/40 shadow-[0_0_60px_rgba(249,115,22,0.3)] text-white relative my-auto animate-in zoom-in-95 duration-200 custom-scrollbar flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow & Header */}
        <div className="relative p-6 sm:p-7 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-black overflow-hidden">
          <div className="absolute top-0 right-1/4 w-72 h-36 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-start justify-between relative z-10 gap-4">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-orange-500/60 p-0.5 bg-slate-900 shadow-[0_0_20px_rgba(249,115,22,0.4)] shrink-0">
                <img
                  src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                  alt={user.username}
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    e.currentTarget.src = TOPSON_PROFILE_IMAGE;
                  }}
                />
                {isTopFan && (
                  <span
                    className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-black shadow-md border border-slate-950"
                    title="Official Top Fan"
                  >
                    ⭐
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {user.username}
                  </h3>
                  {isTopFan && <TopFanBadge size="sm" />}
                  {isPendingBadge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Top Fan Pending
                    </span>
                  )}
                  {isSuspended ? (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Suspended
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Active Account
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1 text-slate-300">
                    <Mail className="w-3.5 h-3.5 text-orange-400" />
                    {user.email || 'No email provided'}
                  </span>
                  <span>&bull;</span>
                  <span className="text-slate-400">UID: <span className="font-mono text-slate-300">{user.id}</span></span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-slate-700"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Breakdown KPI Cards */}
        <div className="p-6 sm:p-7 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Visits
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-white">{visits}</span>
                <span className="text-[10px] text-orange-400 font-bold">
                  {visits >= 3 ? '🔥 Loyal Viewer' : 'Visitor'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Account Created
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-sm font-bold text-slate-200">
                <Calendar className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span className="truncate">{user.joinedDate || 'Recent'}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Feedbacks Given
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-2xl font-black text-amber-400">
                  {isLoadingHistory ? '...' : userFeedbacks.length}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Reviews</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Live Chat Sent
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-2xl font-black text-blue-400">
                  {isLoadingHistory ? '...' : userChatMessages.length}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Messages</span>
              </div>
            </div>
          </div>

          {/* Direct Admin Control Actions */}
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-orange-500/20 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-300">
              Quick Admin Moderation Actions:
            </span>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Award / Toggle Top Fan */}
              <button
                type="button"
                onClick={() => onAwardFanBadge(user.id, user.username)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  isTopFan
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white'
                }`}
                title="Award official Top Fan Badge and trigger automated HTML email"
              >
                <Award className="w-3.5 h-3.5" />
                <span>{isTopFan ? 'Re-Award Top Fan' : 'Award Top Fan Badge'}</span>
              </button>

              {/* Toggle Suspension */}
              <button
                type="button"
                onClick={() => onToggleStatus(user.id, user.username)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  isSuspended
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
                }`}
                title={isSuspended ? 'Reactivate account' : 'Suspend account and send alert email'}
              >
                {isSuspended ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                <span>{isSuspended ? 'Reactivate Account' : 'Suspend Account'}</span>
              </button>

              {/* Delete User */}
              <button
                type="button"
                onClick={() => {
                  onDeleteUser(user.id, user.username);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700 hover:border-red-600"
                title="Delete user account and send email notification"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>

          {/* Accordion Selector */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <button
              type="button"
              onClick={() => setActiveAccordion('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeAccordion === 'all'
                  ? 'bg-orange-500 text-white shadow-[0_0_12px_rgba(249,115,22,0.4)]'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All Activity History
            </button>
            <button
              type="button"
              onClick={() => setActiveAccordion('feedbacks')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeAccordion === 'feedbacks'
                  ? 'bg-orange-500 text-white shadow-[0_0_12px_rgba(249,115,22,0.4)]'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Feedbacks ({userFeedbacks.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveAccordion('chat')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeAccordion === 'chat'
                  ? 'bg-orange-500 text-white shadow-[0_0_12px_rgba(249,115,22,0.4)]'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Live Chat ({userChatMessages.length})
            </button>
          </div>

          {/* Accordion Content Section */}
          {isLoadingHistory ? (
            <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
              <span>Fetching dynamic Firestore records for {user.username}...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* SECTION: COMMUNITY FEEDBACKS */}
              {(activeAccordion === 'all' || activeAccordion === 'feedbacks') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Star className="w-3.5 h-3.5" />
                      <span>Community Feedback Submissions ({userFeedbacks.length})</span>
                    </h4>
                    <span className="text-[11px] text-slate-500 font-medium">Pulled from Firestore</span>
                  </div>

                  {userFeedbacks.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-xs text-slate-500 text-center">
                      No community feedback posts found for this user account.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                      {userFeedbacks.map((fb) => (
                        <div
                          key={fb.id}
                          className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-orange-500/40 transition-colors text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1 text-amber-400 font-bold">
                              {[...Array(fb.rating || 5)].map((_, i) => (
                                <Star key={i} className="w-3 h-3 fill-amber-400" />
                              ))}
                              <span className="ml-1 text-[11px] text-slate-300">{fb.rating || 5}/5</span>
                            </div>
                            <span className="text-[10px] text-slate-500">{fb.date || 'Recent'}</span>
                          </div>

                          <p className="text-slate-300 font-normal leading-relaxed pl-2 border-l-2 border-orange-500/50">
                            &ldquo;{fb.content || fb.text}&rdquo;
                          </p>

                          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                              {fb.likesCount || fb.likes || 0} likes
                            </span>
                            <span>&bull;</span>
                            <span>Doc ID: {fb.id}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION: LIVE CHAT MESSAGES */}
              {(activeAccordion === 'all' || activeAccordion === 'chat') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Live Chat Messages History ({userChatMessages.length})</span>
                    </h4>
                    <span className="text-[11px] text-slate-500 font-medium">Real-time support log</span>
                  </div>

                  {userChatMessages.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-xs text-slate-500 text-center">
                      No live chat messages sent yet by this user.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                      {userChatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs flex items-start justify-between gap-3"
                        >
                          <div className="space-y-1 min-w-0">
                            <p className="text-slate-200 font-normal leading-relaxed break-words">
                              {msg.text}
                            </p>
                            <span className="text-[10px] text-slate-500 block">
                              Sent: {msg.timestamp || 'Recent'} &bull; Status: {msg.isRead ? 'Read' : 'Sent'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400 mt-auto">
          <span>Topson Media Cloud Administration &bull; User ID: {user.id}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
