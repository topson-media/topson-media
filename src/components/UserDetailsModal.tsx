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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl border border-slate-200 shadow-2xl text-slate-900 relative my-auto animate-in zoom-in-95 duration-200 custom-scrollbar flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Clean White Theme */}
        <div className="relative p-6 sm:p-7 border-b border-slate-200 bg-slate-50/80 overflow-hidden">
          <div className="flex items-start justify-between relative z-10 gap-4">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-orange-500 p-0.5 bg-white shadow-sm shrink-0">
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
                    className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-black shadow-md border border-white"
                    title="Official Top Fan"
                  >
                    ⭐
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {user.username}
                  </h3>
                  {isTopFan && <TopFanBadge size="sm" />}
                  {isPendingBadge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Top Fan Pending
                    </span>
                  )}
                  {isSuspended ? (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Suspended
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Active Account
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1 text-slate-700">
                    <Mail className="w-3.5 h-3.5 text-orange-500" />
                    {user.email || 'No email provided'}
                  </span>
                  <span>&bull;</span>
                  <span className="text-slate-500">UID: <span className="font-mono text-slate-700">{user.id}</span></span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-slate-200 shadow-xs"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Breakdown KPI Cards */}
        <div className="p-6 sm:p-7 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Total Visits
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-slate-900">{visits}</span>
                <span className="text-[10px] text-orange-600 font-bold">
                  {visits >= 3 ? '🔥 Loyal Viewer' : 'Visitor'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Account Created
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-sm font-bold text-slate-800">
                <Calendar className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span className="truncate">{user.joinedDate || 'Recent'}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Feedbacks Given
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-2xl font-black text-amber-600">
                  {isLoadingHistory ? '...' : userFeedbacks.length}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Reviews</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Live Chat Sent
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-2xl font-black text-blue-600">
                  {isLoadingHistory ? '...' : userChatMessages.length}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Messages</span>
              </div>
            </div>
          </div>

          {/* Direct Admin Control Actions */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-700">
              Quick Admin Moderation Actions:
            </span>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Award / Toggle Top Fan */}
              <button
                type="button"
                onClick={() => onAwardFanBadge(user.id, user.username)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  isTopFan
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shadow-xs ${
                  isSuspended
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
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
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-red-600 text-slate-700 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer border border-slate-300 hover:border-red-600 shadow-xs"
                title="Delete user account and send email notification"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500 group-hover:text-white" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>

          {/* Accordion Selector */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => setActiveAccordion('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeAccordion === 'all'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              All Activity History
            </button>
            <button
              type="button"
              onClick={() => setActiveAccordion('feedbacks')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeAccordion === 'feedbacks'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              Feedbacks ({userFeedbacks.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveAccordion('chat')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeAccordion === 'chat'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              Live Chat ({userChatMessages.length})
            </button>
          </div>

          {/* Accordion Content Section */}
          {isLoadingHistory ? (
            <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
              <span>Fetching dynamic Firestore records for {user.username}...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* SECTION: COMMUNITY FEEDBACKS */}
              {(activeAccordion === 'all' || activeAccordion === 'feedbacks') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-2">
                      <Star className="w-3.5 h-3.5 text-amber-500" />
                      <span>Community Feedback Submissions ({userFeedbacks.length})</span>
                    </h4>
                    <span className="text-[11px] text-slate-500 font-medium">Pulled from Firestore</span>
                  </div>

                  {userFeedbacks.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                      No community feedback posts found for this user account.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                      {userFeedbacks.map((fb) => (
                        <div
                          key={fb.id}
                          className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-orange-500/50 shadow-xs transition-colors text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1 text-amber-500 font-bold">
                              {[...Array(fb.rating || 5)].map((_, i) => (
                                <Star key={i} className="w-3 h-3 fill-amber-400" />
                              ))}
                              <span className="ml-1 text-[11px] text-slate-700">{fb.rating || 5}/5</span>
                            </div>
                            <span className="text-[10px] text-slate-500">{fb.date || 'Recent'}</span>
                          </div>

                          <p className="text-slate-700 font-normal leading-relaxed pl-2 border-l-2 border-orange-500/50">
                            &ldquo;{fb.content || fb.text}&rdquo;
                          </p>

                          <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
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
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-2">
                      <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                      <span>Live Chat Messages History ({userChatMessages.length})</span>
                    </h4>
                    <span className="text-[11px] text-slate-500 font-medium">Real-time support log</span>
                  </div>

                  {userChatMessages.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                      No live chat messages sent yet by this user.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                      {userChatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs text-xs flex items-start justify-between gap-3"
                        >
                          <div className="space-y-1 min-w-0">
                            <p className="text-slate-800 font-normal leading-relaxed break-words">
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
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 mt-auto">
          <span>Topson Media Cloud Administration &bull; User ID: {user.id}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
