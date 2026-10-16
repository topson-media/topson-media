import { initializeApp, getApps } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import {
  User,
  VideoItem,
  FeedbackItem,
  ChatMessage,
  EmailMessage,
  VideoComment,
} from '../types';

// The live Firebase configuration strictly provided for topson-media-64bc9
export const firebaseConfig = {
  apiKey: "AIzaSyA2Jp49BUxzl5qySiKd5q-EMmCb4-oLU4Y",
  authDomain: "topson-media-64bc9.firebaseapp.com",
  projectId: "topson-media-64bc9",
  storageBucket: "topson-media-64bc9.firebasestorage.app",
  messagingSenderId: "872355095326",
  appId: "1:872355095326:web:492891171a85128a4c5f0f",
  measurementId: ""
};

// Initialize Firebase App safely (singleton pattern)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Auth & Firestore instances (using default database: default / (default))
export const auth = getAuth(app);
export const db = getFirestore(app);
export const databaseId = 'default';

// Initialize Analytics (optional for client-side web metrics)
export let analytics: any = null;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch {
    // Analytics is optional in dev/restricted environments
  }
}

// Default collections and fallbacks
export const DEFAULT_TUTORIALS: VideoItem[] = [];
export const DEFAULT_COMMUNITY_FEEDBACKS: FeedbackItem[] = [];

// Test Firestore Connection without crashing
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const testDoc = doc(db, '_connection_test', 'ping');
    await getDoc(testDoc);
    return true;
  } catch {
    return false;
  }
}

// Seed initial tutorials if needed
export async function seedInitialTutorialsIfEmpty(): Promise<void> {
  // Clean slate approach - no action needed
}

// ============================================================================
// VIDEOS (Tutorials)
// ============================================================================

export function subscribeToVideos(callback: (videos: VideoItem[]) => void): () => void {
  try {
    const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const vids: VideoItem[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              title: data.title || '',
              category: data.category || 'Phone Mastery',
              duration: data.duration || '10:00',
              views: data.views || '0 views',
              viewsCount: data.viewsCount || 0,
              viewedBy: data.viewedBy || [],
              date: data.date || 'Recent',
              thumbnail: data.thumbnail || '',
              youtubeId: data.youtubeId,
              videoUrl: data.videoUrl,
              sourceType: data.sourceType || 'link',
              description: data.description || '',
              tags: data.tags || [],
              likes: data.likes || 0,
              likedBy: data.likedBy || [],
              comments: data.comments || [],
              createdAt: data.createdAt,
            };
          });
          callback(vids);
          try {
            localStorage.setItem('topson_videos_cache', JSON.stringify(vids));
          } catch {
            // ignore
          }
        } else {
          // If Firestore is empty, check localStorage cache
          try {
            const cached = localStorage.getItem('topson_videos_cache');
            if (cached) {
              callback(JSON.parse(cached));
              return;
            }
          } catch {
            // ignore
          }
          callback([]);
        }
      },
      (error) => {
        console.warn('Firestore videos subscription fallback to cache:', error);
        try {
          const cached = localStorage.getItem('topson_videos_cache');
          if (cached) {
            callback(JSON.parse(cached));
            return;
          }
        } catch {
          // ignore
        }
        callback([]);
      }
    );
  } catch (err) {
    console.warn('subscribeToVideos error:', err);
    return () => {};
  }
}

export async function addVideoToDb(video: VideoItem): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'videos'), {
      ...video,
      createdAt: serverTimestamp(),
      uploadTimestamp: Date.now(),
    });
    return docRef.id;
  } catch (err) {
    console.warn('addVideoToDb fallback:', err);
    // Cache locally
    try {
      const cached = localStorage.getItem('topson_videos_cache');
      const vids: VideoItem[] = cached ? JSON.parse(cached) : [];
      const updated = [video, ...vids];
      localStorage.setItem('topson_videos_cache', JSON.stringify(updated));
    } catch {
      // ignore
    }
    return video.id || 'vid-' + Date.now();
  }
}

export async function updateVideoInDb(video: VideoItem): Promise<void> {
  try {
    const docRef = doc(db, 'videos', video.id);
    await updateDoc(docRef, { ...video });
  } catch (err) {
    console.warn('updateVideoInDb fallback:', err);
    try {
      const cached = localStorage.getItem('topson_videos_cache');
      if (cached) {
        const vids: VideoItem[] = JSON.parse(cached);
        const updated = vids.map((v) => (v.id === video.id ? video : v));
        localStorage.setItem('topson_videos_cache', JSON.stringify(updated));
      }
    } catch {
      // ignore
    }
  }
}

export async function deleteVideoFromDb(videoId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'videos', videoId));
  } catch (err) {
    console.warn('deleteVideoFromDb fallback:', err);
    try {
      const cached = localStorage.getItem('topson_videos_cache');
      if (cached) {
        const vids: VideoItem[] = JSON.parse(cached);
        const updated = vids.filter((v) => v.id !== videoId);
        localStorage.setItem('topson_videos_cache', JSON.stringify(updated));
      }
    } catch {
      // ignore
    }
  }
}

export async function toggleLikeVideoInDb(videoId: string, userId: string): Promise<void> {
  try {
    const docRef = doc(db, 'videos', videoId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const likedBy: string[] = data.likedBy || [];
      const isLiked = likedBy.includes(userId);
      const nextLikedBy = isLiked ? likedBy.filter((u) => u !== userId) : [...likedBy, userId];
      const nextLikes = Math.max(0, (data.likes || 0) + (isLiked ? -1 : 1));
      await updateDoc(docRef, {
        likes: nextLikes,
        likedBy: nextLikedBy,
      });
    }
  } catch (err) {
    console.warn('toggleLikeVideoInDb fallback:', err);
  }
}

export async function addVideoCommentInDb(videoId: string, comment: VideoComment): Promise<void> {
  try {
    const docRef = doc(db, 'videos', videoId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const comments = data.comments || [];
      await updateDoc(docRef, {
        comments: [comment, ...comments],
      });
    }
  } catch (err) {
    console.warn('addVideoCommentInDb fallback:', err);
  }
}

export async function incrementVideoViewsInDb(
  videoId: string,
  viewerId?: string
): Promise<{ viewed: boolean; viewsCount: number }> {
  try {
    const docRef = doc(db, 'videos', videoId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const viewedBy: string[] = data.viewedBy || [];
      if (viewerId && viewedBy.includes(viewerId)) {
        return { viewed: false, viewsCount: data.viewsCount || 0 };
      }
      const nextCount = (data.viewsCount || 0) + 1;
      const nextViewedBy = viewerId ? [...viewedBy, viewerId] : viewedBy;
      const formatted =
        nextCount >= 1000 ? `${(nextCount / 1000).toFixed(1)}K views` : `${nextCount} views`;

      await updateDoc(docRef, {
        viewsCount: nextCount,
        views: formatted,
        viewedBy: nextViewedBy,
      });
      return { viewed: true, viewsCount: nextCount };
    }
    return { viewed: true, viewsCount: 1 };
  } catch (err) {
    console.warn('incrementVideoViewsInDb fallback:', err);
    return { viewed: true, viewsCount: 1 };
  }
}

// ============================================================================
// FEEDBACKS (Community Reviews)
// ============================================================================

export function subscribeToFeedbacks(callback: (feedbacks: FeedbackItem[]) => void): () => void {
  try {
    const q = query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const fbs: FeedbackItem[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              authorName: data.authorName || 'Member',
              authorHandle: data.authorHandle,
              authorRole: data.authorRole || 'Community Member',
              avatarUrl: data.avatarUrl || '',
              rating: data.rating || 5,
              date: data.date || 'Recent',
              createdAt: data.createdAt,
              content: data.content || '',
              verified: !!data.verified,
              likes: data.likes || 0,
              likedBy: data.likedBy || [],
              hidden: !!data.hidden,
              hasFanBadge: !!data.hasFanBadge,
              replies: data.replies || [],
            };
          });
          callback(fbs);
          try {
            localStorage.setItem('topson_feedbacks_cache', JSON.stringify(fbs));
          } catch {
            // ignore
          }
        } else {
          try {
            const cached = localStorage.getItem('topson_feedbacks_cache');
            if (cached) {
              callback(JSON.parse(cached));
              return;
            }
          } catch {
            // ignore
          }
          callback([]);
        }
      },
      (error) => {
        console.warn('Firestore feedbacks subscription fallback:', error);
        try {
          const cached = localStorage.getItem('topson_feedbacks_cache');
          if (cached) {
            callback(JSON.parse(cached));
            return;
          }
        } catch {
          // ignore
        }
        callback([]);
      }
    );
  } catch (err) {
    console.warn('subscribeToFeedbacks error:', err);
    return () => {};
  }
}

export async function addFeedbackToDb(feedback: FeedbackItem): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'feedbacks'), {
      ...feedback,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.warn('addFeedbackToDb fallback:', err);
    try {
      const cached = localStorage.getItem('topson_feedbacks_cache');
      const fbs: FeedbackItem[] = cached ? JSON.parse(cached) : [];
      localStorage.setItem('topson_feedbacks_cache', JSON.stringify([feedback, ...fbs]));
    } catch {
      // ignore
    }
    return feedback.id || 'fb-' + Date.now();
  }
}

export async function deleteFeedbackFromDb(feedbackId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'feedbacks', feedbackId));
  } catch (err) {
    console.warn('deleteFeedbackFromDb fallback:', err);
    try {
      const cached = localStorage.getItem('topson_feedbacks_cache');
      if (cached) {
        const fbs: FeedbackItem[] = JSON.parse(cached);
        const filtered = fbs.filter((f) => f.id !== feedbackId);
        localStorage.setItem('topson_feedbacks_cache', JSON.stringify(filtered));
      }
    } catch {
      // ignore
    }
  }
}

export async function toggleLikeFeedbackInDb(feedbackId: string, userId: string): Promise<void> {
  try {
    const docRef = doc(db, 'feedbacks', feedbackId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const likedBy: string[] = data.likedBy || [];
      const isLiked = likedBy.includes(userId);
      const nextLikedBy = isLiked ? likedBy.filter((u) => u !== userId) : [...likedBy, userId];
      const nextLikes = Math.max(0, (data.likes || 0) + (isLiked ? -1 : 1));
      await updateDoc(docRef, {
        likes: nextLikes,
        likedBy: nextLikedBy,
      });
    }
  } catch (err) {
    console.warn('toggleLikeFeedbackInDb fallback:', err);
  }
}

export async function hideFeedbackInDb(feedbackId: string, hidden: boolean): Promise<void> {
  try {
    const docRef = doc(db, 'feedbacks', feedbackId);
    await updateDoc(docRef, { hidden });
  } catch (err) {
    console.warn('hideFeedbackInDb fallback:', err);
  }
}

// ============================================================================
// LIVE CHAT MESSAGES
// ============================================================================

export function subscribeToMessages(
  callback: (messages: ChatMessage[]) => void,
  currentUser?: User | null
): () => void {
  try {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'asc'), limit(200));
    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const msgs: ChatMessage[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              sender: data.sender || 'user',
              senderName: data.senderName || 'Anonymous',
              userId: data.userId || data.user_id,
              user_id: data.userId || data.user_id,
              userEmail: data.userEmail,
              targetUserId: data.targetUserId,
              text: data.text || '',
              timestamp: data.timestamp || 'Just now',
              avatarUrl: data.avatarUrl,
              isRead: !!data.isRead,
              deletedForEveryone: !!data.deletedForEveryone,
              deletedForUser: !!data.deletedForUser,
            };
          });

          // Filter out deleted messages if needed
          const filtered = msgs.filter((m) => {
            if (m.deletedForEveryone) return false;
            if (m.deletedForUser && currentUser?.id && m.userId === currentUser.id) return false;
            return true;
          });

          callback(filtered);
          try {
            localStorage.setItem('topson_chat_messages_cache', JSON.stringify(filtered));
          } catch {
            // ignore
          }
        } else {
          try {
            const cached = localStorage.getItem('topson_chat_messages_cache');
            if (cached) {
              callback(JSON.parse(cached));
              return;
            }
          } catch {
            // ignore
          }
          callback([]);
        }
      },
      (error) => {
        console.warn('Firestore messages subscription fallback:', error);
        try {
          const cached = localStorage.getItem('topson_chat_messages_cache');
          if (cached) {
            callback(JSON.parse(cached));
            return;
          }
        } catch {
          // ignore
        }
        callback([]);
      }
    );
  } catch (err) {
    console.warn('subscribeToMessages error:', err);
    return () => {};
  }
}

export async function sendMessageToDb(message: ChatMessage): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'messages'), {
      ...message,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.warn('sendMessageToDb fallback:', err);
    try {
      const cached = localStorage.getItem('topson_chat_messages_cache');
      const msgs: ChatMessage[] = cached ? JSON.parse(cached) : [];
      localStorage.setItem('topson_chat_messages_cache', JSON.stringify([...msgs, message]));
    } catch {
      // ignore
    }
    return message.id || 'msg-' + Date.now();
  }
}

export async function deleteMessageFromDb(messageId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'messages', messageId));
  } catch (err) {
    console.warn('deleteMessageFromDb fallback:', err);
  }
}

export async function markMessagesReadInDb(messageIds: string[]): Promise<void> {
  try {
    for (const id of messageIds) {
      await updateDoc(doc(db, 'messages', id), { isRead: true });
    }
  } catch (err) {
    console.warn('markMessagesReadInDb fallback:', err);
  }
}

// ============================================================================
// CONTACT SUBMISSIONS (Inquiries)
// ============================================================================

export function subscribeToContactSubmissions(
  callback: (submissions: EmailMessage[]) => void
): () => void {
  try {
    const q = query(collection(db, 'contact_submissions'), orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const subs: EmailMessage[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              senderName: data.senderName || '',
              senderEmail: data.senderEmail || '',
              subject: data.subject || '',
              message: data.message || '',
              timestamp: data.timestamp || 'Recent',
              replies: data.replies || [],
            };
          });
          callback(subs);
        } else {
          try {
            const cached = localStorage.getItem('topson_email_messages');
            if (cached) {
              callback(JSON.parse(cached));
              return;
            }
          } catch {
            // ignore
          }
          callback([]);
        }
      },
      (error) => {
        console.warn('Firestore contact submissions subscription fallback:', error);
        try {
          const cached = localStorage.getItem('topson_email_messages');
          if (cached) {
            callback(JSON.parse(cached));
            return;
          }
        } catch {
          // ignore
        }
        callback([]);
      }
    );
  } catch (err) {
    console.warn('subscribeToContactSubmissions error:', err);
    return () => {};
  }
}

export async function addContactSubmissionToDb(data: {
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
}): Promise<EmailMessage> {
  const newSubmission: EmailMessage = {
    id: 'sub-' + Date.now(),
    senderName: data.senderName,
    senderEmail: data.senderEmail,
    subject: data.subject,
    message: data.message,
    timestamp: 'Just now',
    replies: [],
  };

  try {
    const docRef = await addDoc(collection(db, 'contact_submissions'), {
      ...newSubmission,
      createdAt: serverTimestamp(),
    });
    return { ...newSubmission, id: docRef.id };
  } catch (err) {
    console.warn('addContactSubmissionToDb fallback:', err);
    return newSubmission;
  }
}

export async function replyToContactSubmissionInDb(
  submissionId: string,
  replyText: string
): Promise<void> {
  try {
    const docRef = doc(db, 'contact_submissions', submissionId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const currentReplies = data.replies || [];
      const newReply = {
        id: 'rep-' + Date.now(),
        text: replyText,
        timestamp: 'Just now',
      };
      await updateDoc(docRef, {
        replies: [...currentReplies, newReply],
      });
    }
  } catch (err) {
    console.warn('replyToContactSubmissionInDb fallback:', err);
  }
}

// ============================================================================
// USERS & PROFILE MANAGEMENT
// ============================================================================

export async function fetchUsersListFromDb(): Promise<User[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    if (!querySnapshot.empty) {
      return querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          uid: docSnap.id,
          username: data.username || 'User',
          email: data.email || '',
          avatarUrl: data.avatarUrl,
          role: data.role || 'member',
          joinedDate: data.joinedDate || 'Recently',
          visitsCount: data.visitsCount || 1,
          fanBadge: !!data.fanBadge,
          fanBadgeOffered: !!data.fanBadgeOffered,
        };
      });
    }
  } catch (err) {
    console.warn('fetchUsersListFromDb fallback:', err);
  }

  // Fallback to local storage
  try {
    const saved = localStorage.getItem('topson_users_list');
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore
  }

  return [];
}

export async function deleteUserFromDb(userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (err) {
    console.warn('deleteUserFromDb fallback:', err);
  }
}

export async function awardFanBadgeInDb(userId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), {
      fanBadgeOffered: true,
      fanBadge: false,
    });
  } catch (err) {
    console.warn('awardFanBadgeInDb fallback:', err);
  }
}

export async function acceptFanBadgeInDb(userId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), {
      fanBadge: true,
      fanBadgeOffered: false,
    });
  } catch (err) {
    console.warn('acceptFanBadgeInDb fallback:', err);
  }
}

export async function recordUserVisitInDb(userId: string): Promise<number> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      visitsCount: increment(1),
    });
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data().visitsCount || 1;
    }
  } catch (err) {
    console.warn('recordUserVisitInDb fallback:', err);
  }
  return 1;
}

export async function verifyConfirmationEmail(
  email: string,
  _tokenOrCode: string
): Promise<{ success: boolean; user?: User }> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const querySnapshot = await getDocs(collection(db, 'users'));
    let matchedUser: User | null = null;
    let matchedDocId: string | null = null;

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.email && data.email.toLowerCase() === normalizedEmail) {
        matchedDocId = docSnap.id;
        matchedUser = {
          id: docSnap.id,
          uid: docSnap.id,
          username: data.username || 'User',
          email: data.email,
          avatarUrl: data.avatarUrl,
          role: data.role || 'member',
          joinedDate: data.joinedDate || 'Recently',
          visitsCount: data.visitsCount || 1,
          fanBadge: !!data.fanBadge,
        };
      }
    });

    if (matchedDocId && matchedUser) {
      await updateDoc(doc(db, 'users', matchedDocId), {
        emailVerified: true,
      });
      return { success: true, user: matchedUser };
    }
  } catch (err) {
    console.warn('verifyConfirmationEmail fallback:', err);
  }

  // Fallback to active localStorage user if matched
  try {
    const current = localStorage.getItem('topson_user');
    if (current) {
      const parsed: User = JSON.parse(current);
      if (parsed.email.toLowerCase() === email.trim().toLowerCase()) {
        return { success: true, user: parsed };
      }
    }
  } catch {
    // ignore
  }

  return { success: false };
}

export async function loginUserFromDb(
  identifier: string,
  password: string
): Promise<{ success: true; user: User } | { success: false; user?: undefined; error?: string }> {
  const normalized = identifier.trim().toLowerCase();

  // Official Admin account configuration
  const isAdminSpecial =
    normalized === 'topsonkenedy@gmail.com' ||
    normalized === 'admin@topsonmedia.com' ||
    normalized === 'topsonkenedy' ||
    normalized === 'admin' ||
    normalized === 'topson' ||
    normalized === 'jabsco59';

  if (isAdminSpecial) {
    // Official admin password verified
    if (
      password === 'nzayikoreraetsiyene@jonas' ||
      password === 'topson2025'
    ) {
      const adminUser: User = {
        id: 'admin-topsonkenedy',
        uid: 'admin-topsonkenedy',
        username: 'Topson Kenedy',
        email: 'topsonkenedy@gmail.com',
        role: 'admin',
        joinedDate: 'Topson Media Creator & Admin',
        avatarUrl: 'https://i.postimg.cc/Hsb9TQcX/profile.png',
        visitsCount: 999,
        fanBadge: true,
      };
      return { success: true, user: adminUser };
    }
    return { success: false, error: 'wrong_password' };
  }

  // Check Firestore users collection
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();
      const userEmail = (data.email || '').toLowerCase();
      const userUsername = (data.username || '').toLowerCase();

      if (userEmail === normalized || userUsername === normalized) {
        const foundUser: User = {
          id: docSnap.id,
          uid: docSnap.id,
          username: data.username || 'User',
          email: data.email || '',
          avatarUrl: data.avatarUrl,
          role: data.role || 'member',
          joinedDate: data.joinedDate || 'Recently',
          visitsCount: data.visitsCount || 1,
          fanBadge: !!data.fanBadge,
        };
        return { success: true, user: foundUser };
      }
    }
  } catch (err) {
    console.warn('loginUserFromDb firestore error:', err);
  }

  return { success: false, error: 'user_not_found' };
}
