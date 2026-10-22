import { initializeApp, getApps } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, updateProfile, updatePassword, signOut } from 'firebase/auth';
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
  where,
  addDoc,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
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

export function extractYouTubeId(url?: string): string | null {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

export function getYouTubeThumbnail(urlOrId?: string): string | null {
  if (!urlOrId) return null;
  const id = extractYouTubeId(urlOrId) || (urlOrId.length === 11 ? urlOrId : null);
  if (id) {
    return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  }
  return null;
}

export function subscribeToVideos(callback: (videos: VideoItem[]) => void): () => void {
  try {
    const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const vids: VideoItem[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            const rawUrl = data.videoUrl || data.video_url || '';
            const detectedYtId = data.youtubeId || data.youtube_id || extractYouTubeId(rawUrl);
            const resolvedThumbnail =
              data.thumbnail ||
              (detectedYtId ? getYouTubeThumbnail(detectedYtId) : '') ||
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';

            return {
              id: docSnap.id,
              title: data.title || 'Untitled Tutorial',
              category: data.category || 'Phone Mastery',
              duration: data.duration || '10:00',
              views: data.views || '0 views',
              viewsCount: data.viewsCount || 0,
              viewedBy: data.viewedBy || [],
              date: data.date || 'Recent',
              thumbnail: resolvedThumbnail,
              youtubeId: detectedYtId || undefined,
              videoUrl: rawUrl || (detectedYtId ? `https://www.youtube.com/watch?v=${detectedYtId}` : ''),
              sourceType: data.sourceType || 'link',
              description: data.description || '',
              tags: Array.isArray(data.tags) ? data.tags : [],
              likes: data.likes || data.likesCount || 0,
              likedBy: data.likedBy || [],
              comments: data.comments || [],
              createdAt: data.createdAt || data.created_at,
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

export async function toggleLikeVideoInDb(videoId: string, userId: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'videos', videoId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const likedBy: string[] = data.likedBy || [];
      const isLiked = likedBy.includes(userId);
      if (!isLiked) {
        await updateDoc(docRef, {
          likedBy: arrayUnion(userId),
          likes: increment(1),
          likesCount: increment(1),
        });
        return true;
      } else {
        await updateDoc(docRef, {
          likedBy: arrayRemove(userId),
          likes: increment(-1),
          likesCount: increment(-1),
        });
        return false;
      }
    }
    return false;
  } catch (err) {
    console.warn('toggleLikeVideoInDb fallback:', err);
    return false;
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
            const createdTime = data.createdAt
              ? (typeof data.createdAt?.toMillis === 'function' ? data.createdAt.toMillis() : data.createdAt)
              : (data.created_at ? (data.created_at instanceof Date ? data.created_at.getTime() : (typeof data.created_at?.toMillis === 'function' ? data.created_at.toMillis() : Date.now())) : Date.now());

            const likedByList: string[] = Array.isArray(data.likedBy) ? data.likedBy : [];
            const realLikesCount =
              data.likesCount !== undefined
                ? data.likesCount
                : (likedByList.length > 0 ? likedByList.length : (data.likes || 0));

            return {
              id: docSnap.id,
              authorName: data.authorName || data.user || 'Member',
              authorHandle: data.authorHandle || (data.user ? `@${data.user.toLowerCase().replace(/\s+/g, '')}` : undefined),
              authorRole: data.authorRole || 'Community Member',
              avatarUrl: data.avatarUrl || '',
              rating: data.rating || 5,
              date: data.date || 'Recent',
              createdAt: createdTime,
              content: data.content || data.text || '',
              verified: data.verified !== undefined ? !!data.verified : true,
              likes: realLikesCount,
              likesCount: realLikesCount,
              hidden: !!data.hidden,
              hasFanBadge: !!data.hasFanBadge,
              isTopFan: !!data.isTopFan,
              isPinned: !!data.isPinned,
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

export async function toggleLikeFeedbackInDb(feedbackId: string, userId: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'feedbacks', feedbackId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const likedBy: string[] = Array.isArray(data.likedBy) ? data.likedBy : [];
      const isAlreadyLiked = likedBy.includes(userId);

      if (!isAlreadyLiked) {
        // User is not in likedBy: push user ID using arrayUnion and increment likes/likesCount by +1
        await updateDoc(docRef, {
          likedBy: arrayUnion(userId),
          likesCount: increment(1),
          likes: increment(1),
        });
        return true;
      } else {
        // Toggle decrement using arrayRemove and decrement by -1
        await updateDoc(docRef, {
          likedBy: arrayRemove(userId),
          likesCount: increment(-1),
          likes: increment(-1),
        });
        return false;
      }
    }
    return false;
  } catch (err) {
    console.warn('toggleLikeFeedbackInDb atomic update fallback:', err);
    return false;
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

export async function togglePinFeedbackInDb(feedbackId: string, isPinned: boolean): Promise<void> {
  try {
    const docRef = doc(db, 'feedbacks', feedbackId);
    await updateDoc(docRef, { isPinned });
  } catch (err) {
    console.warn('togglePinFeedbackInDb fallback:', err);
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
    const q = query(collection(db, 'chat_messages'), orderBy('createdAt', 'asc'), limit(250));
    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const msgs: ChatMessage[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            const rawSender = data.sender || (data.senderId === 'admin' ? 'topson' : 'user');
            const senderId = data.senderId || (rawSender === 'topson' ? 'admin' : (data.userId || data.user_id));
            const receiverId = data.receiverId || (rawSender === 'topson' ? (data.targetUserId || 'user') : 'admin');
            const status: 'sent' | 'read' = (data.status === 'read' || data.isRead) ? 'read' : 'sent';

            return {
              id: docSnap.id,
              sender: rawSender,
              senderName: data.senderName || (rawSender === 'topson' ? 'Topson Media' : 'Viewer'),
              senderId: senderId,
              receiverId: receiverId,
              status: status,
              userId: data.userId || data.user_id || senderId,
              user_id: data.userId || data.user_id || senderId,
              userEmail: data.userEmail,
              targetUserId: data.targetUserId || receiverId,
              text: data.text || '',
              timestamp: data.timestamp || 'Just now',
              avatarUrl: data.avatarUrl,
              isRead: status === 'read',
              deletedForEveryone: !!data.deletedForEveryone,
              deletedForUser: !!data.deletedForUser,
              createdAt: data.createdAt,
              created_at: data.created_at,
            };
          });

          // Filter out deleted messages
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
          callback([]);
        }
      },
      (error) => {
        console.warn('Firestore chat_messages onSnapshot fallback:', error);
        try {
          const cached = localStorage.getItem('topson_chat_messages_cache');
          if (cached) {
            callback(JSON.parse(cached));
            return;
          }
        } catch {}
        callback([]);
      }
    );
  } catch (err) {
    console.warn('subscribeToMessages error:', err);
    return () => {};
  }
}

export async function sendMessageToDb(message: ChatMessage): Promise<string> {
  const isTopson = message.sender === 'topson';
  const currentUid = message.userId || message.user_id || message.senderId || 'user';
  const senderId = message.senderId || (isTopson ? 'admin' : currentUid);
  const receiverId = message.receiverId || (isTopson ? (message.targetUserId || 'user') : 'admin');
  const status: 'sent' | 'read' = message.status || (isTopson ? 'sent' : 'sent');

  // Strict Firestore Document Architecture:
  // Must contain senderId, receiverId, text, timestamp, and status ('sent' | 'read')
  const payload: Record<string, any> = {
    senderId: senderId,
    receiverId: receiverId,
    text: message.text,
    timestamp: message.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: status,
    // Supporting fields for UI & backward compatibility
    sender: message.sender,
    senderName: message.senderName,
    userId: currentUid,
    user_id: currentUid,
    userEmail: message.userEmail || null,
    targetUserId: message.targetUserId || receiverId,
    avatarUrl: message.avatarUrl || null,
    isRead: status === 'read',
    deletedForEveryone: false,
    deletedForUser: false,
    createdAt: serverTimestamp(),
    created_at: serverTimestamp(),
    createdTimestamp: Date.now(),
  };

  try {
    const docRef = await addDoc(collection(db, 'chat_messages'), payload);
    // Mirror to 'messages' as well for backwards compatibility
    await addDoc(collection(db, 'messages'), payload).catch(() => {});
    return docRef.id;
  } catch (err) {
    console.warn('sendMessageToDb error, trying fallback:', err);
    try {
      const docRef = await addDoc(collection(db, 'messages'), payload);
      return docRef.id;
    } catch (e2) {
      console.warn('sendMessageToDb local fallback:', e2);
      return message.id || 'msg-' + Date.now();
    }
  }
}

export async function deleteMessageFromDb(messageId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'chat_messages', messageId)).catch(() => {});
    await deleteDoc(doc(db, 'messages', messageId)).catch(() => {});
  } catch (err) {
    console.warn('deleteMessageFromDb fallback:', err);
  }
}

export async function markMessagesReadInDb(messageIds: string[]): Promise<void> {
  if (!messageIds || messageIds.length === 0) return;
  try {
    for (const id of messageIds) {
      await updateDoc(doc(db, 'chat_messages', id), { status: 'read', isRead: true }).catch(() => {});
      await updateDoc(doc(db, 'messages', id), { status: 'read', isRead: true }).catch(() => {});
    }
  } catch (err) {
    console.warn('markMessagesReadInDb fallback:', err);
  }
}

export async function markThreadReadInDb(
  threadUserId: string,
  readerRole: 'admin' | 'user'
): Promise<void> {
  try {
    const q = query(
      collection(db, 'chat_messages'),
      where('status', '==', 'sent')
    );
    const snap = await getDocs(q);
    const updatePromises: Promise<any>[] = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const docSenderId = data.senderId || data.userId || data.user_id;
      const docReceiverId = data.receiverId || data.targetUserId;

      if (readerRole === 'admin') {
        // Admin is reading: mark messages sent by this user to admin
        if (docSenderId === threadUserId || data.userId === threadUserId || data.user_id === threadUserId) {
          updatePromises.push(updateDoc(doc(db, 'chat_messages', docSnap.id), { status: 'read', isRead: true }).catch(() => {}));
          updatePromises.push(updateDoc(doc(db, 'messages', docSnap.id), { status: 'read', isRead: true }).catch(() => {}));
        }
      } else {
        // User is reading: mark replies from Admin to this user
        if (docReceiverId === threadUserId || data.targetUserId === threadUserId) {
          updatePromises.push(updateDoc(doc(db, 'chat_messages', docSnap.id), { status: 'read', isRead: true }).catch(() => {}));
          updatePromises.push(updateDoc(doc(db, 'messages', docSnap.id), { status: 'read', isRead: true }).catch(() => {}));
        }
      }
    });

    await Promise.all(updatePromises);
  } catch (err) {
    console.warn('markThreadReadInDb notice:', err);
  }
}

// User suspension management in Firestore
export async function setUserSuspendedInDb(userId: string, suspended: boolean): Promise<void> {
  try {
    await setDoc(doc(db, 'users', userId), { suspended, suspendedAt: suspended ? Date.now() : null }, { merge: true });
  } catch (err) {
    console.warn('setUserSuspendedInDb error:', err);
  }
}

export function subscribeToUserSuspension(
  userId: string,
  onSuspensionChanged: (isSuspended: boolean) => void
): () => void {
  try {
    return onSnapshot(doc(db, 'users', userId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        onSuspensionChanged(!!data.suspended);
      }
    });
  } catch {
    return () => {};
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
          fanBadge: !!data.fanBadge || !!data.isTopFan,
          isTopFan: !!data.isTopFan || !!data.fanBadge,
          hasFanBadge: !!data.hasFanBadge || !!data.fanBadge || !!data.isTopFan,
          fanBadgeOffered: !!data.fanBadgeOffered,
          suspended: !!data.suspended,
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

export async function isAccountPurgedInDb(email?: string, userId?: string): Promise<boolean> {
  try {
    const cleanEmail = (email || '').toLowerCase().trim();
    // 1. Check local storage cache of purged accounts
    try {
      const cached = localStorage.getItem('topson_purged_accounts');
      if (cached) {
        const list: string[] = JSON.parse(cached);
        if (cleanEmail && list.includes(cleanEmail)) return true;
        if (userId && list.includes(userId)) return true;
      }
    } catch {
      // ignore
    }

    // 2. Query Firestore collection 'purged_accounts'
    if (cleanEmail) {
      const safeKey = cleanEmail.replace(/[.#$[\]]/g, '_');
      const docSnap = await getDoc(doc(db, 'purged_accounts', safeKey));
      if (docSnap.exists()) return true;

      const q = query(collection(db, 'purged_accounts'), where('email', '==', cleanEmail));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) return true;
    }

    if (userId) {
      const docSnap = await getDoc(doc(db, 'purged_accounts', userId));
      if (docSnap.exists()) return true;
    }
  } catch (err) {
    console.warn('isAccountPurgedInDb check error:', err);
  }
  return false;
}

export async function purgeUserPermanentlyInDb(userId: string, email?: string): Promise<void> {
  try {
    // 1. Delete user record completely from Firestore 'users' collection
    await deleteDoc(doc(db, 'users', userId));

    // 2. Register permanent ban & purged state in 'purged_accounts'
    const cleanEmail = (email || '').toLowerCase().trim();
    const timestamp = Date.now();

    if (cleanEmail) {
      const safeKey = cleanEmail.replace(/[.#$[\]]/g, '_');
      await setDoc(doc(db, 'purged_accounts', safeKey), {
        userId,
        email: cleanEmail,
        purgedAt: timestamp,
        banned: true,
        reason: 'Hard Account Ban by Topson Media Administrator',
      });
    }

    await setDoc(doc(db, 'purged_accounts', userId), {
      userId,
      email: cleanEmail,
      purgedAt: timestamp,
      banned: true,
      reason: 'Hard Account Ban by Topson Media Administrator',
    });

    // 3. Cache locally for instant blocking
    try {
      const cached = localStorage.getItem('topson_purged_accounts');
      const list: string[] = cached ? JSON.parse(cached) : [];
      if (cleanEmail && !list.includes(cleanEmail)) list.push(cleanEmail);
      if (!list.includes(userId)) list.push(userId);
      localStorage.setItem('topson_purged_accounts', JSON.stringify(list));
    } catch {
      // ignore
    }
  } catch (err) {
    console.warn('purgeUserPermanentlyInDb error:', err);
  }
}

export async function deleteUserFromDb(userId: string, email?: string): Promise<void> {
  await purgeUserPermanentlyInDb(userId, email);
}

export async function awardFanBadgeInDb(userId: string, isTopFan: boolean = true): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), {
      isTopFan: isTopFan,
      fanBadge: isTopFan,
      hasFanBadge: isTopFan,
      fanBadgeOffered: false,
    });
  } catch (err) {
    console.warn('awardFanBadgeInDb fallback:', err);
  }
}

export async function acceptFanBadgeInDb(userId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), {
      isTopFan: true,
      fanBadge: true,
      hasFanBadge: true,
      fanBadgeOffered: false,
    });
  } catch (err) {
    console.warn('acceptFanBadgeInDb fallback:', err);
  }
}

/**
 * Updates user profile details (username, avatarUrl) in Firestore and Auth
 */
export async function updateUserProfileInDb(
  userId: string,
  updates: { username?: string; avatarUrl?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    if (auth.currentUser && (auth.currentUser.uid === userId || auth.currentUser.email)) {
      try {
        await updateProfile(auth.currentUser, {
          displayName: updates.username,
          photoURL: updates.avatarUrl,
        });
      } catch (authErr) {
        console.warn('Auth updateProfile fallback:', authErr);
      }
    }
    return { success: true };
  } catch (err: any) {
    console.warn('updateUserProfileInDb fallback:', err);
    return { success: false, error: err?.message || 'Failed to update profile' };
  }
}

/**
 * Updates user password in Firebase Authentication
 */
export async function updateUserPasswordInAuth(
  newPassword: string
): Promise<{ success: boolean; message?: string }> {
  try {
    if (!auth.currentUser) {
      return { success: false, message: 'No active authenticated user session found.' };
    }
    await updatePassword(auth.currentUser, newPassword);
    return { success: true };
  } catch (err: any) {
    console.warn('updateUserPasswordInAuth error:', err);
    if (err?.code === 'auth/requires-recent-login') {
      return {
        success: false,
        message: 'For security reasons, please re-sign in before updating your password.',
      };
    }
    return {
      success: false,
      message: err?.message || 'Could not update password. Please try again.',
    };
  }
}

/**
 * Fetch dynamic full history of submitted feedbacks and chat messages for a user
 */
export async function fetchUserActivityHistoryInDb(
  userId: string,
  username: string,
  email?: string
): Promise<{ feedbacks: FeedbackItem[]; chatMessages: ChatMessage[] }> {
  const result: { feedbacks: FeedbackItem[]; chatMessages: ChatMessage[] } = {
    feedbacks: [],
    chatMessages: [],
  };

  try {
    // 1. Fetch user feedbacks
    const feedbackSnap = await getDocs(collection(db, 'feedbacks'));
    if (!feedbackSnap.empty) {
      result.feedbacks = feedbackSnap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            authorName: data.authorName || data.user || 'Member',
            authorHandle: data.authorHandle || `@${(data.authorName || data.user || 'member').toLowerCase().replace(/\s+/g, '')}`,
            authorRole: data.authorRole || 'Community Member',
            avatarUrl: data.avatarUrl || '',
            rating: data.rating || 5,
            date: data.date || 'Recent',
            content: data.content || data.text || '',
            verified: !!data.verified,
            likes: data.likes || 0,
            likesCount: data.likesCount || 0,
            likedBy: data.likedBy || [],
            hidden: !!data.hidden,
            hasFanBadge: !!data.hasFanBadge || !!data.isTopFan,
            isTopFan: !!data.isTopFan || !!data.hasFanBadge,
            text: data.text || data.content,
            user: data.user || data.authorName,
          } as FeedbackItem;
        })
        .filter((fb) => {
          const uLower = (username || '').toLowerCase();
          const eLower = (email || '').toLowerCase();
          return (
            (fb.user && fb.user.toLowerCase() === uLower) ||
            (fb.authorName && fb.authorName.toLowerCase() === uLower) ||
            fb.id === userId
          );
        });
    }
  } catch (err) {
    console.warn('fetchUserActivityHistoryInDb feedbacks error:', err);
  }

  try {
    // 2. Fetch user chat messages
    const chatSnap = await getDocs(collection(db, 'chat_messages'));
    if (!chatSnap.empty) {
      result.chatMessages = chatSnap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            sender: data.sender || 'user',
            senderName: data.senderName || username,
            userId: data.userId || data.user_id || '',
            user_id: data.user_id || data.userId || '',
            userEmail: data.userEmail || '',
            text: data.text || '',
            timestamp: data.timestamp || 'Recent',
            avatarUrl: data.avatarUrl || '',
            isRead: !!data.isRead,
          } as ChatMessage;
        })
        .filter((msg) => {
          const uLower = (username || '').toLowerCase();
          const eLower = (email || '').toLowerCase();
          return (
            (msg.userId && msg.userId === userId) ||
            (msg.userEmail && msg.userEmail.toLowerCase() === eLower) ||
            (msg.senderName && msg.senderName.toLowerCase() === uLower)
          );
        });
    }
  } catch (err) {
    console.warn('fetchUserActivityHistoryInDb chatMessages error:', err);
  }

  return result;
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
