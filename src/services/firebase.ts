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
  LiveSession,
  LiveStreamChatMessage,
  AdminActivity,
  MonetizationCampaign,
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

export function formatUploadedTimeAgo(timestampMs: number): string {
  if (!timestampMs) return 'Recently';
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - timestampMs) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
}

export function mapFirestoreVideoDoc(docId: string, data: any): VideoItem {
  const rawUrl = data.video_url || data.videoUrl || '';
  const detectedYtId = data.youtube_id || data.youtubeId || extractYouTubeId(rawUrl);
  const resolvedThumbnail =
    data.thumbnail ||
    (detectedYtId ? getYouTubeThumbnail(detectedYtId) : '') ||
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';

  let createdTime = Date.now();
  if (data.created_at) {
    if (typeof data.created_at.toMillis === 'function') {
      createdTime = data.created_at.toMillis();
    } else if (typeof data.created_at.toDate === 'function') {
      createdTime = data.created_at.toDate().getTime();
    } else if (typeof data.created_at === 'number') {
      createdTime = data.created_at;
    }
  } else if (data.createdAt) {
    if (typeof data.createdAt.toMillis === 'function') {
      createdTime = data.createdAt.toMillis();
    } else if (typeof data.createdAt.toDate === 'function') {
      createdTime = data.createdAt.toDate().getTime();
    } else if (typeof data.createdAt === 'number') {
      createdTime = data.createdAt;
    }
  } else if (typeof data.uploadTimestamp === 'number') {
    createdTime = data.uploadTimestamp;
  }

  const rawCat = data.category || 'phone';
  const categoryLabel =
    rawCat === 'phone' ? 'Phone Mastery' :
    rawCat === 'pc' ? 'PC Performance' :
    rawCat === 'digital' ? 'Digital Skills' :
    rawCat;

  const viewsCountVal =
    typeof data.viewsCount === 'number'
      ? data.viewsCount
      : (typeof data.views === 'number' ? data.views : 0);

  const displayViews =
    data.views && typeof data.views === 'string'
      ? data.views
      : (viewsCountVal > 0 ? `${viewsCountVal} views` : '0 views');

  return {
    id: docId,
    title: data.title || (detectedYtId ? `YouTube Tutorial (${detectedYtId})` : 'Untitled Tutorial'),
    category: categoryLabel,
    duration: data.duration || '10:00',
    views: displayViews,
    viewsCount: viewsCountVal,
    viewedBy: Array.isArray(data.viewedBy) ? data.viewedBy : [],
    date: data.date || formatUploadedTimeAgo(createdTime),
    thumbnail: resolvedThumbnail,
    youtubeId: detectedYtId || undefined,
    videoUrl: rawUrl || (detectedYtId ? `https://www.youtube.com/watch?v=${detectedYtId}` : ''),
    sourceType: data.sourceType || 'link',
    description: data.description || `Tutorial on ${data.title || ''}`,
    tags: Array.isArray(data.tags) ? data.tags : [categoryLabel],
    likes: typeof data.likes === 'number' ? data.likes : (typeof data.likesCount === 'number' ? data.likesCount : 0),
    likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
    comments: Array.isArray(data.comments) ? data.comments : [],
    createdAt: createdTime,
    uploadTimestamp: createdTime,
  };
}

export function subscribeToVideos(callback: (videos: VideoItem[]) => void): () => void {
  try {
    let videosDocs: VideoItem[] = [];
    let tutorialsDocs: VideoItem[] = [];

    const broadcast = () => {
      const map = new Map<string, VideoItem>();
      const canonicalSeen = new Set<string>();

      // Prioritize video_tutorials (the primary streaming video collection) then videos
      [...tutorialsDocs, ...videosDocs].forEach((vid) => {
        const canonicalKey = vid.youtubeId
          ? `yt:${vid.youtubeId.toLowerCase()}`
          : vid.videoUrl
          ? `url:${vid.videoUrl.toLowerCase().trim()}`
          : `id:${vid.id}`;

        if (!map.has(vid.id) && !canonicalSeen.has(canonicalKey)) {
          map.set(vid.id, vid);
          if (canonicalKey.startsWith('yt:') || canonicalKey.startsWith('url:')) {
            canonicalSeen.add(canonicalKey);
          }
        }
      });

      const merged = Array.from(map.values());
      // Sort descending by creation timestamp
      merged.sort((a, b) => {
        const aTime = typeof a.createdAt === 'number' ? a.createdAt : 0;
        const bTime = typeof b.createdAt === 'number' ? b.createdAt : 0;
        return bTime - aTime;
      });

      callback(merged);
      try {
        localStorage.setItem('topson_videos_cache', JSON.stringify(merged));
      } catch {}
    };

    // 1. Subscribe to 'video_tutorials' collection (main tutorial video section)
    const qTutorials = query(collection(db, 'video_tutorials'), limit(200));
    const unsubTutorials = onSnapshot(
      qTutorials,
      (snapshot) => {
        tutorialsDocs = snapshot.docs.map((d) => mapFirestoreVideoDoc(d.id, d.data()));
        broadcast();
      },
      (err) => {
        console.warn('subscribeToVideos video_tutorials listener warning:', err);
      }
    );

    // 2. Subscribe to 'videos' collection
    const qVideos = query(collection(db, 'videos'), limit(200));
    const unsubVideos = onSnapshot(
      qVideos,
      (snapshot) => {
        videosDocs = snapshot.docs.map((d) => mapFirestoreVideoDoc(d.id, d.data()));
        broadcast();
      },
      (err) => {
        console.warn('subscribeToVideos videos listener warning:', err);
      }
    );

    return () => {
      unsubTutorials();
      unsubVideos();
    };
  } catch (err) {
    console.warn('subscribeToVideos error:', err);
    try {
      const cached = localStorage.getItem('topson_videos_cache');
      if (cached) {
        callback(JSON.parse(cached));
      }
    } catch {}
    return () => {};
  }
}

export async function addVideoToDb(video: VideoItem): Promise<string> {
  try {
    const payload = {
      ...video,
      video_url: video.videoUrl || '',
      createdAt: serverTimestamp(),
      created_at: serverTimestamp(),
      uploadTimestamp: Date.now(),
    };
    const docRef = await addDoc(collection(db, 'video_tutorials'), payload);
    try {
      await setDoc(doc(db, 'videos', docRef.id), payload);
    } catch (_) {}
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
    const payload = {
      ...video,
      video_url: video.videoUrl || '',
    };
    await Promise.all([
      updateDoc(doc(db, 'videos', video.id), payload).catch(() => {}),
      updateDoc(doc(db, 'video_tutorials', video.id), payload).catch(() => {}),
    ]);
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
    await Promise.all([
      deleteDoc(doc(db, 'videos', videoId)).catch(() => {}),
      deleteDoc(doc(db, 'video_tutorials', videoId)).catch(() => {}),
    ]);
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

            const profilePhoto = data.userProfileUrl || data.photoURL || data.avatarUrl || '';
            return {
              id: docSnap.id,
              authorName: data.authorName || data.user || 'Member',
              authorHandle: data.authorHandle || (data.user ? `@${data.user.toLowerCase().replace(/\s+/g, '')}` : undefined),
              authorRole: data.authorRole || 'Community Member',
              avatarUrl: profilePhoto,
              userProfileUrl: profilePhoto,
              photoURL: profilePhoto,
              username: data.username || data.authorName || data.user || 'User',
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
    const feedbackAuthor = feedback.authorName || feedback.user || 'Viewer';
    logAdminActivity({
      type: 'feedback_added',
      text: `New Feedback added by: ${feedbackAuthor}`,
      user: feedbackAuthor,
    }).catch(() => {});
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
    logAdminActivity({
      type: 'email_inquiry',
      text: `New Inbound message from: ${data.senderName || 'Visitor'}`,
      user: data.senderName,
    }).catch(() => {});
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
    normalized === 'top22ken@gmail.com' ||
    normalized === 'admin@topsonmedia.com' ||
    normalized === 'topsonkenedy' ||
    normalized === 'top22ken' ||
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
        username: 'topson media',
        email: normalized.includes('@') ? normalized : 'topsonkenedy@gmail.com',
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

/**
 * =========================================================================
 * ADMINISTRATIVE FACE-TO-FACE LIVE STREAMING GATEWAY (Firestore Services)
 * =========================================================================
 */

// Subscribe to real-time status of the current live streaming session
export function subscribeToLiveSession(callback: (session: LiveSession | null) => void) {
  const sessionRef = doc(db, 'live_sessions', 'current');
  return onSnapshot(
    sessionRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback({
          id: 'current',
          isLive: !!data.isLive,
          title: data.title || 'Topson Media Live Studio Broadcast',
          adminName: data.adminName || 'topson media',
          adminAvatar: data.adminAvatar || 'https://i.postimg.cc/Hsb9TQcX/profile.png',
          startedAt: data.startedAt,
          endedAt: data.endedAt,
          likesCount: Number(data.likesCount || 0),
          viewersCount: Math.max(1, Number(data.viewersCount || 1)),
          activeTopic: data.activeTopic || 'Tech Mastery & Live Q&A',
          streamUrl: data.streamUrl,
        });
      } else {
        callback(null);
      }
    },
    (error) => {
      console.warn('subscribeToLiveSession listener warning:', error);
      callback(null);
    }
  );
}

// Start Live Broadcast session (Admin Only)
export async function startLiveStreamInDb(params: {
  title: string;
  adminName: string;
  adminAvatar?: string;
  activeTopic?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const sessionRef = doc(db, 'live_sessions', 'current');
    await setDoc(sessionRef, {
      isLive: true,
      title: params.title.trim() || 'Topson Media Live Masterclass',
      adminName: params.adminName || 'topson media',
      adminAvatar: params.adminAvatar || 'https://i.postimg.cc/Hsb9TQcX/profile.png',
      startedAt: serverTimestamp(),
      endedAt: null,
      likesCount: 0,
      viewersCount: 1,
      activeTopic: params.activeTopic || 'Live Tech Broadcast',
    });
    return { success: true };
  } catch (err: any) {
    console.error('startLiveStreamInDb error:', err);
    return { success: false, error: err?.message || 'Failed to start live session' };
  }
}

// End Live Broadcast session (Admin Only)
export async function endLiveStreamInDb(): Promise<{ success: boolean; error?: string }> {
  try {
    const sessionRef = doc(db, 'live_sessions', 'current');
    await updateDoc(sessionRef, {
      isLive: false,
      endedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (err: any) {
    console.error('endLiveStreamInDb error:', err);
    return { success: false, error: err?.message || 'Failed to end live session' };
  }
}

// Real-time atomic increment for live stream likes
export async function incrementLiveStreamLikes(delta: number = 1): Promise<void> {
  try {
    const sessionRef = doc(db, 'live_sessions', 'current');
    await updateDoc(sessionRef, {
      likesCount: increment(delta),
    });
  } catch (err) {
    console.warn('incrementLiveStreamLikes fallback error:', err);
  }
}

// Update live stream viewers count
export async function updateLiveStreamViewers(delta: number): Promise<void> {
  try {
    const sessionRef = doc(db, 'live_sessions', 'current');
    await updateDoc(sessionRef, {
      viewersCount: increment(delta),
    });
  } catch (err) {
    console.warn('updateLiveStreamViewers fallback error:', err);
  }
}

// Subscribe to real-time live chat messages during stream
export function subscribeToLiveStreamMessages(callback: (messages: LiveStreamChatMessage[]) => void) {
  const messagesCol = collection(db, 'live_sessions', 'current', 'chat');
  const q = query(messagesCol, orderBy('createdAt', 'desc'), limit(50));

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: LiveStreamChatMessage[] = snapshot.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            senderName: data.senderName || 'Viewer',
            senderAvatar: data.senderAvatar,
            text: data.text || '',
            timestamp: data.timestamp || 'Just now',
            createdAt: data.createdAt,
            isAdmin: !!data.isAdmin,
          };
        })
        .reverse();
      callback(msgs);
    },
    (err) => {
      console.warn('subscribeToLiveStreamMessages error:', err);
      callback([]);
    }
  );
}

// Send a message in live stream chat
export async function sendLiveStreamMessage(msg: {
  senderName: string;
  senderAvatar?: string;
  text: string;
  isAdmin?: boolean;
}): Promise<void> {
  try {
    const messagesCol = collection(db, 'live_sessions', 'current', 'chat');
    await addDoc(messagesCol, {
      senderName: msg.senderName,
      senderAvatar: msg.senderAvatar || null,
      text: msg.text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: serverTimestamp(),
      isAdmin: !!msg.isAdmin,
    });
  } catch (err) {
    console.warn('sendLiveStreamMessage error:', err);
  }
}

// ============================================================================
// ADMIN NOTIFICATION HUB (Latest Activity Engine)
// ============================================================================

export async function logAdminActivity(activity: {
  type: 'member_registered' | 'feedback_added' | 'email_inquiry' | string;
  text: string;
  user?: string;
}): Promise<void> {
  try {
    const colRef = collection(db, 'latest_activities');
    await addDoc(colRef, {
      type: activity.type,
      text: activity.text,
      user: activity.user || 'Member',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: serverTimestamp(),
      created_at: Date.now(),
      isRead: false,
    });
  } catch (err) {
    console.warn('logAdminActivity error:', err);
  }
}

export function subscribeToAdminActivities(callback: (activities: AdminActivity[]) => void): () => void {
  try {
    const colRef = collection(db, 'latest_activities');
    const q = query(colRef, limit(20));

    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const acts: AdminActivity[] = snapshot.docs.map((d) => {
            const data = d.data();
            const timeVal =
              data.createdAt?.toMillis?.() ||
              data.created_at ||
              Date.now();

            return {
              id: d.id,
              type: data.type || 'activity',
              text: data.text || 'New system activity',
              user: data.user || 'Member',
              timestamp: data.timestamp || 'Just now',
              createdAt: timeVal,
              isRead: !!data.isRead,
            };
          });

          // Sort desc by time
          acts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          callback(acts.slice(0, 20));
        } else {
          callback([]);
        }
      },
      (err) => {
        console.warn('subscribeToAdminActivities error:', err);
        callback([]);
      }
    );
  } catch (err) {
    console.warn('subscribeToAdminActivities listener error:', err);
    return () => {};
  }
}

// ============================================================================
// MONETIZATION & CONTEXTUAL ADVERTISING SYSTEM (5-MINUTE ROTATION MATRIX)
// ============================================================================

export const DEFAULT_MONETIZATION_CAMPAIGNS: MonetizationCampaign[] = [
  {
    id: 'campaign-protonvpn',
    title: 'Try ProtonVPN – 60% Off for Topson Viewers',
    description: 'Encrypt your mobile data, unblock geo-restricted tech tools, and enjoy high browsing speeds.',
    redirectUrl: 'https://protonvpn.com',
    imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=400&q=80',
    isActive: true,
  },
  {
    id: 'campaign-techmastery',
    title: 'Topson Masterclass: Android & PC Repair Toolkit',
    description: 'Get step-by-step diagnostic tools, FRP unlocks, and recovery guides direct from Topson Media.',
    redirectUrl: 'https://youtube.com/@topsonmedia',
    imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80',
    isActive: true,
  },
  {
    id: 'campaign-nordsec',
    title: 'Cyber Security Essentials 2025 – Stay Safe Online',
    description: 'Protect your passwords and personal files against phishing and mobile spyware.',
    redirectUrl: 'https://nordvpn.com',
    imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=400&q=80',
    isActive: true,
  },
];

export function subscribeToMonetizationCampaigns(callback: (campaigns: MonetizationCampaign[]) => void): () => void {
  try {
    const campaignsCol = collection(db, 'sponsorship_campaigns');
    return onSnapshot(
      campaignsCol,
      (snap) => {
        if (!snap.empty) {
          const list: MonetizationCampaign[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: data.title || '',
              description: data.description || '',
              redirectUrl: data.redirectUrl || '',
              imageUrl: data.imageUrl || '',
              isActive: data.isActive !== false,
              updatedAt: data.updatedAt,
            };
          });
          callback(list);
        } else {
          callback(DEFAULT_MONETIZATION_CAMPAIGNS);
        }
      },
      (err) => {
        console.warn('subscribeToMonetizationCampaigns snapshot fallback:', err);
        callback(DEFAULT_MONETIZATION_CAMPAIGNS);
      }
    );
  } catch (err) {
    console.warn('subscribeToMonetizationCampaigns error:', err);
    callback(DEFAULT_MONETIZATION_CAMPAIGNS);
    return () => {};
  }
}

export function subscribeToMonetizationCampaign(callback: (campaign: MonetizationCampaign | null) => void): () => void {
  try {
    const campaignRef = doc(db, 'monetization', 'active_campaign');
    return onSnapshot(
      campaignRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          callback({
            id: snap.id,
            title: data.title || '',
            description: data.description || '',
            redirectUrl: data.redirectUrl || '',
            imageUrl: data.imageUrl || '',
            isActive: data.isActive !== false,
            updatedAt: data.updatedAt,
          });
        } else {
          callback(DEFAULT_MONETIZATION_CAMPAIGNS[0]);
        }
      },
      (err) => {
        console.warn('subscribeToMonetizationCampaign error:', err);
        callback(DEFAULT_MONETIZATION_CAMPAIGNS[0]);
      }
    );
  } catch (err) {
    console.warn('subscribeToMonetizationCampaign error:', err);
    callback(DEFAULT_MONETIZATION_CAMPAIGNS[0]);
    return () => {};
  }
}

export async function saveMonetizationCampaign(campaign: MonetizationCampaign): Promise<string> {
  try {
    const campaignId = campaign.id || `campaign-${Date.now()}`;
    const docRef = doc(db, 'sponsorship_campaigns', campaignId);
    await setDoc(
      docRef,
      {
        id: campaignId,
        title: campaign.title.trim(),
        description: (campaign.description || '').trim(),
        redirectUrl: campaign.redirectUrl.trim(),
        imageUrl: (campaign.imageUrl || '').trim(),
        isActive: campaign.isActive !== false,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Also mirror to legacy active_campaign document for single-slot consumers
    const activeRef = doc(db, 'monetization', 'active_campaign');
    await setDoc(
      activeRef,
      {
        title: campaign.title.trim(),
        description: (campaign.description || '').trim(),
        redirectUrl: campaign.redirectUrl.trim(),
        imageUrl: (campaign.imageUrl || '').trim(),
        isActive: campaign.isActive !== false,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return campaignId;
  } catch (err) {
    console.error('saveMonetizationCampaign error:', err);
    throw err;
  }
}

export async function deleteMonetizationCampaign(campaignId: string): Promise<void> {
  try {
    const docRef = doc(db, 'sponsorship_campaigns', campaignId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('deleteMonetizationCampaign error:', err);
    throw err;
  }
}


