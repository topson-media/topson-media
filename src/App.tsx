/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Navbar, NavSection } from './components/Navbar';
import { Hero } from './components/Hero';
import { AboutSection } from './components/AboutSection';
import { PlatformsSection } from './components/PlatformsSection';
import { VideoGallery } from './components/VideoGallery';
import { CommunitySection } from './components/CommunitySection';
import { LiveChat } from './components/LiveChat';
import { ContactSection } from './components/ContactSection';
import { AdminDashboard } from './components/AdminDashboard';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import {
  INITIAL_VIDEOS,
  INITIAL_FEEDBACKS,
  INITIAL_CHAT_MESSAGES,
  TOPSON_PROFILE_IMAGE,
} from './data/mockData';
import { User, FeedbackItem, ChatMessage, VideoItem, EmailMessage, VisitorActivity, VideoComment } from './types';
import {
  subscribeToVideos,
  addVideoToDb,
  updateVideoInDb,
  deleteVideoFromDb,
  toggleLikeVideoInDb,
  addVideoCommentInDb,
  incrementVideoViewsInDb,
  subscribeToFeedbacks,
  addFeedbackToDb,
  deleteFeedbackFromDb,
  toggleLikeFeedbackInDb,
  hideFeedbackInDb,
  subscribeToMessages,
  sendMessageToDb,
  deleteMessageFromDb,
  markMessagesReadInDb,
  testFirestoreConnection,
  verifyConfirmationEmail,
  subscribeToContactSubmissions,
  replyToContactSubmissionInDb,
  acceptFanBadgeInDb,
  recordUserVisitInDb,
  subscribeToUserSuspension,
  auth,
} from './services/firebase';
import { signOut } from 'firebase/auth';

export default function App() {
  // Enforce white background on <html>, <body>, and localStorage
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
    localStorage.setItem('topson_theme', 'light');
    testFirestoreConnection();
  }, []);

  // Current view page: always default to 'home' when user opens website
  const [currentPage, setCurrentPage] = useState<'home' | 'admin'>('home');

  // Active section for Scroll-Spy (Home, Tutorials, Community, Live Chat, Contact)
  const [activeNav, setActiveNav] = useState<NavSection>('home');

  // User Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('topson_user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u) {
          const uid = u.uid || u.id;
          return { ...u, id: uid, uid };
        }
        return null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'admin'>('signin');

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Interactive Videos state (Loaded dynamically via Firestore real-time listener)
  const [videoList, setVideoList] = useState<VideoItem[]>([]);

  // Interactive Community Feedbacks (Loaded dynamically via Firestore real-time listener)
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);

  // Inbound Email Messages to topsonkenedy@gmail.com
  const [emailMessages, setEmailMessages] = useState<EmailMessage[]>(() => {
    const saved = localStorage.getItem('topson_email_messages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  // Real-time Visitor & User Traffic Activities
  const [visitorActivities, setVisitorActivities] = useState<VisitorActivity[]>([]);

  const [totalVisitorsCount, setTotalVisitorsCount] = useState<number>(() => {
    const saved = localStorage.getItem('topson_visitor_count');
    return saved ? parseInt(saved, 10) : 1;
  });

  useEffect(() => {
    const incremented = sessionStorage.getItem('topson_visited');
    if (!incremented) {
      setTotalVisitorsCount((prev) => {
        const next = prev + 1;
        localStorage.setItem('topson_visitor_count', next.toString());
        return next;
      });
      sessionStorage.setItem('topson_visited', 'true');
    }

    if (currentUser?.id) {
      recordUserVisitInDb(currentUser.id).then((count) => {
        setCurrentUser((prev) => (prev ? { ...prev, visitsCount: count } : null));
      });
    }
  }, [currentUser?.id]);

  // Account Suspension Enforcement (Mandatory requirement):
  // Check if account has flag suspended: true in Firestore:
  // - Block login access immediately
  // - Trigger fullscreen notice: "Your account was suspended by Topson Media, you must call help center TM"
  const [isAccountSuspended, setIsAccountSuspended] = useState<boolean>(false);

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }
    const currentUid = currentUser.uid || currentUser.id;
    const unsub = subscribeToUserSuspension(currentUid, (suspended) => {
      if (suspended) {
        setIsAccountSuspended(true);
        setCurrentUser(null);
        localStorage.removeItem('topson_user');
        signOut(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, [currentUser?.id, currentUser?.uid]);

  // Interactive Live Chat Messages (Loaded dynamically via Firestore real-time listener)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Persistent sticky navbar state when scrolled past the full-screen integrated hero
  const [isScrolledPastHero, setIsScrolledPastHero] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      const heroEl = document.getElementById('hero-container');
      const threshold = heroEl ? heroEl.offsetHeight - 80 : 500;
      setIsScrolledPastHero(window.scrollY > threshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Real-time Firestore Subscriptions for Videos, Feedbacks, Messages, and Contact Submissions
  useEffect(() => {
    const unsubVideos = subscribeToVideos((vids) => {
      setVideoList(vids);
    });

    const unsubFeedbacks = subscribeToFeedbacks((fbs) => {
      setFeedbacks(fbs);
    });

    const unsubMessages = subscribeToMessages((msgs) => {
      setChatMessages(msgs);
    }, currentUser);

    const unsubContacts = subscribeToContactSubmissions((submissions) => {
      if (submissions && submissions.length > 0) {
        setEmailMessages(submissions);
        localStorage.setItem('topson_email_messages', JSON.stringify(submissions));
      }
    });

    return () => {
      unsubVideos();
      unsubFeedbacks();
      unsubMessages();
      unsubContacts();
    };
  }, [currentUser?.id, currentUser?.role]);

  // Ensure dark class is never present
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  // FIX INITIAL LOAD ROUTING BUG:
  // Ensure that when website loads or is refreshed, viewport strictly starts at the very top of Hero/Home
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    const hash = window.location.hash.toLowerCase();
    if (hash === '#admin') {
      return;
    }
    // Clean any unwanted contact or other hash that would auto-scroll the page
    if (hash && !hash.startsWith('#verify')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Toast notification for email verification success
  const [verificationToast, setVerificationToast] = useState<{ show: boolean; message: string } | null>(null);

  // Sync hash changes with page state & check incoming verification links
  useEffect(() => {
    const handleHashChange = async () => {
      const rawHash = window.location.hash;

      // Handle email verification links e.g. #verify?email=...&code=...&token=...
      if (rawHash.startsWith('#verify')) {
        const queryPart = rawHash.includes('?') ? rawHash.split('?')[1] : '';
        const params = new URLSearchParams(queryPart);
        const verifyEmail = params.get('email');
        const verifyCode = params.get('code');
        const verifyToken = params.get('token');

        if (verifyEmail && (verifyCode || verifyToken)) {
          const res = await verifyConfirmationEmail(verifyEmail, verifyToken || verifyCode || '');
          if (res.success && res.user) {
            setCurrentUser(res.user);
            setAuthModalOpen(false);
            setVerificationToast({
              show: true,
              message: `🎉 Real email verified! Welcome to Topson Media, ${res.user.username}! Your account is now active.`,
            });
            window.history.replaceState(null, '', window.location.pathname);
            setTimeout(() => {
              setVerificationToast(null);
            }, 6500);
            return;
          }
        }
      }

      const hash = rawHash.replace('#', '').toLowerCase();
      if (hash === 'admin') {
        setCurrentPage('admin');
        setActiveNav('admin');
      } else {
        setCurrentPage('home');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // SCROLL-SPY: Watches sections as user scrolls and marks related nav as active
  useEffect(() => {
    if (currentPage !== 'home') return;

    const sections: { id: string; nav: NavSection }[] = [
      { id: 'hero', nav: 'home' },
      { id: 'videos', nav: 'tutorials' },
      { id: 'community', nav: 'community' },
      { id: 'live-chat', nav: 'chat' },
      { id: 'contact-form', nav: 'contact' },
    ];

    const handleScroll = () => {
      if (window.scrollY < 120) {
        setActiveNav('home');
        return;
      }
      const scrollPos = window.scrollY + 220;

      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i].id);
        if (el) {
          const top = el.offsetTop;
          if (scrollPos >= top) {
            setActiveNav(sections[i].nav);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentPage]);

  // Smooth scroll handler to target section
  const scrollToTargetSection = (section: NavSection) => {
    if (section === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const mapping: Record<string, string> = {
      tutorials: 'videos',
      community: 'community',
      chat: 'live-chat',
      contact: 'contact-form',
    };

    const targetId = mapping[section];
    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Nav click handler: directs home to welcome page, contact to GET IN TOUCH section, etc.
  const handleNavClick = (section: NavSection) => {
    setActiveNav(section);

    if (section === 'admin') {
      setCurrentPage('admin');
      window.location.hash = '#admin';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (currentPage !== 'home') {
      setCurrentPage('home');
      window.location.hash = '';
      setTimeout(() => {
        scrollToTargetSection(section);
      }, 100);
    } else {
      scrollToTargetSection(section);
    }
  };

  // Persist user auth to localStorage
  const handleAuthSuccess = (user: User) => {
    const uid = user.uid || user.id;
    const normalizedUser = { ...user, id: uid, uid };
    setCurrentUser(normalizedUser);
    localStorage.setItem('topson_user', JSON.stringify(normalizedUser));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('topson_user');
    if (currentPage === 'admin') {
      setCurrentPage('home');
      window.location.hash = '';
    }
  };

  const handleOpenAuth = (mode: 'signin' | 'signup' | 'admin' = 'signin') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  // Add new feedback (persists to Firestore database & local state without duplicates)
  const handleAddFeedback = async (newFb: FeedbackItem) => {
    // If not already saved in Firestore (i.e. has temporary fallback id 'fb-'), persist it
    if (!newFb.id || newFb.id.startsWith('fb-')) {
      try {
        const generatedId = await addFeedbackToDb(newFb);
        newFb.id = generatedId;
      } catch (err) {
        console.warn('Firestore addFeedback fallback:', err);
      }
    }

    // Deduplicate in local state using unique Firestore document ID
    setFeedbacks((prev) => {
      if (prev.some((f) => f.id === newFb.id)) return prev;
      return [newFb, ...prev];
    });

    setVisitorActivities((prev) => [
      {
        id: 'act-' + Date.now(),
        type: 'comment',
        description: `New community review published by "${newFb.authorName}" (${newFb.rating} stars)`,
        timestamp: 'Just now',
        userIpOrName: newFb.authorName,
      },
      ...prev,
    ]);
  };

  // Delete feedback (Admin control, deletes from Firestore)
  const handleDeleteFeedback = async (feedbackId: string) => {
    try {
      await deleteFeedbackFromDb(feedbackId);
    } catch (err) {
      console.warn('Firestore deleteFeedback fallback:', err);
    }

    setVisitorActivities((prev) => [
      {
        id: 'act-' + Date.now(),
        type: 'comment',
        description: 'Admin deleted a feedback review',
        timestamp: 'Just now',
        userIpOrName: 'Admin Control',
      },
      ...prev,
    ]);
  };

  // Hide or unhide feedback (Admin moderation, updates Firestore)
  const handleHideFeedback = async (feedbackId: string, hidden: boolean) => {
    try {
      await hideFeedbackInDb(feedbackId, hidden);
    } catch (err) {
      console.warn('Firestore hideFeedback fallback:', err);
    }
  };

  // Inbound message sent to admin (topsonkenedy@gmail.com)
  const handleSendMessageToAdmin = (message: EmailMessage) => {
    const updated = [message, ...emailMessages];
    setEmailMessages(updated);
    localStorage.setItem('topson_email_messages', JSON.stringify(updated));

    setVisitorActivities((prev) => [
      {
        id: 'act-' + Date.now(),
        type: 'email',
        description: `Email inquiry received from "${message.senderName}" (${message.subject})`,
        timestamp: 'Just now',
        userIpOrName: message.senderName,
      },
      ...prev,
    ]);
  };

  // Admin reply to inbound message (will send via email & sync to Firestore)
  const handleReplyEmailMessage = async (emailId: string, replyText: string) => {
    try {
      await replyToContactSubmissionInDb(emailId, replyText);
    } catch (err) {
      console.warn('Firestore replyToContactSubmission fallback:', err);
    }

    setEmailMessages((prev) => {
      const updated = prev.map((msg) => {
        if (msg.id === emailId) {
          const currentReplies = msg.replies || [];
          return {
            ...msg,
            replies: [
              ...currentReplies,
              {
                id: 'rep-' + Date.now(),
                text: replyText,
                timestamp: 'Just now',
              },
            ],
          };
        }
        return msg;
      });
      localStorage.setItem('topson_email_messages', JSON.stringify(updated));
      return updated;
    });

    setVisitorActivities((prev) => [
      {
        id: 'act-' + Date.now(),
        type: 'email',
        description: 'Admin sent email reply to inquirer',
        timestamp: 'Just now',
        userIpOrName: 'Topson Media',
      },
      ...prev,
    ]);
  };

  // Strict Single-Click Toggle Like on Feedback Item (persisted to Firestore & local state)
  const handleToggleLikeFeedback = async (feedbackId: string) => {
    if (!currentUser) {
      setAuthMode('signin');
      setAuthModalOpen(true);
      return;
    }

    const userId = currentUser.id;
    let newLikes = 0;
    let isNowLiked = false;

    setFeedbacks((prev) => {
      const updated = prev.map((fb) => {
        if (fb.id === feedbackId) {
          const likedBy = Array.isArray(fb.likedBy) ? fb.likedBy : [];
          const currentlyLiked = likedBy.includes(userId) || !!fb.userLiked;
          isNowLiked = !currentlyLiked;
          const nextLikedBy = currentlyLiked
            ? likedBy.filter((id) => id !== userId)
            : [...likedBy, userId];
          const currentCount = typeof fb.likesCount === 'number' ? fb.likesCount : (typeof fb.likes === 'number' ? fb.likes : 0);
          newLikes = isNowLiked ? currentCount + 1 : Math.max(0, currentCount - 1);

          return {
            ...fb,
            likes: newLikes,
            likesCount: newLikes,
            likedBy: nextLikedBy,
            userLiked: isNowLiked,
          };
        }
        return fb;
      });
      return updated;
    });

    try {
      await toggleLikeFeedbackInDb(feedbackId, userId);
    } catch (err) {
      console.warn('Firestore toggleLike fallback:', err);
    }
  };

  // Add Reply to Feedback Item
  const handleAddReplyFeedback = (feedbackId: string, reply: import('./types').FeedbackReply) => {
    setFeedbacks((prev) => {
      const updated = prev.map((fb) => {
        if (fb.id === feedbackId) {
          return {
            ...fb,
            replies: [...(fb.replies || []), reply],
          };
        }
        return fb;
      });
      return updated;
    });
  };

  // Handle upload video (Admin only, persists to Firestore)
  const handleUploadVideo = async (newVid: VideoItem) => {
    try {
      await addVideoToDb(newVid);
    } catch (err) {
      console.warn('Firestore addVideo fallback:', err);
    }

    setVisitorActivities((prev) => [
      {
        id: 'act-' + Date.now(),
        type: 'watch',
        description: `Admin published new tutorial "${newVid.title}"`,
        timestamp: 'Just now',
        userIpOrName: 'Topson Media',
      },
      ...prev,
    ]);
  };

  // Handle delete video (Admin only, deletes from Firestore)
  const handleDeleteVideo = async (videoId: string) => {
    try {
      await deleteVideoFromDb(videoId);
    } catch (err) {
      console.warn('Firestore deleteVideo fallback:', err);
    }

    setVisitorActivities((prev) => [
      {
        id: 'act-' + Date.now(),
        type: 'watch',
        description: `Admin deleted tutorial`,
        timestamp: 'Just now',
        userIpOrName: 'Topson Media',
      },
      ...prev,
    ]);
  };

  // Handle update/edit video details (Admin only, updates Firestore)
  const handleUpdateVideo = async (updatedVid: VideoItem) => {
    try {
      await updateVideoInDb(updatedVid);
    } catch (err) {
      console.warn('Firestore updateVideo fallback:', err);
    }

    setVisitorActivities((prev) => [
      {
        id: 'act-' + Date.now(),
        type: 'watch',
        description: `Admin updated details for "${updatedVid.title}"`,
        timestamp: 'Just now',
        userIpOrName: 'Topson Media',
      },
      ...prev,
    ]);
  };

  // Handle user liking a video
  const handleToggleLikeVideo = async (videoId: string) => {
    const userId = currentUser?.id || 'guest-' + Date.now();
    setVideoList((prev) =>
      prev.map((vid) => {
        if (vid.id !== videoId) return vid;
        const likedBy = vid.likedBy || [];
        const isLiked = likedBy.includes(userId);
        const nextLikedBy = isLiked ? likedBy.filter((u) => u !== userId) : [...likedBy, userId];
        const nextLikes = Math.max(0, (vid.likes || 0) + (isLiked ? -1 : 1));
        return {
          ...vid,
          likes: nextLikes,
          likedBy: nextLikedBy,
        };
      })
    );

    try {
      await toggleLikeVideoInDb(videoId, userId);
    } catch (err) {
      console.warn('Firestore toggleLikeVideo fallback:', err);
    }
  };

  // Handle user adding comment to video
  const handleAddCommentToVideo = async (videoId: string, comment: VideoComment) => {
    setVideoList((prev) =>
      prev.map((vid) => {
        if (vid.id !== videoId) return vid;
        const comments = vid.comments || [];
        return {
          ...vid,
          comments: [comment, ...comments],
        };
      })
    );

    try {
      await addVideoCommentInDb(videoId, comment);
    } catch (err) {
      console.warn('Firestore addVideoComment fallback:', err);
    }
  };

  // Handle user watching/playing video to increment views (STRICT ONE ACCOUNT ONE VIEW)
  const handleIncrementVideoViews = async (videoId: string) => {
    let viewerId = currentUser?.id;
    if (!viewerId) {
      let guestDeviceId = localStorage.getItem('topson_guest_device_id');
      if (!guestDeviceId) {
        guestDeviceId = 'guest-' + Math.random().toString(36).substring(2, 10);
        localStorage.setItem('topson_guest_device_id', guestDeviceId);
      }
      viewerId = guestDeviceId;
    }

    // Sync and ensure videoId is stored in localStorage watchedVideos array
    try {
      const raw = localStorage.getItem('watchedVideos');
      const watchedVideos: string[] = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(watchedVideos) || !watchedVideos.includes(videoId)) {
        const nextWatched = Array.isArray(watchedVideos) ? [...watchedVideos, videoId] : [videoId];
        localStorage.setItem('watchedVideos', JSON.stringify(nextWatched));
      }
    } catch {
      // ignore
    }

    // Check if target video already viewed by this account/device
    const existingVid = videoList.find((v) => v.id === videoId);
    if (existingVid && existingVid.viewedBy?.includes(viewerId)) {
      // ONE ACCOUNT ONE VIEW: already viewed, ignore duplicate view
      return;
    }

    // Update local state first
    setVideoList((prev) =>
      prev.map((vid) => {
        if (vid.id !== videoId) return vid;
        const viewedBy = vid.viewedBy || [];
        if (viewedBy.includes(viewerId!)) return vid;
        const currentCount = vid.viewsCount || 0;
        const nextCount = currentCount + 1;
        const formatted =
          nextCount >= 1000 ? `${(nextCount / 1000).toFixed(1)}K views` : `${nextCount} views`;
        return {
          ...vid,
          viewsCount: nextCount,
          views: formatted,
          viewedBy: [...viewedBy, viewerId!],
        };
      })
    );

    try {
      const result = await incrementVideoViewsInDb(videoId, viewerId);
      if (result.viewed) {
        setVideoList((prev) =>
          prev.map((vid) => {
            if (vid.id !== videoId) return vid;
            const formatted =
              result.viewsCount >= 1000
                ? `${(result.viewsCount / 1000).toFixed(1)}K views`
                : `${result.viewsCount} views`;
            return {
              ...vid,
              viewsCount: result.viewsCount,
              views: formatted,
            };
          })
        );
      }
    } catch (err) {
      console.warn('Firestore incrementViews fallback:', err);
    }
  };

  // User accepts the Top Fan Badge awarded by Admin
  const handleAcceptFanBadge = async () => {
    if (!currentUser) return;
    const updatedUser: User = {
      ...currentUser,
      fanBadge: true,
      fanBadgeOffered: false,
    };
    setCurrentUser(updatedUser);
    localStorage.setItem('topson_user', JSON.stringify(updatedUser));

    try {
      await acceptFanBadgeInDb(currentUser.id);
    } catch (err) {
      console.warn('Firestore acceptFanBadge fallback:', err);
    }

    setVerificationToast({
      show: true,
      message: '⭐ Congratulations! You are now an official Top Fan. Your badge is displayed on your profile, comments, and reviews!',
    });
  };

  // Handle user sending chat message (hits Firestore real-time collection)
  const handleSendMessage = async (msg: ChatMessage) => {
    try {
      await sendMessageToDb(msg);
    } catch (err) {
      console.warn('Firestore sendMessage fallback:', err);
    }
  };

  // Handle delete or un-send message (deletes from Firestore)
  const handleDeleteChatMessage = async (msgId: string, _mode: 'everyone' | 'me') => {
    try {
      await deleteMessageFromDb(msgId);
    } catch (err) {
      console.warn('Firestore deleteMessage fallback:', err);
    }
  };

  // Handle marking messages as read in Firestore
  const handleMarkMessagesRead = async (ids: string[]) => {
    try {
      await markMessagesReadInDb(ids);
    } catch (err) {
      console.warn('Firestore markMessagesRead fallback:', err);
    }
  };

  // Calculate matching items count for search indicator in Video Gallery
  const matchingCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    const q = searchQuery.toLowerCase();
    return videoList.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.tags.some((t) => t.toLowerCase().includes(q))
    ).length;
  }, [searchQuery, videoList]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-white text-neutral-900 font-sans selection:bg-orange-500 selection:text-white flex flex-col justify-between relative">
      <div>
        {/* Persistent sticky navigation when scrolled past the full-screen hero or in admin view */}
        {(isScrolledPastHero || currentPage === 'admin') && (
          <div className="fixed top-0 left-0 right-0 z-50 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm bg-white/95 backdrop-blur-md">
            <Navbar
              currentUser={currentUser}
              onOpenAuth={handleOpenAuth}
              onLogout={handleLogout}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              matchingCount={matchingCount}
              activeNav={activeNav}
              onNavClick={handleNavClick}
            />
          </div>
        )}

        {/* Real Email Verification Success Toast */}
        {verificationToast?.show && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[92%] animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="p-4 rounded-2xl bg-emerald-600 text-white shadow-xl shadow-emerald-900/20 border border-emerald-500 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">🎉</span>
                <p className="text-xs sm:text-sm font-bold leading-snug">
                  {verificationToast.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVerificationToast(null)}
                className="p-1 hover:bg-emerald-700 rounded-lg text-white/80 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main>
          {currentPage === 'home' ? (
            /* ALL SECTIONS INTEGRATED ON MAIN FLOW (Scrollable, with Scroll-Spy) */
            <div className="animate-in fade-in">
              {/* 1. ELIMINATE EMPTY VERTICAL SPACE & REVEAL "ABOUT ME" (Tablet & Laptop):
                  Tightly wrapped dynamic height min-h-[85vh] or h-auto with clean padding.
                  No empty layout spacers or huge margins; pulls About Me directly upward into the viewport. */}
              <div
                id="hero-container"
                className="w-full min-h-[85vh] h-auto flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#0e0e12] to-[#050507] relative pb-6 sm:pb-8 md:pb-10"
              >
                {/* Position the Navbar at the very top relative with clean layout padding */}
                <div className="w-full relative z-40 pt-1.5 sm:pt-2 md:pt-3 px-2 sm:px-4 md:px-6 lg:px-8">
                  <Navbar
                    currentUser={currentUser}
                    onOpenAuth={handleOpenAuth}
                    onLogout={handleLogout}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    matchingCount={matchingCount}
                    activeNav={activeNav}
                    onNavClick={handleNavClick}
                    integratedDark={true}
                  />
                </div>

                {/* Welcome Section content tightly wrapped so About Me is immediately visible on screen */}
                <div className="flex-1 flex flex-col justify-center items-center w-full">
                  <Hero
                    onWatchTutorials={() => handleNavClick('tutorials')}
                    onLiveChat={() => handleNavClick('chat')}
                    onExploreScroll={() => {
                      const el = document.getElementById('about');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    isFullScreenIntegrated={true}
                  />
                </div>
              </div>

              {/* About / Mission Section */}
              <AboutSection
                onExploreTutorials={() => handleNavClick('tutorials')}
              />

              {/* Video Gallery Section (Tutorials) */}
              <VideoGallery
                videos={videoList}
                searchQuery={searchQuery}
                currentUser={currentUser}
                onOpenAdminAuth={() => handleOpenAuth('admin')}
                onUploadVideo={handleUploadVideo}
                onDeleteVideo={handleDeleteVideo}
                onUpdateVideo={handleUpdateVideo}
                onLikeVideo={handleToggleLikeVideo}
                onAddComment={handleAddCommentToVideo}
                onIncrementViews={handleIncrementVideoViews}
              />

              {/* Community Feedback Section (Unified Card) */}
              <CommunitySection
                feedbacks={feedbacks}
                currentUser={currentUser}
                onOpenAuth={() => handleOpenAuth('signup')}
                onSubmitFeedback={handleAddFeedback}
                onToggleLikeFeedback={handleToggleLikeFeedback}
                onAddReplyFeedback={handleAddReplyFeedback}
                onDeleteFeedback={handleDeleteFeedback}
                onHideFeedback={handleHideFeedback}
              />

              {/* Live Chat Section */}
              <LiveChat
                currentUser={currentUser}
                onOpenAuth={() => handleOpenAuth('signin')}
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                onMarkMessagesRead={handleMarkMessagesRead}
                onDeleteMessage={handleDeleteChatMessage}
              />

              {/* GET IN TOUCH Contact Section (Email chatting) */}
              <ContactSection
                onJumpToChat={() => handleNavClick('chat')}
                onSendMessageToAdmin={handleSendMessageToAdmin}
              />

              {/* CONNECT ON SOCIAL: Placed directly after email chatting as requested */}
              <PlatformsSection />
            </div>
          ) : (
            /* ADMIN CREATOR STUDIO (Exclusively for admin account) */
            <div className="animate-in fade-in">
              <AdminDashboard
                currentUser={currentUser}
                videos={videoList}
                feedbacks={feedbacks}
                emailMessages={emailMessages}
                visitorActivities={visitorActivities}
                totalVisitorsCount={totalVisitorsCount}
                chatMessages={chatMessages}
                onSendMessage={handleSendMessage}
                onDeleteChatMessage={handleDeleteChatMessage}
                onMarkMessagesRead={handleMarkMessagesRead}
                onUploadVideo={handleUploadVideo}
                onDeleteVideo={handleDeleteVideo}
                onUpdateVideo={handleUpdateVideo}
                onDeleteFeedback={handleDeleteFeedback}
                onHideFeedback={handleHideFeedback}
                onReplyEmailMessage={handleReplyEmailMessage}
                onAdminLogin={() => handleOpenAuth('admin')}
                onNavigateHome={() => handleNavClick('home')}
              />
            </div>
          )}
        </main>
      </div>

      {/* Top Fan Badge Acceptance Banner (Awarded by Admin) */}
      {currentUser?.fanBadgeOffered && !currentUser.fanBadge && (
        <div className="fixed bottom-5 right-4 sm:right-6 z-50 max-w-sm w-[92%] p-4 sm:p-5 rounded-3xl bg-neutral-950 text-white shadow-2xl border-2 border-amber-400 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400 text-amber-400 flex items-center justify-center shrink-0 text-xl shadow-xs">
              ⭐
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Top Fan Award</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-white mt-0.5">Topson Media Fan Badge</h4>
              <p className="text-[11px] text-neutral-300 mt-1 leading-snug">
                Congratulations, <span className="font-bold text-white">{currentUser.username}</span>! Topson Media has awarded you an official Top Fan Badge for your activity.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAcceptFanBadge}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-neutral-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1"
                >
                  <span>Accept Badge ⭐</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentUser((prev) => (prev ? { ...prev, fanBadgeOffered: false } : null));
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Footer */}
      <Footer />

      {/* Mandatory Account Suspension Fullscreen Notice */}
      {isAccountSuspended && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-red-500 rounded-3xl p-6 sm:p-8 text-center text-white shadow-[0_0_50px_rgba(239,68,68,0.4)] relative">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 text-red-500 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <svg className="w-8 h-8 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>

            <h3 className="text-xl font-black text-white tracking-tight mb-2">
              Account Suspended
            </h3>

            <p className="text-sm font-bold text-red-200 bg-red-950/60 border border-red-800/80 rounded-2xl p-4 mb-6 leading-relaxed">
              &ldquo;Your account was suspended by Topson Media, you must call help center TM&rdquo;
            </p>

            <div className="space-y-3">
              <a
                href="tel:+250794903078"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/30 cursor-pointer"
              >
                <span>📞 Call Help Center TM (0794903078)</span>
              </a>

              <a
                href="https://wa.me/250794903078?text=Hello%20Topson%20Media%20Help%20Center%2C%20my%20account%20was%20suspended"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <span>WhatsApp Help Center TM</span>
              </a>

              <button
                type="button"
                onClick={() => setIsAccountSuspended(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Close Notice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Glassmorphic Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        initialMode={authMode}
      />
    </div>
  );
}
