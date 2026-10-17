import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Check,
  CheckCheck,
  Trash2,
  Search,
  User as UserIcon,
  ShieldCheck,
  Clock,
  RefreshCw,
  X,
  Sparkles,
  ArrowRight,
  Inbox
} from 'lucide-react';
import { ChatMessage, User } from '../types';
import { TOPSON_PROFILE_IMAGE } from '../data/mockData';

interface AdminChatDashboardProps {
  currentUser: User | null;
  messages: ChatMessage[];
  onSendMessage: (msg: ChatMessage) => void;
  onMarkMessagesRead?: (ids: string[]) => void;
  onDeleteMessage?: (msgId: string, mode: 'everyone' | 'me') => void;
  onBackToOverview?: () => void;
}

interface UserConversation {
  userId: string;
  userName: string;
  userEmail?: string;
  avatarUrl?: string;
  lastMessage: ChatMessage;
  unreadCount: number;
  allMessages: ChatMessage[];
}

export const AdminChatDashboard: React.FC<AdminChatDashboardProps> = ({
  currentUser,
  messages,
  onSendMessage,
  onMarkMessagesRead,
  onDeleteMessage,
  onBackToOverview,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('all-public');
  const [replyText, setReplyText] = useState('');
  const chatMessagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Group messages into distinct user conversations
  const conversations = useMemo(() => {
    const userMap = new Map<string, UserConversation>();

    // 1. Gather all unique users who sent messages
    messages.forEach((msg) => {
      // If message is from a regular user, use their userId or senderName as key
      const key = msg.userId || (msg.sender === 'user' ? `user-${msg.senderName.toLowerCase().replace(/\s+/g, '-')}` : null);
      
      if (key) {
        if (!userMap.has(key)) {
          userMap.set(key, {
            userId: key,
            userName: msg.senderName,
            userEmail: msg.userEmail,
            avatarUrl: msg.avatarUrl,
            lastMessage: msg,
            unreadCount: 0,
            allMessages: [],
          });
        }
        const conv = userMap.get(key)!;
        conv.allMessages.push(msg);
        if (msg.sender === 'user' && !msg.isRead) {
          conv.unreadCount++;
        }
        conv.lastMessage = msg;
      }
    });

    // Also include any replies from admin that target these users
    messages.forEach((msg) => {
      if (msg.sender === 'topson' && msg.targetUserId && userMap.has(msg.targetUserId)) {
        const conv = userMap.get(msg.targetUserId)!;
        if (!conv.allMessages.some((m) => m.id === msg.id)) {
          conv.allMessages.push(msg);
          conv.lastMessage = msg;
        }
      }
    });

    // Sort each conversation's messages by timestamp or order
    const list = Array.from(userMap.values());
    list.sort((a, b) => {
      // Place users with unread messages first, then by last message time
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
      return 0;
    });

    return list;
  }, [messages]);

  // Filter conversations by search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase().trim();
    return conversations.filter(
      (c) =>
        c.userName.toLowerCase().includes(q) ||
        (c.userEmail && c.userEmail.toLowerCase().includes(q)) ||
        c.lastMessage.text.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  // Current selected conversation messages
  const activeConversation = useMemo(() => {
    if (selectedUserId === 'all-public') {
      return null;
    }
    return conversations.find((c) => c.userId === selectedUserId) || null;
  }, [conversations, selectedUserId]);

  const activeMessages = useMemo(() => {
    if (selectedUserId === 'all-public') {
      return messages;
    }
    if (activeConversation) {
      return messages.filter(
        (m) =>
          (m.userId === selectedUserId) ||
          (m.targetUserId === selectedUserId) ||
          (m.sender === 'user' && m.senderName === activeConversation.userName)
      );
    }
    return [];
  }, [messages, selectedUserId, activeConversation]);

  // Automatically mark unread messages as read when admin opens a conversation
  useEffect(() => {
    if (activeConversation && activeConversation.unreadCount > 0 && onMarkMessagesRead) {
      const unreadIds = activeMessages
        .filter((m) => m.sender === 'user' && !m.isRead)
        .map((m) => m.id);
      if (unreadIds.length > 0) {
        onMarkMessagesRead(unreadIds);
      }
    }
  }, [selectedUserId, activeConversation, activeMessages, onMarkMessagesRead]);

  // Scroll to bottom of internal chat thread when conversation changes or new messages arrive
  useEffect(() => {
    if (chatMessagesContainerRef.current) {
      chatMessagesContainerRef.current.scrollTop = chatMessagesContainerRef.current.scrollHeight;
    }
  }, [activeMessages.length, selectedUserId]);

  // Send manual admin reply
  const handleSendAdminReply = (e: React.FormEvent) => {
    e.preventDefault();
    const text = replyText.trim();
    if (!text) return;

    const newReply: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'topson',
      senderName: 'Topson Media (Admin)',
      userId: selectedUserId === 'all-public' ? undefined : selectedUserId,
      user_id: selectedUserId === 'all-public' ? undefined : selectedUserId,
      targetUserId: selectedUserId === 'all-public' ? undefined : selectedUserId,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatarUrl: TOPSON_PROFILE_IMAGE,
      isRead: true,
      createdAt: Date.now(),
      created_at: Date.now(),
    };

    onSendMessage(newReply);
    setReplyText('');
    inputRef.current?.focus();
  };

  // Quick reply snippets for quick administration
  const quickTemplates = [
    "Hey! Thanks for reaching out. Let me check this for you.",
    "For this issue on Android, try disabling background data in Settings > Apps.",
    "On Windows, open Task Manager (Ctrl+Shift+Esc) to disable startup apps.",
    "I'm working on a complete video guide covering this exact question!",
  ];

  return (
    <div className="rounded-3xl bg-white border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-[750px] max-h-[85vh]">
      {/* Header bar */}
      <div className="p-3 sm:p-3.5 bg-gradient-to-r from-neutral-900 to-neutral-800 text-white flex flex-wrap items-center justify-between gap-3 border-b border-neutral-700">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white">
                Admin Live Chat Dashboard
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                100% Admin Controlled
              </span>
            </div>
            <p className="text-[11px] text-neutral-300 font-medium">
              Real-time one-on-one viewer messaging. Zero bots, zero AI logic.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onBackToOverview && (
            <button
              type="button"
              onClick={onBackToOverview}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Back to Overview
            </button>
          )}
        </div>
      </div>

      {/* Main Chat Workspace: 2-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-0 bg-neutral-50/50">
        
        {/* Left Column (4 cols): User Threads List */}
        <div className="md:col-span-4 lg:col-span-4 border-r border-neutral-200 bg-white flex flex-col min-h-0">
          
          {/* Search conversations */}
          <div className="p-3 border-b border-neutral-200">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chatting users..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 custom-scrollbar">
            
            {/* Global Studio Stream Item */}
            <div
              onClick={() => setSelectedUserId('all-public')}
              className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 ${
                selectedUserId === 'all-public'
                  ? 'bg-orange-50/60 border-l-4 border-orange-500'
                  : 'hover:bg-neutral-50'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-black shrink-0">
                ALL
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-neutral-900">
                    All Studio Messages
                  </h4>
                  <span className="text-[10px] text-neutral-500">Live</span>
                </div>
                <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                  Complete chronological studio chat stream ({messages.length} msgs)
                </p>
              </div>
            </div>

            {/* Individual User Conversations */}
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-neutral-500">
                <Inbox className="w-8 h-8 mx-auto text-neutral-400 mb-2" />
                <p className="text-xs font-semibold text-neutral-700">No user conversations found</p>
                <p className="text-[11px] text-neutral-500 mt-1">
                  When viewers send a live chat message, they will appear here.
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedUserId === conv.userId;
                return (
                  <div
                    key={conv.userId}
                    onClick={() => setSelectedUserId(conv.userId)}
                    className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'bg-orange-50/70 border-l-4 border-orange-500'
                        : 'hover:bg-neutral-50'
                    }`}
                  >
                    <div className="relative shrink-0">
                      {conv.avatarUrl ? (
                        <img
                          src={conv.avatarUrl}
                          alt={conv.userName}
                          className="w-10 h-10 rounded-full object-cover border border-neutral-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-neutral-800 text-white font-bold text-xs flex items-center justify-center">
                          {conv.userName.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-neutral-900 truncate">
                          {conv.userName}
                        </h4>
                        <span className="text-[10px] text-neutral-400 font-medium shrink-0 ml-1">
                          {conv.lastMessage.timestamp}
                        </span>
                      </div>
                      {conv.userEmail && (
                        <p className="text-[10px] text-neutral-500 truncate">
                          {conv.userEmail}
                        </p>
                      )}
                      <p className={`text-[11px] truncate mt-0.5 ${conv.unreadCount > 0 ? 'font-bold text-neutral-900' : 'text-neutral-600'}`}>
                        {conv.lastMessage.sender === 'topson' ? 'You: ' : ''}{conv.lastMessage.text}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (8 cols): Active Chat History & Reply Composer */}
        <div className="md:col-span-8 lg:col-span-8 flex flex-col min-h-0 bg-neutral-50">
          
          {/* Thread Header */}
          <div className="p-3.5 sm:p-4 bg-white border-b border-neutral-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {activeConversation ? (
                <>
                  {activeConversation.avatarUrl ? (
                    <img
                      src={activeConversation.avatarUrl}
                      alt={activeConversation.userName}
                      className="w-9 h-9 rounded-full object-cover border border-neutral-200"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-neutral-900 text-white font-bold text-xs flex items-center justify-center">
                      {activeConversation.userName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-neutral-900 truncate">
                        {activeConversation.userName}
                      </h4>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Active User
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 font-medium truncate">
                      {activeConversation.userEmail || 'Direct Studio Viewer'} · {activeMessages.length} messages
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
                    ALL
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-neutral-900">
                      All Studio Messages (Broadcast Room)
                    </h4>
                    <p className="text-[11px] text-neutral-500 font-medium">
                      Viewing all viewer questions and replies across the platform
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs text-neutral-500 flex items-center gap-1.5 font-medium shrink-0">
              <ShieldCheck className="w-4 h-4 text-orange-500" />
              <span>Host Manual Mode</span>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div
            ref={chatMessagesContainerRef}
            className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5 custom-scrollbar bg-neutral-100/60 overscroll-contain"
          >
            {activeMessages.length === 0 ? (
              <div className="py-14 text-center text-neutral-500">
                <MessageSquare className="w-9 h-9 text-neutral-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-neutral-700">No messages in this thread yet</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Type a custom message below to start a manual conversation with this user.
                </p>
              </div>
            ) : (
              activeMessages.map((msg) => {
                const isAdmin = msg.sender === 'topson';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 ${isAdmin ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isAdmin && (
                      <div className="w-7 h-7 rounded-full bg-neutral-800 text-white text-[10px] font-bold flex items-center justify-center shrink-0 overflow-hidden shadow-2xs mt-0.5">
                        {msg.avatarUrl ? (
                          <img src={msg.avatarUrl} alt={msg.senderName} className="w-full h-full object-cover" />
                        ) : (
                          msg.senderName.slice(0, 1).toUpperCase()
                        )}
                      </div>
                    )}

                    <div
                      className={`max-w-[78%] rounded-2xl p-2.5 shadow-2xs relative group ${
                        isAdmin
                          ? 'bg-neutral-900 text-white rounded-tr-xs'
                          : 'bg-white text-neutral-900 border border-neutral-200/90 rounded-tl-xs'
                      }`}
                    >
                      {/* Sender Name Bar */}
                      <div className="flex items-center justify-between gap-2.5 mb-1">
                        <span className={`text-[10px] font-bold ${isAdmin ? 'text-orange-400' : 'text-neutral-600'}`}>
                          {isAdmin ? 'Topson Media (You)' : msg.senderName}
                        </span>
                        <div className="flex items-center gap-1 text-[9px] text-neutral-400">
                          <span>{msg.timestamp}</span>
                          {isAdmin && (
                            <CheckCheck className="w-3 h-3 text-sky-400" />
                          )}
                          {!isAdmin && msg.isRead && (
                            <span title="Read by Admin">
                              <CheckCheck className="w-3 h-3 text-sky-500" />
                            </span>
                          )}
                          {!isAdmin && !msg.isRead && (
                            <span title="Delivered to Admin">
                              <Check className="w-3 h-3 text-neutral-400" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Text */}
                      <p className="text-xs font-normal leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </p>

                      {/* Admin Delete Message Option */}
                      {onDeleteMessage && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Delete this message?')) {
                              onDeleteMessage(msg.id, 'everyone');
                            }
                          }}
                          className="absolute -top-2 -right-2 p-1 rounded-full bg-neutral-900 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 cursor-pointer shadow-sm text-[10px]"
                          title="Delete message"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="w-7 h-7 rounded-full border border-orange-500 p-0.5 bg-white shrink-0 overflow-hidden shadow-2xs mt-0.5">
                        <img src={TOPSON_PROFILE_IMAGE} alt="Admin" className="w-full h-full object-cover rounded-full" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Replies Helper Bar */}
          <div className="px-4 py-2 bg-neutral-100 border-t border-neutral-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider shrink-0 mr-1">
              Quick:
            </span>
            {quickTemplates.map((template, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setReplyText(template)}
                className="px-2.5 py-1 rounded-lg bg-white border border-neutral-200 hover:border-neutral-900 text-neutral-700 text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0"
              >
                {template.slice(0, 30)}...
              </button>
            ))}
          </div>

          {/* Input Composer Box */}
          <form
            onSubmit={handleSendAdminReply}
            className="p-3 sm:p-4 bg-white border-t border-neutral-200 flex items-center gap-2.5"
          >
            <div className="flex-1 relative">
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type="text"
                required
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={
                  activeConversation
                    ? `Reply manually to ${activeConversation.userName} as Topson Media...`
                    : "Type a response to the live stream chat..."
                }
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 placeholder:text-neutral-500 text-xs sm:text-sm focus:outline-none focus:border-neutral-900 focus:bg-white transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={!replyText.trim()}
              className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>

      </div>
    </div>
  );
};
