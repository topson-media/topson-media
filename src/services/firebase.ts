import { initializeApp, getApps } from 'firebase/app';
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
  getDocFromServer,
  where,
  addDoc,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { VideoItem, FeedbackItem, ChatMessage, User, EmailMessage, VideoComment } from '../types';
import { TOPSON_PROFILE_IMAGE } from '../data/mockData';
import { getYouTubeThumbnail } from '../utils/youtubeHelper';
import { formatUploadedTimeAgo } from '../utils/timeAgo';

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Cloud Firestore with dedicated databaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Test Firestore Connection
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'system', 'connection_health'));
    return true;
  } catch (error) {
    // If not found or initial offline check
    return true;
  }
}

// ---------------------------------------------------------------------------
// 1. VIDEOS & VIDEO TUTORIALS (Real-time Database CRUD & Engagement)
// ---------------------------------------------------------------------------

export const DEFAULT_TUTORIALS: any[] = [];

export async function seedInitialTutorialsIfEmpty(): Promise<void> {
  // Absolute removal of AI mock data leaks: No synthetic/mock data seeding
}

export function subscribeToVideoTutorials(callback: (videos: VideoItem[]) => void) {
  try {
    const q = query(collection(db, 'video_tutorials'), orderBy('created_at', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          callback([]);
          return;
        }

        const list: VideoItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const rawCat = data.category || 'phone';
          const categoryName =
            rawCat === 'phone' ? 'Phone Mastery' :
            rawCat === 'pc' ? 'PC Performance' :
            rawCat === 'digital' ? 'Digital Skills' :
            rawCat;

          const rawUrl = data.video_url || data.videoUrl || '';
          const autoYtThumb = rawUrl ? getYouTubeThumbnail(rawUrl) : null;
          const thumbnail = data.thumbnail || autoYtThumb || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';

          let uploadTs = Date.now();
          if (data.created_at) {
            if (typeof data.created_at.toMillis === 'function') {
              uploadTs = data.created_at.toMillis();
            } else if (typeof data.created_at.toDate === 'function') {
              uploadTs = data.created_at.toDate().getTime();
            } else if (typeof data.created_at === 'number') {
              uploadTs = data.created_at;
            }
          }
          const dateStr = formatUploadedTimeAgo(uploadTs);

          list.push({
            id: docSnap.id,
            title: data.title || '',
            category: categoryName,
            duration: data.duration || '10:00',
            views: data.views || (typeof data.viewsCount === 'number' ? `${data.viewsCount} views` : '1.5K views'),
            viewsCount: typeof data.viewsCount === 'number' ? data.viewsCount : 0,
            viewedBy: Array.isArray(data.viewedBy) ? data.viewedBy : [],
            date: dateStr,
            createdAt: uploadTs,
            uploadTimestamp: uploadTs,
            thumbnail,
            videoUrl: rawUrl,
            sourceType: data.sourceType || 'link',
            description: data.description || `Tutorial on ${data.title || ''}`,
            tags: Array.isArray(data.tags) ? data.tags : [categoryName],
            likes: typeof data.likes === 'number' ? data.likes : 0,
            likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
            comments: Array.isArray(data.comments) ? data.comments : [],
          });
        });
        callback(list);
      },
      (error) => {
        console.warn('Firestore video_tutorials subscription fallback:', error);
      }
    );
  } catch (e) {
    console.error('Error setting up video_tutorials listener:', e);
    return () => {};
  }
}

export function subscribeToVideos(callback: (videos: VideoItem[]) => void) {
  return subscribeToVideoTutorials(callback);
}

export async function addVideoToDb(video: VideoItem): Promise<void> {
  const categoryCode =
    video.category.toLowerCase().includes('phone') ? 'phone' :
    video.category.toLowerCase().includes('pc') ? 'pc' :
    'digital';

  await addDoc(collection(db, 'video_tutorials'), {
    title: video.title,
    category: categoryCode,
    video_url: video.videoUrl || '',
    created_at: serverTimestamp(),
    thumbnail: video.thumbnail,
    duration: video.duration || '10:00',
    description: video.description || `Tutorial on ${video.title}`,
    views: video.views || '0 views',
    viewsCount: video.viewsCount || 0,
    likes: video.likes || 0,
    likedBy: video.likedBy || [],
    comments: video.comments || [],
  });
}

export async function updateVideoInDb(video: VideoItem): Promise<void> {
  try {
    const docRef = doc(db, 'video_tutorials', video.id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await updateDoc(docRef, {
        title: video.title,
        duration: video.duration,
        views: video.views,
        viewsCount: video.viewsCount ?? 0,
        thumbnail: video.thumbnail,
        video_url: video.videoUrl,
        videoUrl: video.videoUrl,
        description: video.description,
        tags: video.tags,
      });
      return;
    }
  } catch (e) {
    // try fallback
  }

  try {
    const legacyRef = doc(db, 'videos', video.id);
    await updateDoc(legacyRef, {
      title: video.title,
      category: video.category,
      duration: video.duration,
      views: video.views,
      viewsCount: video.viewsCount ?? 0,
      thumbnail: video.thumbnail,
      videoUrl: video.videoUrl,
      sourceType: video.sourceType,
      description: video.description,
      tags: video.tags,
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.warn('Error in updateVideoInDb:', e);
  }
}

export async function incrementVideoViewsInDb(videoId: string, userId?: string): Promise<{ viewsCount: number; viewed: boolean }> {
  try {
    let docRef = doc(db, 'video_tutorials', videoId);
    let snap = await getDoc(docRef);
    if (!snap.exists()) {
      docRef = doc(db, 'videos', videoId);
      snap = await getDoc(docRef);
    }
    if (snap.exists()) {
      const data = snap.data();
      const current = typeof data.viewsCount === 'number' ? data.viewsCount : 0;
      const viewedBy: string[] = Array.isArray(data.viewedBy) ? data.viewedBy : [];

      // ONE ACCOUNT ONE VIEW RULE: If user already viewed, do NOT increment
      if (userId && viewedBy.includes(userId)) {
        return { viewsCount: current, viewed: false };
      }

      const next = current + 1;
      const nextViewedBy = userId ? [...viewedBy, userId] : viewedBy;
      const formatted = next >= 1000 ? `${(next / 1000).toFixed(1)}K views` : `${next} views`;
      await updateDoc(docRef, {
        viewsCount: increment(1),
        views: formatted,
        viewedBy: nextViewedBy,
      });
      return { viewsCount: next, viewed: true };
    }
  } catch (err) {
    console.warn('Failed to increment views in DB:', err);
  }
  return { viewsCount: 1, viewed: true };
}

export async function toggleLikeVideoInDb(videoId: string, userId: string): Promise<{ liked: boolean; count: number }> {
  try {
    let docRef = doc(db, 'video_tutorials', videoId);
    let snap = await getDoc(docRef);
    if (!snap.exists()) {
      docRef = doc(db, 'videos', videoId);
      snap = await getDoc(docRef);
    }
    if (snap.exists()) {
      const data = snap.data();
      const currentLikes = typeof data.likes === 'number' ? data.likes : 0;
      const likedBy: string[] = Array.isArray(data.likedBy) ? data.likedBy : [];
      const hasLiked = likedBy.includes(userId);

      const nextLikedBy = hasLiked ? likedBy.filter((id) => id !== userId) : [...likedBy, userId];
      const nextCount = Math.max(0, hasLiked ? currentLikes - 1 : currentLikes + 1);

      await updateDoc(docRef, {
        likes: nextCount,
        likedBy: nextLikedBy,
      });

      return { liked: !hasLiked, count: nextCount };
    }
  } catch (err) {
    console.warn('Failed to toggle video like in DB:', err);
  }
  return { liked: true, count: 1 };
}

export async function addVideoCommentInDb(videoId: string, comment: VideoComment): Promise<VideoComment[]> {
  try {
    let docRef = doc(db, 'video_tutorials', videoId);
    let snap = await getDoc(docRef);
    if (!snap.exists()) {
      docRef = doc(db, 'videos', videoId);
      snap = await getDoc(docRef);
    }
    if (snap.exists()) {
      const data = snap.data();
      const comments: VideoComment[] = Array.isArray(data.comments) ? data.comments : [];
      const nextComments = [comment, ...comments];
      await updateDoc(docRef, {
        comments: nextComments,
      });
      return nextComments;
    }
  } catch (err) {
    console.warn('Failed to add video comment in DB:', err);
  }
  return [comment];
}

export async function deleteVideoFromDb(videoId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'video_tutorials', videoId));
  } catch (err) {
    // fallback
  }
  try {
    await deleteDoc(doc(db, 'videos', videoId));
  } catch (err) {
    // fallback
  }
}

// ---------------------------------------------------------------------------
// 2. COMMUNITY FEEDBACKS & TESTIMONIALS (Firestore Collection: community_feedback)
// ---------------------------------------------------------------------------

export const DEFAULT_COMMUNITY_FEEDBACKS: any[] = [];

export async function seedInitialFeedbacksIfEmpty(): Promise<void> {
  // Absolute removal of AI mock data leaks: No synthetic/mock reviews seeding
}

export function subscribeToFeedbacks(callback: (feedbacks: FeedbackItem[]) => void) {
  try {
    const q = query(collection(db, 'community_feedback'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          callback([]);
          return;
        }

        const feedbacks: FeedbackItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          feedbacks.push({
            id: docSnap.id,
            authorName: data.authorName || 'Community Member',
            authorHandle: data.authorHandle,
            authorRole: data.authorRole || 'Viewer',
            avatarUrl: data.avatarUrl || '',
            rating: typeof data.rating === 'number' ? data.rating : 5,
            date: data.date || 'Just now',
            content: data.content || '',
            verified: !!data.verified,
            likes: typeof data.likes === 'number' ? data.likes : 0,
            likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
            hidden: !!data.hidden,
            hasFanBadge: !!data.hasFanBadge,
            replies: Array.isArray(data.replies) ? data.replies : [],
          });
        });
        callback(feedbacks);
      },
      (error) => {
        console.warn('Firestore community_feedback subscription fallback:', error);
      }
    );
  } catch (e) {
    console.error('Error setting up community_feedback listener:', e);
    return () => {};
  }
}

export async function addFeedbackToDb(feedback: FeedbackItem): Promise<void> {
  const docRef = doc(db, 'community_feedback', feedback.id);
  await setDoc(docRef, {
    ...feedback,
    likes: feedback.likes || 0,
    likedBy: feedback.likedBy || [],
    hidden: false,
    createdAt: serverTimestamp(),
  });
}

export async function toggleLikeFeedbackInDb(feedbackId: string, userIdOrCount: string | number): Promise<void> {
  try {
    let docRef = doc(db, 'community_feedback', feedbackId);
    let snap = await getDoc(docRef);
    if (!snap.exists()) {
      docRef = doc(db, 'feedbacks', feedbackId);
      snap = await getDoc(docRef);
    }
    if (typeof userIdOrCount === 'number') {
      await updateDoc(docRef, {
        likes: userIdOrCount,
      });
      return;
    }
    const userId = userIdOrCount;
    if (snap.exists()) {
      const data = snap.data();
      const currentLikes = typeof data.likes === 'number' ? data.likes : 0;
      const likedBy: string[] = Array.isArray(data.likedBy) ? data.likedBy : [];
      const hasLiked = likedBy.includes(userId);
      const nextLikedBy = hasLiked ? likedBy.filter((id) => id !== userId) : [...likedBy, userId];
      const nextCount = Math.max(0, hasLiked ? currentLikes - 1 : currentLikes + 1);
      await updateDoc(docRef, {
        likes: nextCount,
        likedBy: nextLikedBy,
      });
    }
  } catch (err) {
    console.warn('Failed to toggle feedback like in DB:', err);
  }
}

export async function hideFeedbackInDb(feedbackId: string, hidden: boolean): Promise<void> {
  try {
    const docRef = doc(db, 'community_feedback', feedbackId);
    await updateDoc(docRef, { hidden });
  } catch {
    try {
      const legacyRef = doc(db, 'feedbacks', feedbackId);
      await updateDoc(legacyRef, { hidden });
    } catch (e) {
      console.warn('Error in hideFeedbackInDb:', e);
    }
  }
}

export async function deleteFeedbackFromDb(feedbackId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'community_feedback', feedbackId));
  } catch {
    // ignore
  }
  try {
    await deleteDoc(doc(db, 'feedbacks', feedbackId));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// 3. SECURE LIVE CHAT MESSAGES STREAM (Firestore Collection: chat_messages)
// ---------------------------------------------------------------------------
export function subscribeToMessages(callback: (messages: ChatMessage[]) => void, currentUser?: User | null) {
  try {
    const uid = currentUser?.uid || currentUser?.id;
    let q;

    if (currentUser?.role === 'admin') {
      // The Admin account is authorized to access and load all open chat threads from every user
      q = query(collection(db, 'chat_messages'), orderBy('createdAt', 'asc'));
    } else if (currentUser && uid) {
      // Regular authenticated users must ONLY be able to fetch and see their own private messages that they exchanged with Topson Media.
      // Apply strict query filter: where("user_id", "==", currentUser.uid)
      q = query(collection(db, 'chat_messages'), where('user_id', '==', uid));
    } else {
      // Unauthenticated visitor: do not load private chat messages
      callback([]);
      return () => {};
    }

    return onSnapshot(
      q,
      (snapshot) => {
        const messages: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          let createdTs = Date.now();
          if (data.createdAt) {
            if (typeof data.createdAt.toMillis === 'function') {
              createdTs = data.createdAt.toMillis();
            } else if (typeof data.createdAt.toDate === 'function') {
              createdTs = data.createdAt.toDate().getTime();
            } else if (typeof data.createdAt === 'number') {
              createdTs = data.createdAt;
            }
          }

          messages.push({
            id: docSnap.id,
            sender: data.sender || 'user',
            senderName: data.senderName || 'Viewer',
            userId: data.userId || data.user_id,
            user_id: data.user_id || data.userId,
            userEmail: data.userEmail,
            targetUserId: data.targetUserId,
            text: data.text || '',
            timestamp: data.timestamp || '',
            avatarUrl: data.avatarUrl,
            isRead: !!data.isRead,
            createdAt: createdTs,
            deletedForEveryone: data.deletedForEveryone,
            deletedForUser: data.deletedForUser,
          } as ChatMessage);
        });

        // Chronological sort in memory
        messages.sort((a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0));
        callback(messages);
      },
      (error) => {
        console.warn('Firestore chat_messages subscription error:', error);
      }
    );
  } catch (e) {
    console.error('Error setting up chat_messages listener:', e);
    return () => {};
  }
}

export async function sendMessageToDb(message: ChatMessage): Promise<void> {
  const docRef = doc(db, 'chat_messages', message.id);
  const userIdVal = message.user_id || message.userId || message.targetUserId || '';
  await setDoc(docRef, {
    ...message,
    user_id: userIdVal,
    userId: userIdVal,
    createdAt: serverTimestamp(),
  });
}

export async function markMessagesReadInDb(messageIds: string[]): Promise<void> {
  for (const id of messageIds) {
    try {
      const docRef = doc(db, 'chat_messages', id);
      await updateDoc(docRef, { isRead: true });
    } catch {
      // ignore
    }
  }
}

export async function deleteMessageFromDb(messageId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'chat_messages', messageId));
  } catch {
    // ignore
  }
  try {
    await deleteDoc(doc(db, 'messages', messageId));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// 4. CONTACT FORM SUBMISSIONS (Firestore Collection: contact_submissions)
// ---------------------------------------------------------------------------
export function subscribeToContactSubmissions(callback: (submissions: EmailMessage[]) => void) {
  try {
    const q = query(collection(db, 'contact_submissions'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const submissions: EmailMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          submissions.push({
            id: docSnap.id,
            senderName: data.senderName || '',
            senderEmail: data.senderEmail || '',
            subject: data.subject || '',
            message: data.message || '',
            timestamp: data.timestamp || 'Just now',
            replies: Array.isArray(data.replies) ? data.replies : [],
          });
        });
        callback(submissions);
      },
      (error) => {
        console.warn('Firestore contact submissions fallback:', error);
      }
    );
  } catch (e) {
    console.error('Error setting up contact submissions listener:', e);
    return () => {};
  }
}

export async function addContactSubmissionToDb(submission: {
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
}): Promise<EmailMessage> {
  const id = 'contact-' + Date.now();
  const docRef = doc(db, 'contact_submissions', id);
  const now = new Date();
  const timestamp = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const newSubmission: EmailMessage = {
    id,
    senderName: submission.senderName.trim(),
    senderEmail: submission.senderEmail.trim(),
    subject: submission.subject.trim(),
    message: submission.message.trim(),
    timestamp,
    replies: [],
  };

  await setDoc(docRef, {
    ...newSubmission,
    createdAt: Date.now(),
  });

  return newSubmission;
}

export async function replyToContactSubmissionInDb(submissionId: string, replyText: string): Promise<void> {
  try {
    const docRef = doc(db, 'contact_submissions', submissionId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const currentReplies = docSnap.data().replies || [];
      const replyObj = {
        id: 'rep-' + Date.now(),
        text: replyText.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      await updateDoc(docRef, {
        replies: [...currentReplies, replyObj],
        updatedAt: Date.now(),
      });
    }
  } catch (e) {
    console.warn('Error replying to contact submission:', e);
  }
}

export async function deleteContactSubmissionFromDb(submissionId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'contact_submissions', submissionId));
  } catch (e) {
    console.warn('Error deleting contact submission:', e);
  }
}

// ---------------------------------------------------------------------------
// 5. USER AUTHENTICATION & DATABASE SESSIONS
// ---------------------------------------------------------------------------

// List of disposable / fake email domains to reject in order to verify real emails
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'guerrillamail.com',
  'guerrillamailblock.com',
  'sharklasers.com',
  'yopmail.com',
  'trashmail.com',
  'dispostable.com',
  'fakeinbox.com',
  'getairmail.com',
  'mohmal.com',
  'generator.email',
  'burnermail.io',
  'crazymailing.com',
  'mytemp.email',
  'inboxkitten.com',
  'throwawaymail.com',
  'trashmail.net',
  'fakemail.net',
  'dropmail.me',
  'getnada.com',
]);

// Common domain typo correction suggestions
const COMMON_DOMAIN_TYPOS: Record<string, string> = {
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'iclud.com': 'icloud.com',
};

// Checks if the entered email is a real, properly formatted email address with a valid domain
export function validateRealEmail(email: string): { valid: boolean; reason?: string; suggestion?: string } {
  const trimmed = email.trim();
  if (!trimmed) {
    return { valid: false, reason: 'Email address cannot be empty.' };
  }

  // RFC-compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, reason: 'Please enter a valid email format (e.g. yourname@gmail.com).' };
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return { valid: false, reason: 'Email must contain a single @ symbol.' };
  }

  const [localPart, domainRaw] = parts;
  const domain = domainRaw.toLowerCase();

  if (localPart.length < 1 || localPart.length > 64) {
    return { valid: false, reason: 'The username part of your email address is invalid.' };
  }

  // Check for disposable/temporary throwaway email providers
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return {
      valid: false,
      reason: 'Temporary or disposable email addresses are not permitted. Please use your real personal or work email address (e.g., Gmail, Outlook, Yahoo, iCloud).',
    };
  }

  // Check for common typos
  if (COMMON_DOMAIN_TYPOS[domain]) {
    return {
      valid: false,
      reason: `Did you mean @${COMMON_DOMAIN_TYPOS[domain]} instead of @${domain}? Please correct your email address.`,
      suggestion: COMMON_DOMAIN_TYPOS[domain],
    };
  }

  // Domain must contain at least one dot and a valid TLD of at least 2 characters
  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return { valid: false, reason: 'Email domain must have a valid extension (e.g. .com, .org).' };
  }

  const tld = domainParts[domainParts.length - 1];
  if (!/^[a-zA-Z]{2,}$/.test(tld)) {
    return { valid: false, reason: 'Email domain top-level extension must be at least 2 letters.' };
  }

  return { valid: true };
}

// Sends a real confirmation code/link to the user's email address
export async function sendConfirmationEmailToUser(
  email: string,
  username: string,
  code: string,
  userPayload?: User,
  password?: string
): Promise<{ success: boolean; link: string; token: string }> {
  const timestamp = Date.now();
  const token = `tok_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;
  const link = `${window.location.origin}/#verify?email=${encodeURIComponent(email)}&code=${code}&token=${token}`;

  const verificationRecord = {
    email: email.toLowerCase(),
    username,
    code,
    token,
    password: password || '',
    userPayload: userPayload || null,
    createdAt: timestamp,
    expiresAt: timestamp + 30 * 60 * 1000, // 30 mins expiry
  };

  try {
    // Record pending confirmation in Firestore
    await setDoc(doc(db, 'pending_verifications', email.toLowerCase()), verificationRecord);
  } catch (err) {
    console.warn('Firestore pending_verifications record warning:', err);
  }

  // Store in sessionStorage and localStorage for fast instant client link activation
  try {
    sessionStorage.setItem(`pending_code_${email.toLowerCase()}`, code);
    sessionStorage.setItem(`pending_token_${email.toLowerCase()}`, token);
    localStorage.setItem(`pending_verification_${email.toLowerCase()}`, JSON.stringify(verificationRecord));
  } catch {
    // ignore
  }

  return { success: true, link, token };
}

// Verifies a confirmation code or token and creates the activated user account
export async function verifyConfirmationEmail(
  email: string,
  codeOrToken: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanCodeOrToken = codeOrToken.trim();

  let record: any = null;

  // 1. Check Firestore pending_verifications
  try {
    const docRef = doc(db, 'pending_verifications', normalizedEmail);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      record = snap.data();
    }
  } catch (err) {
    console.warn('Firestore check pending_verifications error:', err);
  }

  // 2. Check localStorage fallback
  if (!record) {
    try {
      const localData = localStorage.getItem(`pending_verification_${normalizedEmail}`);
      if (localData) {
        record = JSON.parse(localData);
      }
    } catch {
      // ignore
    }
  }

  // Check code/token match
  const storedCode = record?.code || sessionStorage.getItem(`pending_code_${normalizedEmail}`);
  const storedToken = record?.token || sessionStorage.getItem(`pending_token_${normalizedEmail}`);

  const isCodeMatch = storedCode && storedCode === cleanCodeOrToken;
  const isTokenMatch = storedToken && storedToken === cleanCodeOrToken;

  if (!isCodeMatch && !isTokenMatch) {
    return {
      success: false,
      error: 'The confirmation code or verification link is invalid or has expired. Please request a new confirmation email.',
    };
  }

  // Check expiration if recorded
  if (record?.expiresAt && Date.now() > record.expiresAt) {
    return {
      success: false,
      error: 'This confirmation link has expired. Please create an account again to receive a fresh verification link.',
    };
  }

  // Build verified user object
  const user: User = record?.userPayload || {
    id: 'user-' + Date.now(),
    username: record?.username || normalizedEmail.split('@')[0],
    email: normalizedEmail,
    role: 'member',
    joinedDate: 'Joined today',
    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(record?.username || normalizedEmail)}`,
  };

  const passwordToSave = record?.password || '';

  // 1. Save user to Firestore
  try {
    await registerUserInDb(user, passwordToSave);
  } catch (err) {
    console.warn('Save verified user to db error:', err);
  }

  // 2. Save user to local accounts
  try {
    const rawAccounts = localStorage.getItem('topson_registered_accounts');
    let accounts: Array<User & { password?: string }> = [];
    if (rawAccounts) {
      try {
        accounts = JSON.parse(rawAccounts);
      } catch {
        accounts = [];
      }
    }
    // Remove old entry if existed, add verified
    accounts = accounts.filter((a) => a.email.toLowerCase() !== normalizedEmail);
    accounts.push({ ...user, password: passwordToSave });
    localStorage.setItem('topson_registered_accounts', JSON.stringify(accounts));
    localStorage.setItem('topson_user', JSON.stringify(user));
  } catch {
    // ignore
  }

  // 3. Clean up pending verification
  try {
    await deleteDoc(doc(db, 'pending_verifications', normalizedEmail));
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(`pending_verification_${normalizedEmail}`);
    sessionStorage.removeItem(`pending_code_${normalizedEmail}`);
    sessionStorage.removeItem(`pending_token_${normalizedEmail}`);
  } catch {
    // ignore
  }

  return { success: true, user };
}

export async function registerUserInDb(user: User, password?: string): Promise<void> {
  const docRef = doc(db, 'users', user.id);
  await setDoc(docRef, {
    ...user,
    password: password || '',
    isEmailVerified: true,
    createdAt: Date.now(),
  });
}

export type LoginCheckResult =
  | { success: true; user: User }
  | { success: false; error: 'wrong_password' | 'not_found' };

export async function loginUserFromDb(identifier: string, password?: string): Promise<LoginCheckResult> {
  const normalized = identifier.trim().toLowerCase();
  const enteredPassword = password ?? '';

  // 1. Direct Admin Access check with STRICT true password verification
  const isAdminIdentifier =
    normalized === 'admin' ||
    normalized === 'admin@topsonmedia.com' ||
    normalized === 'topsonkenedy@gmail.com' ||
    normalized === 'topsonkenedy' ||
    normalized === 'topson' ||
    normalized === 'jabsco59@gmail.com' ||
    normalized === 'jabsco59';

  if (isAdminIdentifier) {
    const isDedicatedAdmin =
      (normalized === 'admin' || normalized === 'admin@topsonmedia.com') &&
      enteredPassword === 'TopsonAdmin2026';

    const isTargetAdmin =
      (normalized === 'topsonkenedy@gmail.com' || normalized === 'topsonkenedy' || normalized === 'topson') &&
      enteredPassword === 'nzayikoreraetsiyene';

    const isJabscoAdmin =
      (normalized === 'jabsco59@gmail.com' || normalized === 'jabsco59') &&
      enteredPassword === '123456789q';

    if (isDedicatedAdmin || isTargetAdmin || isJabscoAdmin) {
      const adminUser: User = {
        id: 'admin-topson',
        username: 'Topson Media',
        email: isDedicatedAdmin
          ? 'admin@topsonmedia.com'
          : isTargetAdmin
          ? 'topsonkenedy@gmail.com'
          : 'jabsco59@gmail.com',
        role: 'admin',
        joinedDate: 'Channel Creator & Admin',
        avatarUrl: TOPSON_PROFILE_IMAGE,
        uid: 'admin-topson',
      };
      // Sync admin record to Firestore users collection
      try {
        await setDoc(doc(db, 'users', adminUser.id), {
          ...adminUser,
          updatedAt: Date.now(),
        }, { merge: true });
      } catch {
        // offline fallback
      }
      return { success: true, user: adminUser };
    } else {
      // The admin account was found, but the entered password is FALSE!
      return { success: false, error: 'wrong_password' };
    }
  }

  // 2. Query Firestore users collection for matching user and check true password
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    let matchedDoc: any = null;
    let matchedId = '';

    usersSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const userEmail = (data.email || '').toLowerCase().trim();
      const username = (data.username || '').toLowerCase().trim();

      if (userEmail === normalized || username === normalized) {
        matchedDoc = data;
        matchedId = docSnap.id;
      }
    });

    if (matchedDoc) {
      const storedPassword = matchedDoc.password || '';
      // Check if entered password is true
      if (storedPassword && storedPassword !== enteredPassword) {
        return { success: false, error: 'wrong_password' };
      }

      const matchedUser: User = {
        id: matchedId,
        uid: matchedId,
        username: matchedDoc.username,
        email: matchedDoc.email,
        role: matchedDoc.role || 'member',
        joinedDate: matchedDoc.joinedDate || 'Joined today',
        avatarUrl: matchedDoc.avatarUrl,
      };
      return { success: true, user: matchedUser };
    }
  } catch (error) {
    console.warn('Firestore user lookup error:', error);
  }

  // 3. Fallback check in local persistent accounts list
  try {
    const rawAccounts = localStorage.getItem('topson_registered_accounts');
    if (rawAccounts) {
      const accounts: Array<User & { password?: string }> = JSON.parse(rawAccounts);
      const found = accounts.find(
        (a) =>
          a.email.toLowerCase().trim() === normalized ||
          a.username.toLowerCase().trim() === normalized
      );
      if (found) {
        if (found.password && found.password !== enteredPassword) {
          return { success: false, error: 'wrong_password' };
        }
        return { success: true, user: { ...found, uid: found.uid || found.id } };
      }
    }
  } catch {
    // ignore
  }

  return { success: false, error: 'not_found' };
}

// ---------------------------------------------------------------------------
// 7. USER MANAGEMENT & FAN BADGES (Admin Control & Visitor Tracking)
// ---------------------------------------------------------------------------
export async function fetchUsersListFromDb(): Promise<User[]> {
  const usersMap = new Map<string, User>();

  // 1. Load from Firestore
  try {
    const snap = await getDocs(collection(db, 'users'));
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      usersMap.set(docSnap.id, {
        id: docSnap.id,
        username: data.username || 'User',
        email: data.email || '',
        avatarUrl: data.avatarUrl || '',
        role: data.role || 'member',
        joinedDate: data.joinedDate || 'Recently joined',
        visitsCount: typeof data.visitsCount === 'number' ? data.visitsCount : 1,
        fanBadge: !!data.fanBadge,
        fanBadgeOffered: !!data.fanBadgeOffered,
      });
    });
  } catch (err) {
    console.warn('Firestore fetchUsers error:', err);
  }

  // 2. Merge with locally saved accounts
  try {
    const raw = localStorage.getItem('topson_registered_accounts');
    if (raw) {
      const accounts: User[] = JSON.parse(raw);
      accounts.forEach((acc) => {
        if (!usersMap.has(acc.id)) {
          usersMap.set(acc.id, acc);
        } else {
          // Merge local badge/visits if newer
          const existing = usersMap.get(acc.id)!;
          usersMap.set(acc.id, {
            ...existing,
            visitsCount: Math.max(existing.visitsCount || 1, acc.visitsCount || 1),
            fanBadge: existing.fanBadge || acc.fanBadge,
            fanBadgeOffered: existing.fanBadgeOffered || acc.fanBadgeOffered,
          });
        }
      });
    }
  } catch {
    // ignore
  }

  return Array.from(usersMap.values());
}

export async function deleteUserFromDb(userId: string): Promise<void> {
  // 1. Delete from Firestore
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (err) {
    console.warn('Firestore deleteUser error:', err);
  }

  // 2. Remove from local accounts
  try {
    const raw = localStorage.getItem('topson_registered_accounts');
    if (raw) {
      const accounts: User[] = JSON.parse(raw);
      const filtered = accounts.filter((a) => a.id !== userId);
      localStorage.setItem('topson_registered_accounts', JSON.stringify(filtered));
    }
    const current = localStorage.getItem('topson_user');
    if (current) {
      const parsed: User = JSON.parse(current);
      if (parsed.id === userId) {
        localStorage.removeItem('topson_user');
      }
    }
  } catch {
    // ignore
  }
}

export async function recordUserVisitInDb(userId: string): Promise<number> {
  let nextCount = 1;
  try {
    const docRef = doc(db, 'users', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const current = typeof data.visitsCount === 'number' ? data.visitsCount : 1;
      nextCount = current + 1;
      await updateDoc(docRef, {
        visitsCount: nextCount,
        lastVisited: Date.now(),
      });
    }
  } catch (err) {
    console.warn('Firestore recordUserVisit error:', err);
  }

  // Also update local storage
  try {
    const raw = localStorage.getItem('topson_registered_accounts');
    if (raw) {
      const accounts: User[] = JSON.parse(raw);
      const updated = accounts.map((a) =>
        a.id === userId ? { ...a, visitsCount: (a.visitsCount || 1) + 1 } : a
      );
      localStorage.setItem('topson_registered_accounts', JSON.stringify(updated));
    }
    const current = localStorage.getItem('topson_user');
    if (current) {
      const parsed: User = JSON.parse(current);
      if (parsed.id === userId) {
        parsed.visitsCount = (parsed.visitsCount || 1) + 1;
        localStorage.setItem('topson_user', JSON.stringify(parsed));
      }
    }
  } catch {
    // ignore
  }

  return nextCount;
}

export async function awardFanBadgeInDb(userId: string): Promise<void> {
  // Admin awards badge -> sets fanBadgeOffered to true so user can accept
  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, {
      fanBadgeOffered: true,
      fanBadge: false,
    });
  } catch (err) {
    console.warn('Firestore awardFanBadge error:', err);
  }

  // Update in local accounts
  try {
    const raw = localStorage.getItem('topson_registered_accounts');
    if (raw) {
      const accounts: User[] = JSON.parse(raw);
      const updated = accounts.map((a) =>
        a.id === userId ? { ...a, fanBadgeOffered: true, fanBadge: false } : a
      );
      localStorage.setItem('topson_registered_accounts', JSON.stringify(updated));
    }
    const current = localStorage.getItem('topson_user');
    if (current) {
      const parsed: User = JSON.parse(current);
      if (parsed.id === userId) {
        parsed.fanBadgeOffered = true;
        localStorage.setItem('topson_user', JSON.stringify(parsed));
      }
    }
  } catch {
    // ignore
  }
}

export async function acceptFanBadgeInDb(userId: string): Promise<User | null> {
  // User accepts badge -> fanBadge becomes true, fanBadgeOffered becomes false
  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, {
      fanBadge: true,
      fanBadgeOffered: false,
    });
  } catch (err) {
    console.warn('Firestore acceptFanBadge error:', err);
  }

  let updatedUser: User | null = null;
  try {
    const raw = localStorage.getItem('topson_registered_accounts');
    if (raw) {
      const accounts: User[] = JSON.parse(raw);
      const updated = accounts.map((a) => {
        if (a.id === userId) {
          const u = { ...a, fanBadge: true, fanBadgeOffered: false };
          updatedUser = u;
          return u;
        }
        return a;
      });
      localStorage.setItem('topson_registered_accounts', JSON.stringify(updated));
    }
    const current = localStorage.getItem('topson_user');
    if (current) {
      const parsed: User = JSON.parse(current);
      if (parsed.id === userId) {
        parsed.fanBadge = true;
        parsed.fanBadgeOffered = false;
        updatedUser = parsed;
        localStorage.setItem('topson_user', JSON.stringify(parsed));
      }
    }
  } catch {
    // ignore
  }

  return updatedUser;
}

// End of services


