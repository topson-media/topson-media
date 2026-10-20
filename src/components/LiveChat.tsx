import React, { useState, useRef, useEffect } from 'react';
import { Send, Lock, CheckCircle2, Check, CheckCheck, Trash2, MoreVertical, X, AlertTriangle, ShieldCheck, MessageSquare } from 'lucide-react';
import { collection, query, where, or, orderBy, onSnapshot } from 'firebase/firestore';
import { db, markThreadReadInDb } from '../services/firebase';
import { ChatMessage, User } from '../types';
import { TOPSON_PROFILE_IMAGE } from '../data/mockData';
import { WhatsAppIcon } from './WhatsAppIcon';
import { AdminChatDashboard } from './AdminChatDashboard';
import { useLanguage } from '../context/LanguageContext';
import { TopFanBadge } from './TopFanBadge';

interface LiveChatProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  messages: ChatMessage[];
  onSendMessage: (msg: ChatMessage) => void;
  onTopsonReply?: (replyText: string) => void;
  onMarkMessagesRead?: (ids: string[]) => void;
  onDeleteMessage?: (msgId: string, mode: 'everyone' | 'me') => void;
  isStandalonePage?: boolean;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

const WELCOME_FULL_TEXT = "Hey there! Welcome to the studio! Drop your phone, PC, or creator tech questions below and let's talk tech!";

export const LiveChat: React.FC<LiveChatProps> = ({
  currentUser,
  onOpenAuth,
  messages,
  onSendMessage,
  onTopsonReply,
  onMarkMessagesRead,
  onDeleteMessage,
  isStandalonePage = false,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const { t } = useLanguage();
  // 1. PERSISTENT CHAT HISTORY ARRAY STATE (USER ISOLATED VIA FIRESTORE)
  // Guarantees regular users only see their own private messages, separated by user ID
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);

  const [inputText, setInputText] = useState('');
  const [adminChatMode, setAdminChatMode] = useState<'stream' | 'dashboard'>('stream');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Press-and-hold & Unsend Modal states
  const [selectedMessageForAction, setSelectedMessageForAction] = useState<ChatMessage | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef<boolean>(false);

  // 5. WELCOME TEXT ANIMATION (Typewriter letter-by-letter effect)
  const [animatedWelcomeText, setAnimatedWelcomeText] = useState('');
  const [isTypewriterDone, setIsTypewriterDone] = useState(false);

  useEffect(() => {
    let currentIndex = 0;
    setAnimatedWelcomeText('');
    setIsTypewriterDone(false);

    const interval = setInterval(() => {
      if (currentIndex <= WELCOME_FULL_TEXT.length) {
        setAnimatedWelcomeText(WELCOME_FULL_TEXT.slice(0, currentIndex));
        currentIndex++;
      } else {
        setIsTypewriterDone(true);
        clearInterval(interval);
      }
    }, 24);

    return () => clearInterval(interval);
  }, []);

  // Strictly scroll ONLY the internal messages box - NEVER scroll the page/window!
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [localMessages, animatedWelcomeText]);

  // 2. SECURE LIVE CHAT CONVERSATION STREAM ('chat_messages'):
  // 2. SECURE 2-WAY LIVE CHAT CONVERSATION STREAM ('chat_messages' & 'messages'):
  // Dynamic real-time onSnapshot listener ensures users see their own messages and Admin responses
  // Queries documents where userId == currentUserId OR user_id == currentUserId OR targetUserId == currentUserId (Admin replied)
  // Sorted chronologically by created_at ASC
  useEffect(() => {
    if (!currentUser) {
      setLocalMessages([]);
      return;
    }

    const isAdmin = currentUser.role === 'admin';
    const currentUid = currentUser.uid || currentUser.id;

    // Helper to extract timestamp in ms from document data
    const parseCreatedAt = (data: any): number => {
      if (data.created_at) {
        if (typeof data.created_at.toMillis === 'function') return data.created_at.toMillis();
        if (typeof data.created_at.toDate === 'function') return data.created_at.toDate().getTime();
        if (typeof data.created_at === 'number') return data.created_at;
      }
      if (data.createdAt) {
        if (typeof data.createdAt.toMillis === 'function') return data.createdAt.toMillis();
        if (typeof data.createdAt.toDate === 'function') return data.createdAt.toDate().getTime();
        if (typeof data.createdAt === 'number') return data.createdAt;
      }
      if (data.createdTimestamp) return data.createdTimestamp;
      return 0;
    };

    let q;
    try {
      if (isAdmin) {
        // Admin: load all messages chronologically
        q = query(collection(db, 'chat_messages'), orderBy('created_at', 'asc'));
      } else {
        // Regular user: fetch where user sent message OR admin replied to their thread
        q = query(
          collection(db, 'chat_messages'),
          or(
            where('userId', '==', currentUid),
            where('user_id', '==', currentUid),
            where('targetUserId', '==', currentUid)
          )
        );
      }
    } catch {
      // Fallback query if 'or' with specific fields is not supported
      q = query(collection(db, 'chat_messages'));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const rawSender = data.sender || (data.senderId === 'admin' ? 'topson' : 'user');
          const docUserId = data.userId || data.user_id || data.senderId;
          const targetId = data.targetUserId || data.receiverId;
          const senderId = data.senderId || (rawSender === 'topson' ? 'admin' : docUserId);
          const receiverId = data.receiverId || (rawSender === 'topson' ? targetId : 'admin');
          const status: 'sent' | 'read' = data.status === 'read' || data.isRead ? 'read' : 'sent';

          // In-memory filter ensures strict security and edge-case handling
          if (!isAdmin) {
            const isRelated =
              docUserId === currentUid ||
              senderId === currentUid ||
              targetId === currentUid ||
              receiverId === currentUid ||
              (rawSender === 'topson' && (targetId === currentUid || receiverId === currentUid));
            if (!isRelated) return;
          }

          const createdTs = parseCreatedAt(data);

          msgs.push({
            id: docSnap.id,
            sender: rawSender,
            senderName: data.senderName || (rawSender === 'topson' ? 'Topson Media' : 'Viewer'),
            senderId: senderId,
            receiverId: receiverId,
            status: status,
            userId: docUserId,
            user_id: docUserId,
            userEmail: data.userEmail,
            targetUserId: targetId,
            text: data.text || '',
            timestamp: data.timestamp || 'Just now',
            avatarUrl: data.avatarUrl,
            isRead: status === 'read',
            createdAt: createdTs || Date.now(),
            deletedForEveryone: data.deletedForEveryone,
            deletedForUser: data.deletedForUser,
          } as ChatMessage);
        });

        // Strict chronological sort by created_at ASC
        msgs.sort((a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0));

        setLocalMessages(msgs);
      },
      (error) => {
        console.warn('Firestore chat_messages onSnapshot fallback:', error);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.id, currentUser?.uid, currentUser?.role]);

  // Hook up an intersection / visibility trigger:
  // When user opens their panel, automatically update all Admin replies to this user to status = "read"
  // When Admin opens the chat thread, mark all unread messages from that user as status = "read"
  useEffect(() => {
    if (!currentUser) return;
    const currentUid = currentUser.uid || currentUser.id;
    const isAdmin = currentUser.role === 'admin';
    markThreadReadInDb(currentUid, isAdmin ? 'admin' : 'user');
  }, [currentUser?.id, currentUser?.uid, currentUser?.role, localMessages.length]);

  // 1. PERSISTENT CHAT HISTORY & REAL ADMIN/USER MESSAGING (ZERO AI BOTS)
  const handleSend = (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent, textToSend?: string) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }
    const text = (textToSend || inputText).trim();
    if (!text || !currentUser) return;

    const isAdmin = currentUser.role === 'admin';
    const currentUid = currentUser.uid || currentUser.id;
    const newMsgId = 'msg-' + Date.now();
    const newMsg: ChatMessage = {
      id: newMsgId,
      sender: isAdmin ? 'topson' : 'user',
      senderName: isAdmin ? 'Topson Media (Admin)' : currentUser.username,
      senderId: isAdmin ? 'admin' : currentUid,
      receiverId: isAdmin ? 'user' : 'admin',
      userId: isAdmin ? undefined : currentUid,
      user_id: isAdmin ? undefined : currentUid,
      userEmail: isAdmin ? undefined : currentUser.email,
      targetUserId: isAdmin ? undefined : 'admin',
      status: 'sent', // Initially sent with 1 tick (✓)
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatarUrl: isAdmin ? TOPSON_PROFILE_IMAGE : currentUser.avatarUrl,
      isRead: false,
      isTopFan: !isAdmin && !!(currentUser.isTopFan || currentUser.fanBadge),
      hasFanBadge: !isAdmin && !!(currentUser.isTopFan || currentUser.fanBadge),
    };

    // Clear input text area cleanly
    setInputText('');

    // Persist real network request to Firestore chat_messages
    onSendMessage(newMsg);

    if (isAdmin && onTopsonReply) {
      onTopsonReply(text);
    }
  };

  // PRESS AND HOLD HANDLERS
  const handleTouchStart = (msg: ChatMessage) => {
    isLongPressRef.current = false;
    pressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setSelectedMessageForAction(msg);
      setShowDeleteModal(true);
      if (window.navigator?.vibrate) {
        try {
          window.navigator.vibrate(50);
        } catch {
          // ignore
        }
      }
    }, 500); // 500ms threshold for press-and-hold
  };

  const handleTouchEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  // EXECUTE DELETE / UNSEND
  const handleExecuteDelete = (mode: 'everyone' | 'me') => {
    if (!selectedMessageForAction) return;
    const msgId = selectedMessageForAction.id;

    if (onDeleteMessage) {
      onDeleteMessage(msgId, mode);
    }

    setShowDeleteModal(false);
    setSelectedMessageForAction(null);
  };

  return (
    <section
      id="live-chat"
      className={`py-12 sm:py-16 scroll-mt-20 ${
        !isStandalonePage ? 'border-t border-neutral-200' : ''
      } bg-white`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Kicker */}
        <div className="text-[11px] font-bold tracking-widest uppercase text-neutral-700 mb-3">
          LIVE CHAT {isStandalonePage ? '· DIRECT STUDIO FEED' : ''}
        </div>

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 gap-2.5">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight leading-tight">
              {t.liveChatSection.header}
            </h2>
            <p className="hidden md:block text-xs text-neutral-600 mt-0.5 max-w-md font-medium leading-relaxed">
              Direct two-way messaging for phone tips, PC tweaks, and digital skills.
            </p>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-bold text-neutral-900 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Online now · Studio Active</span>
          </div>
        </div>

        {/* Admin Chat View Selector */}
        {currentUser?.role === 'admin' && (
          <div className="mb-4 p-3 rounded-2xl bg-neutral-900 text-white flex flex-wrap items-center justify-between gap-2.5 shadow-md border border-neutral-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-orange-500 shrink-0" />
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Logged in as Admin (Topson Media)</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold">
                    100% Human Controlled
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400">
                  All automated AI bot systems deleted. Reply manually to each active chatter.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAdminChatMode('stream')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  adminChatMode === 'stream'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-neutral-800 text-neutral-300 hover:text-white'
                }`}
              >
                Live Stream Chat
              </button>
              <button
                type="button"
                onClick={() => setAdminChatMode('dashboard')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  adminChatMode === 'dashboard'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-neutral-800 text-neutral-300 hover:text-white'
                }`}
              >
                <span>Admin Chat Dashboard</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </button>
            </div>
          </div>
        )}

        {currentUser?.role === 'admin' && adminChatMode === 'dashboard' ? (
          <AdminChatDashboard
            currentUser={currentUser}
            messages={localMessages}
            onSendMessage={onSendMessage}
            onMarkMessagesRead={onMarkMessagesRead}
            onDeleteMessage={onDeleteMessage}
            onBackToOverview={() => setAdminChatMode('stream')}
          />
        ) : currentUser ? (
          <div className="rounded-2xl overflow-hidden bg-white border border-neutral-200 shadow-sm flex flex-col h-[480px] max-h-[500px] sm:max-h-[60vh]">
            
            {/* Top Chat Bar: Profile Info + Real, Colorful Brand Social Logos */}
            <div className="px-3.5 py-2 border-b border-neutral-200 bg-white/95 backdrop-blur-xs flex items-center justify-between gap-3 flex-wrap">
              
              {/* Creator Identity with Official Profile Picture */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-orange-500 p-0.5 bg-white shrink-0 shadow-sm">
                  <img
                    src={TOPSON_PROFILE_IMAGE}
                    alt="Topson Media"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1 text-xs font-black text-neutral-900">
                    <span>Topson Media</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 fill-orange-500 text-white" />
                  </div>
                  <div className="text-[9px] text-emerald-700 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>In Studio · Replying live</span>
                  </div>
                </div>
              </div>

              {/* Colorful, Authentic Brand Logos for TikTok, Instagram, Facebook, and YouTube */}
              <div className="flex items-center gap-1.5">
                <span className="hidden sm:inline-block text-[9px] font-bold text-neutral-500 uppercase tracking-wider mr-1">
                  Connect:
                </span>

                {/* YouTube - Red */}
                <a
                  href="https://www.youtube.com/@topson-media1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-6 h-6 rounded-md bg-red-50 hover:bg-[#FF0000] text-[#FF0000] hover:text-white border border-red-200/70 hover:border-transparent flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                  title="YouTube (@topson-media1)"
                  aria-label="YouTube channel"
                >
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>

                {/* TikTok - Cyber Black & Neon Cyan */}
                <a
                  href="https://tiktok.com/@topsonmedia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-6 h-6 rounded-md bg-neutral-900 hover:bg-black text-[#00f2fe] border border-neutral-800 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 hover:shadow-cyan-500/20"
                  title="TikTok (@topsonmedia)"
                  aria-label="TikTok profile"
                >
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
                  </svg>
                </a>

                {/* Instagram - Vibrant Sunset Gradient */}
                <a
                  href="https://instagram.com/topson.media"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-6 h-6 rounded-md bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 shadow-rose-500/20"
                  title="Instagram (@topson.media)"
                  aria-label="Instagram profile"
                >
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>

                {/* Facebook - Official Blue */}
                <a
                  href="https://www.facebook.com/etienne.topson.kenedy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-6 h-6 rounded-md bg-[#1877F2]/10 hover:bg-[#1877F2] text-[#1877F2] hover:text-white border border-[#1877F2]/30 hover:border-transparent flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 shadow-blue-500/20"
                  title="Facebook (Etienne Topson Kenedy)"
                  aria-label="Facebook page"
                >
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>

                {/* WhatsApp - Real Brand Green */}
                <a
                  href="https://wa.me/250794903078"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-6 h-6 rounded-md bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white border border-[#25D366]/30 hover:border-transparent flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 shadow-emerald-500/20"
                  title="WhatsApp (0794903078)"
                  aria-label="WhatsApp"
                >
                  <WhatsAppIcon className="w-3 h-3 fill-current" />
                </a>
              </div>

            </div>

            {/* Chat Messages Display Panel with Clean Max Height & Internal Scroll */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto max-h-[350px] sm:max-h-[370px] p-3 sm:p-3.5 space-y-2.5 custom-scrollbar bg-white overscroll-contain"
            >
              {localMessages.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 space-y-1.5">
                  <div className="w-9 h-9 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 mx-auto">
                    <MessageSquare className="w-4 h-4 text-neutral-400" />
                  </div>
                  <h4 className="text-xs font-bold text-neutral-900">No chat messages yet</h4>
                  <p className="text-[11px] text-neutral-500 max-w-xs mx-auto leading-relaxed">
                    Type a message below to start a live conversation directly with Topson Media in the studio.
                  </p>
                </div>
              ) : (
                localMessages.map((msg, index) => {
                const isTopson = msg.sender === 'topson';
                const isFirstWelcomeMsg = isTopson && index === 0;

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2 items-start max-w-[85%] sm:max-w-[75%] md:max-w-[70%] ${
                      isTopson ? 'mr-auto justify-start' : 'ml-auto flex-row-reverse justify-start'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="shrink-0 mt-0.5">
                      {isTopson ? (
                        <div className="w-6 h-6 rounded-full border border-orange-500 p-0.5 bg-white shadow-2xs">
                          <img
                            src={TOPSON_PROFILE_IMAGE}
                            alt="Topson Media"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover rounded-full"
                          />
                        </div>
                      ) : msg.avatarUrl ? (
                        <div className="w-6 h-6 rounded-full border border-neutral-300 overflow-hidden bg-white shadow-2xs shrink-0">
                          <img
                            src={msg.avatarUrl}
                            alt={msg.senderName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover rounded-full"
                          />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-200 border border-slate-300 text-slate-800 font-bold flex items-center justify-center text-[9px] shadow-2xs">
                          {msg.senderName.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Bubble Column */}
                    <div className={`flex flex-col w-fit max-w-full md:max-w-md min-w-0 relative group ${
                      isTopson ? 'items-start' : 'items-end'
                    }`}>
                      {/* Top: Sender Name, Host Tag, and Top Fan Badge */}
                      <div className={`flex items-center gap-1.5 mb-0.5 px-0.5 flex-wrap ${isTopson ? 'justify-start' : 'justify-end'}`}>
                        <span className="text-[10px] font-bold text-neutral-900">
                          {msg.senderName}
                        </span>
                        {!isTopson && (msg.isTopFan || msg.hasFanBadge || (currentUser?.username === msg.senderName && (currentUser?.isTopFan || currentUser?.fanBadge))) && (
                          <TopFanBadge size="xs" />
                        )}
                        {isTopson && (
                          <span className="text-[8px] font-bold text-orange-700 bg-orange-100 px-1 py-0.2 rounded">
                            Host
                          </span>
                        )}
                      </div>

                      {/* Bubble content */}
                      <div className="relative flex items-center gap-1 max-w-full min-w-0">
                        {!isTopson && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMessageForAction(msg);
                              setShowDeleteModal(true);
                            }}
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-neutral-100 cursor-pointer shrink-0"
                            title="Unsend / Delete message"
                            aria-label="Unsend or delete message"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}

                        <div
                          onMouseDown={() => !isTopson && handleTouchStart(msg)}
                          onMouseUp={handleTouchEnd}
                          onMouseLeave={handleTouchEnd}
                          onTouchStart={() => !isTopson && handleTouchStart(msg)}
                          onTouchEnd={handleTouchEnd}
                          onTouchCancel={handleTouchEnd}
                          style={{
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                            whiteSpace: 'pre-wrap',
                          }}
                          className={`inline-block w-fit max-w-full px-3 py-2 rounded-2xl text-xs leading-relaxed break-words [word-break:break-word] [overflow-wrap:anywhere] whitespace-pre-wrap text-left shadow-2xs select-none transition-transform active:scale-[0.98] ${
                            isTopson
                              ? 'bg-neutral-100 text-neutral-900 rounded-tl-xs border border-neutral-200/90 font-medium'
                              : 'bg-slate-100 text-slate-900 rounded-tr-xs border border-slate-200/80 font-medium cursor-pointer hover:bg-slate-100/90'
                          }`}
                        >
                          {isFirstWelcomeMsg ? (
                            <span className="break-words [word-break:break-word] [overflow-wrap:anywhere]">
                              {animatedWelcomeText || msg.text}
                              {!isTypewriterDone && (
                                <span className="inline-block w-1.5 h-3 ml-1 bg-orange-500 animate-pulse align-middle" />
                              )}
                            </span>
                          ) : (
                            <span className="break-words [word-break:break-word] [overflow-wrap:anywhere]">{msg.text}</span>
                          )}
                        </div>
                      </div>

                      {/* Time and Checkmark Indicator */}
                      <div className={`flex items-center gap-1 mt-0.5 px-0.5 text-[9px] text-neutral-400 font-medium select-none ${
                        isTopson ? 'justify-start' : 'justify-end'
                      }`}>
                        <span>{msg.timestamp}</span>

                        {/* 2-Way Message Status Indicator (Ticks):
                            Render ONE TICK (✓) if status == "sent"
                            Render TWO TICKS (✓✓) if status == "read" */}
                        {(!isTopson || currentUser?.role === 'admin') && (
                          <span className="inline-flex items-center ml-0.5">
                            {msg.status === 'read' || msg.isRead ? (
                              <span title="Read (✓✓)" className="inline-flex items-center text-sky-500 font-bold">
                                <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                              </span>
                            ) : (
                              <span title="Sent (✓)" className="inline-flex items-center text-slate-400">
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }))}
            </div>

            {/* Bottom Message Input Bar: Perfectly Anchored with Clean Orange Glow Animation */}
            <div className="p-2 sm:p-2.5 border-t border-neutral-200 bg-white shrink-0 mt-auto">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSend(e);
                }}
                className="w-full m-0"
              >
                {/* Single unified horizontal container with orange glow */}
                <div className="flex items-center bg-white rounded-xl border border-neutral-300 p-1 shadow-2xs transition-all duration-200 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:shadow-[0_0_15px_rgba(249,115,22,0.25)]">
                  {currentUser && (
                    <div className="w-6 h-6 rounded-full overflow-hidden border border-neutral-300 ml-1 shrink-0 shadow-2xs">
                      {currentUser.avatarUrl ? (
                        <img
                          src={currentUser.avatarUrl}
                          alt={currentUser.username}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <div className="w-full h-full bg-neutral-900 text-white font-bold text-[9px] flex items-center justify-center">
                          {currentUser.username.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}

                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText ?? ''}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSend(e);
                      }
                    }}
                    placeholder="Type your message..."
                    className="flex-1 px-2.5 py-1 text-xs text-neutral-900 bg-transparent placeholder:text-neutral-400 focus:outline-none"
                  />

                  {/* Snapped inside Send Button */}
                  <button
                    type="submit"
                    onClick={(e) => e.stopPropagation()}
                    disabled={!inputText.trim()}
                    className="px-3.5 py-1.5 rounded-lg text-white font-bold text-xs bg-orange-500 hover:bg-orange-600 disabled:opacity-30 disabled:hover:bg-orange-500 transition-all active:scale-95 flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                  >
                    <span>Send</span>
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </form>
            </div>

          </div>
        ) : (
          /* LOCKED CHAT CARD */
          <div className="rounded-3xl p-10 sm:p-14 bg-white border border-neutral-200 shadow-sm text-center flex flex-col items-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700 mb-5">
              <Lock className="w-5 h-5" />
            </div>

            <h3 className="text-xl font-black text-neutral-900 mb-2">
              Sign in to join live chat
            </h3>

            <p className="text-xs sm:text-sm text-neutral-700 mb-6 leading-relaxed font-medium">
              Create a free account or sign in to chat directly with Topson Media in real time.
            </p>

            <button
              type="button"
              onClick={onOpenAuth}
              className="px-6 py-3 text-xs sm:text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-all shadow-md shadow-orange-500/20 active:scale-95 cursor-pointer"
            >
              Sign in / Sign up
            </button>
          </div>
        )}

        {/* DELETE / UNSEND MESSAGE MODAL (Triggered by press-and-hold or delete button) */}
        {showDeleteModal && selectedMessageForAction && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
            onClick={() => setShowDeleteModal(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full border border-neutral-200 shadow-2xl relative text-left animate-in zoom-in-95 duration-200"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    Delete message?
                  </h3>
                  <p className="text-xs text-neutral-500 font-medium">
                    Choose how you want to remove this message
                  </p>
                </div>
              </div>

              {/* Message Quote Preview */}
              <div className="p-3 mb-5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-700 italic max-h-20 overflow-y-auto">
                &ldquo;{selectedMessageForAction.text}&rdquo;
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                {/* 1. Delete for everyone (Un-send direct from hoster & own panel) */}
                <button
                  type="button"
                  onClick={() => handleExecuteDelete('everyone')}
                  className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] transition-all flex flex-col items-center justify-center shadow-xs cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    <span>Unsend / Delete for everyone</span>
                  </span>
                  <span className="text-[11px] font-normal opacity-90 mt-0.5">
                    Deleted on hoster and on your panel
                  </span>
                </button>

                {/* 2. Delete for me (Deleted on his panel only) */}
                <button
                  type="button"
                  onClick={() => handleExecuteDelete('me')}
                  className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 active:scale-[0.98] transition-all flex flex-col items-center justify-center border border-neutral-200 cursor-pointer"
                >
                  <span>Delete for me</span>
                  <span className="text-[11px] font-normal text-neutral-500 mt-0.5">
                    Removes from your panel only
                  </span>
                </button>

                {/* Cancel Button */}
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer text-center"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
