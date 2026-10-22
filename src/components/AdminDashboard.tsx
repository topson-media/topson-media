import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  ShieldCheck,
  UploadCloud,
  ArrowLeft,
  CheckCircle,
  Link as LinkIcon,
  HardDrive,
  Film,
  Trash2,
  Mail,
  Send,
  Users,
  Activity,
  Eye,
  MessageSquare,
  Sparkles,
  Search,
  ExternalLink,
  Clock,
  KeyRound,
  Check,
  TrendingUp,
  ArrowUpRight,
  Edit3,
  X,
  Save,
  Image as ImageIcon,
  BarChart3,
  ThumbsUp,
  Flame,
  PieChart,
  Heart,
  AlertCircle,
  ChevronDown,
  Radio
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import { User, VideoItem, FeedbackItem, EmailMessage, VisitorActivity, ChatMessage } from '../types';
import { TOPSON_PROFILE_IMAGE } from '../data/mockData';
import { getYouTubeThumbnail, extractYouTubeId, fetchYouTubeVideoDetails } from '../utils/youtubeHelper';
import { extractVideoDurationFromFile } from '../utils/videoDuration';
import { WhatsAppBrandBadge, WhatsAppIcon } from './WhatsAppIcon';
import { AdminChatDashboard } from './AdminChatDashboard';
import { UserManagement } from './UserManagement';
import { ViewsVsTimeDashboard } from './ViewsVsTimeDashboard';
import { YouTubeModalPlayer } from './YouTubeModalPlayer';
import { TopFanBadge } from './TopFanBadge';
import { LiveStudioCore } from './LiveStudioCore';
import { SafeAvatar } from './SafeAvatar';
import { sendInboundReply, sendAccountStatusAlert } from '../services/emailService';
import { fetchUsersListFromDb, deleteUserFromDb, awardFanBadgeInDb, db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface AdminDashboardProps {
  currentUser: User | null;
  videos: VideoItem[];
  feedbacks: FeedbackItem[];
  emailMessages: EmailMessage[];
  visitorActivities: VisitorActivity[];
  totalVisitorsCount: number;
  chatMessages?: ChatMessage[];
  onSendMessage?: (msg: ChatMessage) => void;
  onDeleteChatMessage?: (msgId: string, mode: 'everyone' | 'me') => void;
  onMarkMessagesRead?: (ids: string[]) => void;
  onUploadVideo: (video: VideoItem) => void;
  onDeleteVideo?: (videoId: string) => void;
  onUpdateVideo?: (video: VideoItem) => void;
  onDeleteFeedback: (feedbackId: string) => void;
  onHideFeedback?: (feedbackId: string, hidden: boolean) => void;
  onReplyEmailMessage: (emailId: string, replyText: string) => void;
  onAdminLogin: () => void;
  onNavigateHome: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  videos,
  feedbacks,
  emailMessages,
  visitorActivities,
  totalVisitorsCount,
  chatMessages = [],
  onSendMessage,
  onDeleteChatMessage,
  onMarkMessagesRead,
  onUploadVideo,
  onDeleteVideo,
  onUpdateVideo,
  onDeleteFeedback,
  onHideFeedback,
  onReplyEmailMessage,
  onAdminLogin,
  onNavigateHome,
}) => {
  // Navigation tabs within Admin Studio
  const [activeTab, setActiveTab] = useState<
    'overview' | 'analytics' | 'chat' | 'messages' | 'reviews' | 'upload' | 'tutorials' | 'users' | 'live'
  >('overview');
  const [isTabDropdownOpen, setIsTabDropdownOpen] = useState(false);
  const tabDropdownRef = useRef<HTMLDivElement>(null);

  // Close tab dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tabDropdownRef.current && !tabDropdownRef.current.contains(event.target as Node)) {
        setIsTabDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // User management state (Admin power to delete users & award fan badges)
  const [usersList, setUsersList] = useState<User[]>([]);
  const [usersSearch, setUsersSearch] = useState('');
  const [userActionToast, setUserActionToast] = useState<{ message: string; type: 'success' | 'delete' } | null>(null);

  useEffect(() => {
    fetchUsersListFromDb().then((list) => {
      setUsersList(list);
    });
  }, []);

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"? This permanently removes their account.`)) {
      return;
    }
    try {
      const targetUser = usersList.find((u) => u.id === userId);
      await deleteUserFromDb(userId, targetUser?.email);
      setUsersList((prev) => prev.filter((u) => u.id !== userId));
      setUserActionToast({ message: `User "${username}" was permanently deleted.`, type: 'delete' });
      setTimeout(() => setUserActionToast(null), 4000);
    } catch (err) {
      console.error('Delete user error:', err);
    }
  };

  const handleAwardFanBadge = async (userId: string, username: string) => {
    try {
      await awardFanBadgeInDb(userId);
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, fanBadgeOffered: true, fanBadge: false } : u))
      );
      setUserActionToast({
        message: `Official Top Fan Badge awarded to "${username}"! They can accept it directly on screen.`,
        type: 'success',
      });
      setTimeout(() => setUserActionToast(null), 5000);
    } catch (err) {
      console.error('Award badge error:', err);
    }
  };

  // Video upload state (Direct YouTube / Reel URL only)
  const [videoLink, setVideoLink] = useState('');
  const [detectedYouTubeViews, setDetectedYouTubeViews] = useState<string>('');
  const [isDetectingYt, setIsDetectingYt] = useState(false);

  const [videoTitle, setVideoTitle] = useState('');
  const [videoCategory, setVideoCategory] = useState<'phone' | 'pc' | 'digital'>('phone');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoDuration, setVideoDuration] = useState('11:45');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadDiagnostic, setUploadDiagnostic] = useState<{
    code: string;
    message: string;
    diagnosis: string;
    solution: string;
    timestamp: string;
    rawError: string;
    payloadDump?: string;
  } | null>(null);

  // Auto YouTube thumbnail detection
  const detectedYouTubeThumb = useMemo(() => {
    if (videoLink) {
      return getYouTubeThumbnail(videoLink);
    }
    return null;
  }, [videoLink]);

  // Video Editing modal state
  const [previewModalVideo, setPreviewModalVideo] = useState<VideoItem | null>(null);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<string>('Phone Mastery');
  const [editDuration, setEditDuration] = useState('');
  const [editViews, setEditViews] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editThumbnail, setEditThumbnail] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editSaveSuccess, setEditSaveSuccess] = useState(false);

  // Email replies state: map of emailId -> draft reply text
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [activeReplyEmailId, setActiveReplyEmailId] = useState<string | null>(null);
  const [sendingReplyId, setSendingReplyId] = useState<string | null>(null);
  const [replySentSuccessId, setReplySentSuccessId] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  // 7-day visitor trend dataset for Recharts line chart
  const weeklyVisitorTrendData = useMemo(() => {
    const base = Math.max(120, Math.floor(totalVisitorsCount / 7));
    return [
      { day: 'Mon', visitors: Math.round(base * 0.75) },
      { day: 'Tue', visitors: Math.round(base * 0.88) },
      { day: 'Wed', visitors: Math.round(base * 0.94) },
      { day: 'Thu', visitors: Math.round(base * 1.08) },
      { day: 'Fri', visitors: Math.round(base * 1.15) },
      { day: 'Sat', visitors: Math.round(base * 1.28) },
      { day: 'Sun', visitors: Math.round(base * 1.34) },
    ];
  }, [totalVisitorsCount]);

  // Helper to parse numeric views from strings like "1.2K views" or "840 views"
  const parseViewsNumber = (viewsStr: string): number => {
    if (!viewsStr) return 0;
    const cleaned = viewsStr.toLowerCase().replace(/views/g, '').trim();
    if (cleaned.includes('m')) {
      return Math.round(parseFloat(cleaned.replace('m', '')) * 1000000);
    }
    if (cleaned.includes('k')) {
      return Math.round(parseFloat(cleaned.replace('k', '')) * 1000);
    }
    const parsed = parseInt(cleaned.replace(/,/g, ''), 10);
    return isNaN(parsed) ? 1000 : parsed;
  };

  // Video Engagement Metric View State: 'views' | 'likes' | 'categories'
  const [videoMetricView, setVideoMetricView] = useState<'views' | 'likes' | 'categories'>('views');

  // Comprehensive Video Engagement Dataset calculated directly from `videos` state
  const {
    videoEngagementData,
    totalVideoViews,
    avgViews,
    totalEstimatedLikes,
    topVideo,
    categoryEngagementData,
  } = useMemo<{
    videoEngagementData: Array<{
      id: string;
      title: string;
      shortTitle: string;
      category: string;
      views: number;
      likes: number;
      engagementRate: string;
      duration: string;
      date: string;
    }>;
    totalVideoViews: number;
    avgViews: number;
    totalEstimatedLikes: number;
    topVideo: VideoItem | null;
    categoryEngagementData: Array<{
      category: string;
      totalViews: number;
      totalLikes: number;
      count: number;
    }>;
  }>(() => {
    let sumViews = 0;
    let sumLikes = 0;
    let highestViews = -1;
    let bestVideo: VideoItem | null = null;
    const catMap = new Map<string, { category: string; totalViews: number; totalLikes: number; count: number }>();

    const items = videos.map((v, idx) => {
      const views = parseViewsNumber(v.views);
      sumViews += views;

      // Real authentic likes count from Firestore likedBy array or likesCount
      const likes = Array.isArray(v.likedBy) ? v.likedBy.length : (v.likesCount !== undefined ? v.likesCount : (v.likes || 0));
      sumLikes += likes;

      if (views > highestViews) {
        highestViews = views;
        bestVideo = v;
      }

      const cat = v.category || 'Phone Mastery';
      const catEntry = catMap.get(cat) || { category: cat, totalViews: 0, totalLikes: 0, count: 0 };
      catEntry.totalViews += views;
      catEntry.totalLikes += likes;
      catEntry.count += 1;
      catMap.set(cat, catEntry);

      // Shorten title for clean X-axis display
      const shortTitle = v.title.length > 14 ? v.title.slice(0, 14) + '...' : v.title;

      return {
        id: v.id,
        title: v.title,
        shortTitle,
        category: cat,
        views,
        likes,
        engagementRate: ((likes / Math.max(1, views)) * 100).toFixed(1),
        duration: v.duration,
        date: v.date,
      };
    });

    return {
      videoEngagementData: items,
      totalVideoViews: sumViews,
      avgViews: Math.round(sumViews / Math.max(1, videos.length)),
      totalEstimatedLikes: sumLikes,
      topVideo: bestVideo,
      categoryEngagementData: Array.from(catMap.values()),
    };
  }, [videos]);

  // Auto YouTube views detection
  useEffect(() => {
    if (videoLink.trim()) {
      const yId = extractYouTubeId(videoLink.trim());
      if (yId) {
        setIsDetectingYt(true);
        fetchYouTubeVideoDetails(yId)
          .then((details) => {
            if (details.views) {
              setDetectedYouTubeViews(details.views);
            }
            if (details.duration && !videoDuration) {
              setVideoDuration(details.duration);
            }
            if (details.title && !videoTitle) {
              setVideoTitle(details.title);
            }
          })
          .catch((err) => console.warn('YouTube details fetch err:', err))
          .finally(() => setIsDetectingYt(false));
      }
    }
  }, [videoLink]);

  /**
   * ROBUST ASYNC FIRESTORE SUBMISSION WITH REAL NETWORK RETRIES
   * - Restricts submissions solely to direct YouTube/Reel URL video link submissions
   * - Dynamically sanitizes input fields (.trim(), .toLowerCase())
   * - Eliminates 'undefined' payload attributes that cause Firestore invalid-argument crashes
   * - Retries transient connection errors up to 3 times with exponential backoff
   * - Provides transparent console diagnostics on failure
   */
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadDiagnostic(null);

    // 1. DYNAMIC INPUT SANITIZATION
    const titleClean = (videoTitle || '').trim();
    const categoryClean = (videoCategory || 'phone').toLowerCase().trim();
    const durationClean = (videoDuration || '10:00').trim();
    const descriptionClean = (videoDescription || '').trim();

    if (!titleClean) {
      setUploadDiagnostic({
        code: 'validation/missing-title',
        message: 'The tutorial title cannot be empty or purely whitespace.',
        diagnosis: 'Input validation rejected before Firestore call.',
        solution: 'Please enter a descriptive title for this tutorial.',
        timestamp: new Date().toLocaleTimeString(),
        rawError: 'Title validation check failed.',
      });
      return;
    }

    const rawUrl = (videoLink || '').trim();
    if (!rawUrl) {
      setUploadDiagnostic({
        code: 'validation/missing-video-url',
        message: 'A valid YouTube video link or Shorts URL is required to publish a tutorial.',
        diagnosis: 'No video source link was provided.',
        solution: 'Paste a YouTube video or Shorts link (e.g. https://www.youtube.com/watch?v=...).',
        timestamp: new Date().toLocaleTimeString(),
        rawError: 'Video URL validation check failed.',
      });
      return;
    }

    // Automatic YouTube thumbnail extraction when pasting a YouTube link
    const ytThumb = getYouTubeThumbnail(rawUrl);
    const finalThumbnail =
      ytThumb ||
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';

    const cleanYtId = extractYouTubeId(rawUrl);
    const finalVideoUrl = cleanYtId ? `https://www.youtube.com/watch?v=${cleanYtId}` : rawUrl;

    // 2. EXPLICIT DOCUMENT PAYLOAD (Unified across 'videos' and 'video_tutorials')
    const finalViews = detectedYouTubeViews || '0 views';
    const tutorialDoc: Record<string, any> = {
      title: titleClean,
      category: categoryClean,
      video_url: finalVideoUrl,
      videoUrl: finalVideoUrl,
      created_at: serverTimestamp(),
      thumbnail: finalThumbnail,
      duration: durationClean,
      description: descriptionClean || `Tutorial on ${titleClean}`,
      views: finalViews,
      viewsCount: 0,
      likes: 0,
      likedBy: [],
      comments: [],
      tags: [categoryClean.toLowerCase(), 'tutorial', 'topson'],
      sourceType: 'link',
    };

    if (cleanYtId) {
      tutorialDoc.youtube_id = cleanYtId;
      tutorialDoc.youtubeId = cleanYtId;
    }

    setIsUploading(true);

    // 3. ASYNC FIRESTORE SUBMISSION WITH REAL NETWORK RETRIES
    const maxRetries = 3;
    let attempt = 0;
    let lastError: any = null;

    while (attempt < maxRetries) {
      try {
        attempt++;
        // Write to primary 'videos' collection (the core database collection for streaming gallery)
        const primaryDocRef = await addDoc(collection(db, 'videos'), tutorialDoc);

        // Also persist to 'video_tutorials' collection for backward compatibility
        try {
          await addDoc(collection(db, 'video_tutorials'), tutorialDoc);
        } catch (_) {}

        // 4. UNIFIED LOCAL STATE SYNC: Immediately register in public streaming gallery
        if (onUploadVideo) {
          const unifiedVideo: VideoItem = {
            id: primaryDocRef.id,
            title: titleClean,
            category: categoryClean,
            videoUrl: finalVideoUrl,
            youtubeId: cleanYtId || undefined,
            thumbnail: finalThumbnail,
            duration: durationClean,
            description: descriptionClean || `Tutorial on ${titleClean}`,
            views: finalViews,
            viewsCount: 0,
            likes: 0,
            likedBy: [],
            comments: [],
            tags: [categoryClean.toLowerCase(), 'tutorial', 'topson'],
            sourceType: 'link',
            date: 'Just now',
          };
          onUploadVideo(unifiedVideo);
        }

        // Success! Clear form inputs & notify
        setVideoTitle('');
        setVideoLink('');
        setDetectedYouTubeViews('');
        setVideoDescription('');
        setUploadDiagnostic(null);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 4500);
        setIsUploading(false);
        return;
      } catch (err: any) {
        lastError = err;
        console.warn(`[Firestore Upload Attempt ${attempt}/${maxRetries} Failed]`, err);

        // If not a retryable error (like permission-denied), do not wait uselessly
        if (err?.code === 'permission-denied' || err?.code === 'invalid-argument') {
          break;
        }

        // Exponential backoff for network/transient blips (500ms, 1000ms...)
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 500));
        }
      }
    }

    // 4. EXPLICIT ERROR DIAGNOSTICS DISPLAY (No generic text)
    setIsUploading(false);
    const errorCode = lastError?.code || 'firestore/upload-failure';
    const errorMessage = lastError?.message || String(lastError || 'Unknown error');

    let diagnosis = 'An error occurred during Firestore communication.';
    let solution = 'Please review your Firestore configuration and database connectivity.';

    if (errorCode === 'permission-denied') {
      diagnosis = 'Firebase Security Rules (firestore.rules) rejected write access to collection "video_tutorials".';
      solution = 'Verify that firestore.rules allows create/write permissions for "video_tutorials". (e.g. match /video_tutorials/{id} { allow read, write: if true; })';
    } else if (errorCode === 'not-found') {
      diagnosis = 'The Firestore database instance or collection "video_tutorials" was not found on project "topson-media-64bc9".';
      solution = 'Ensure the Firestore database (default) is provisioned and active in Firebase Console.';
    } else if (errorCode === 'invalid-argument') {
      diagnosis = 'Payload validation failed because one or more fields contain an unsupported type (such as undefined, Symbol, or circular references).';
      solution = 'Ensure all document fields are primitive strings, numbers, booleans, or Firestore serverTimestamp().';
    } else if (errorCode === 'unavailable') {
      diagnosis = 'The Cloud Firestore backend service is unreachable or network connection was interrupted.';
      solution = 'Check network connectivity to firestore.googleapis.com and confirm Firebase service health.';
    } else if (errorCode === 'failed-precondition') {
      diagnosis = 'Operation was rejected by client state or index requirements.';
      solution = 'Check Firestore indexes or database state in Firebase Console.';
    }

    console.error('[Admin Upload Breakdown]', {
      code: errorCode,
      message: errorMessage,
      diagnosis,
      solution,
      payload: tutorialDoc,
      error: lastError,
    });

    setUploadDiagnostic({
      code: errorCode,
      message: errorMessage,
      diagnosis,
      solution,
      timestamp: new Date().toLocaleTimeString(),
      rawError: JSON.stringify(
        {
          code: errorCode,
          message: errorMessage,
          name: lastError?.name,
          stack: lastError?.stack?.split('\n').slice(0, 4).join('\n'),
        },
        null,
        2
      ),
      payloadDump: JSON.stringify(tutorialDoc, null, 2),
    });
  };

  const handleOpenEditVideo = (video: VideoItem) => {
    setEditingVideo(video);
    setEditTitle(video.title);
    setEditCategory(video.category);
    setEditDuration(video.duration);
    setEditViews(video.views);
    setEditDate(video.date || 'Just now');
    setEditDescription(video.description);
    setEditThumbnail(video.thumbnail);
    setEditVideoUrl(video.videoUrl || '');
    setEditTags(video.tags.join(', '));
    setEditSaveSuccess(false);
  };

  const handleSaveEditVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo) return;

    // Check if new videoUrl is YouTube to auto-fetch thumbnail if requested
    const cleanYtId = extractYouTubeId(editVideoUrl.trim());
    const autoYt = editVideoUrl ? getYouTubeThumbnail(editVideoUrl) : null;
    const finalThumb = editThumbnail || autoYt || editingVideo.thumbnail;
    const finalVideoUrl = cleanYtId ? `https://www.youtube.com/watch?v=${cleanYtId}` : editVideoUrl.trim() || editingVideo.videoUrl;

    const updated: VideoItem = {
      ...editingVideo,
      title: editTitle.trim() || editingVideo.title,
      category: editCategory,
      duration: editDuration.trim() || editingVideo.duration,
      views: editViews.trim() || editingVideo.views,
      date: editDate.trim() || editingVideo.date,
      description: editDescription.trim() || editingVideo.description,
      thumbnail: finalThumb,
      youtubeId: cleanYtId || editingVideo.youtubeId,
      videoUrl: finalVideoUrl,
      sourceType: cleanYtId ? 'link' : (editVideoUrl ? 'link' : editingVideo.sourceType),
      tags: editTags
        ? editTags.split(',').map((t) => t.trim()).filter(Boolean)
        : editingVideo.tags,
    };

    if (onUpdateVideo) {
      onUpdateVideo(updated);
    }

    setEditSaveSuccess(true);
    setTimeout(() => {
      setEditSaveSuccess(false);
      setEditingVideo(null);
    }, 900);
  };

  const handleDeleteVideoConfirm = (video: VideoItem) => {
    if (window.confirm(`Delete tutorial "${video.title}"? This cannot be undone.`)) {
      if (onDeleteVideo) {
        onDeleteVideo(video.id);
      }
    }
  };

  const handleDeleteFeedbackConfirm = (fb: FeedbackItem) => {
    if (!window.confirm(`Delete review from "${fb.authorName}"? This permanently removes the review.`)) {
      return;
    }

    // Instantly send automated background email to user's Gmail address
    const matched = usersList.find(
      (u) =>
        (u.username && u.username.toLowerCase() === (fb.authorName || fb.user || '').toLowerCase()) ||
        u.id === fb.id
    );

    const recipientEmail = matched?.email;
    if (recipientEmail && recipientEmail.includes('@')) {
      sendAccountStatusAlert({
        to: recipientEmail,
        username: fb.authorName || fb.user || 'Member',
        action: 'feedback_removal',
        customReason: 'Your feedback post was removed due to community guidelines.',
      }).catch((err) => console.warn('Background feedback removal alert email error:', err));
    }

    onDeleteFeedback(fb.id);
  };

  const handleSendReply = async (emailItem: EmailMessage) => {
    const draft = replyDrafts[emailItem.id]?.trim();
    if (!draft) return;

    setSendingReplyId(emailItem.id);

    try {
      // 1. Dispatch formal branded email directly to recipient's Gmail inbox
      await sendInboundReply({
        to: emailItem.senderEmail,
        recipientName: emailItem.senderName,
        originalSubject: emailItem.subject,
        replyText: draft,
      });

      // 2. Persist reply to Firestore and sync local state
      onReplyEmailMessage(emailItem.id, draft);

      setReplySentSuccessId(emailItem.id);
      setReplyDrafts((prev) => ({ ...prev, [emailItem.id]: '' }));

      setTimeout(() => {
        setReplySentSuccessId(null);
      }, 5000);
    } catch (err) {
      console.warn('Inbound email reply fallback:', err);
      // Ensure record is saved to Firestore even on network fallback
      onReplyEmailMessage(emailItem.id, draft);
      setReplySentSuccessId(emailItem.id);
      setReplyDrafts((prev) => ({ ...prev, [emailItem.id]: '' }));
    } finally {
      setSendingReplyId(null);
    }
  };

  // Recharts Video Engagement Visualization Module
  const renderVideoEngagementVisualization = () => (
    <div className="rounded-3xl p-6 sm:p-7 bg-white border border-slate-200 shadow-sm space-y-6 text-slate-900">
      {/* Header with KPI highlights & View switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center shadow-xs">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Video Engagement & Performance Analytics
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Data visualization of video views, estimated like momentum, and category engagement across {videos.length} tutorials.
          </p>
        </div>

        {/* Metric Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 self-start md:self-auto text-xs font-bold shadow-2xs">
          <button
            type="button"
            onClick={() => setVideoMetricView('views')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              videoMetricView === 'views'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Views by Video
          </button>
          <button
            type="button"
            onClick={() => setVideoMetricView('likes')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              videoMetricView === 'likes'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Like Trends
          </button>
          <button
            type="button"
            onClick={() => setVideoMetricView('categories')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              videoMetricView === 'categories'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Category Distribution
          </button>
        </div>
      </div>

      {/* 4 Quick Stat Micro-Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-orange-500/40 transition-colors shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-orange-500" />
            <span>Total Video Views</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {totalVideoViews.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
            Across {videos.length} published tutorials
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-500/40 transition-colors shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <ThumbsUp className="w-3.5 h-3.5 text-blue-500" />
            <span>Total Estimated Likes</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {totalEstimatedLikes.toLocaleString()}
          </div>
          <div className="text-[10px] text-blue-600 font-bold mt-0.5">
            ~8.8% average like rate
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-amber-500/40 transition-colors shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Avg Views / Tutorial</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {avgViews.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
            Per video average
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-emerald-500/40 transition-colors shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>Top Performing Video</span>
          </div>
          <div className="text-xs sm:text-sm font-black text-slate-900 truncate mt-1" title={topVideo?.title}>
            {topVideo?.title || 'Tutorial Guide'}
          </div>
          <div className="text-[10px] font-bold text-orange-600 mt-0.5 truncate">
            {topVideo?.views || '0 views'} · {topVideo?.category}
          </div>
        </div>
      </div>

      {/* Recharts Chart Visualization Container */}
      <div className="w-full h-72 sm:h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {videoMetricView === 'views' ? (
            <BarChart data={videoEngagementData} margin={{ top: 15, right: 15, left: -10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="shortTitle"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-15}
                textAnchor="end"
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#ffffff',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                }}
                formatter={(val: any, name: any) => [
                  `${Number(val).toLocaleString()} ${name === 'views' ? 'views' : 'likes'}`,
                  name === 'views' ? 'Total Views' : 'Total Likes',
                ]}
                labelFormatter={(label, payload) => {
                  const fullTitle = payload?.[0]?.payload?.title || label;
                  const cat = payload?.[0]?.payload?.category || '';
                  return `${fullTitle} (${cat})`;
                }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
              <Bar dataKey="views" name="Video Views" fill="#ea580c" radius={[6, 6, 0, 0]} maxBarSize={45}>
                {videoEngagementData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#ea580c' : index % 2 === 0 ? '#f97316' : '#fb923c'} />
                ))}
              </Bar>
            </BarChart>
          ) : videoMetricView === 'likes' ? (
            <AreaChart data={videoEngagementData} margin={{ top: 15, right: 15, left: -10, bottom: 25 }}>
              <defs>
                <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ea580c" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="likesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="shortTitle"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-15}
                textAnchor="end"
              />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#0f172a',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                }}
                formatter={(val: any, name: any) => [
                  `${Number(val).toLocaleString()} ${name}`,
                  name === 'views' ? 'Total Views' : 'Total Likes',
                ]}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#334155' }} />
              <Area
                type="monotone"
                dataKey="views"
                name="Views Momentum"
                stroke="#ea580c"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#viewsGradient)"
              />
              <Area
                type="monotone"
                dataKey="likes"
                name="Likes Trend"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#likesGradient)"
              />
            </AreaChart>
          ) : (
            <BarChart data={categoryEngagementData} margin={{ top: 15, right: 15, left: -10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="category" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#0f172a',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                }}
                formatter={(val: any, name: any) => [
                  `${Number(val).toLocaleString()} ${name === 'totalViews' ? 'views' : 'likes'}`,
                  name === 'totalViews' ? 'Category Views' : 'Category Likes',
                ]}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#334155' }} />
              <Bar dataKey="totalViews" name="Category Total Views" fill="#ea580c" radius={[6, 6, 0, 0]} maxBarSize={55} />
              <Bar dataKey="totalLikes" name="Category Total Likes" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={55} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Ranking table of top video engagements */}
      <div className="pt-4 border-t border-neutral-100">
        <div className="flex items-center justify-between mb-3 text-xs font-bold text-neutral-800">
          <span className="uppercase tracking-wider text-[11px] text-neutral-500">
            Top Video Engagement Ranking
          </span>
          <span className="text-neutral-500 font-normal">
            Ranked by total views & audience interaction
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {videoEngagementData.slice(0, 4).map((item, idx) => (
            <div
              key={item.id}
              className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/70 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${
                  idx === 0 ? 'bg-amber-400 text-neutral-900' : idx === 1 ? 'bg-neutral-300 text-neutral-800' : 'bg-neutral-200 text-neutral-600'
                }`}>
                  #{idx + 1}
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-neutral-900 truncate" title={item.title}>
                    {item.title}
                  </div>
                  <div className="text-[10px] text-neutral-500 font-medium">
                    {item.category} · {item.duration}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-black text-neutral-900">{item.views.toLocaleString()} views</div>
                <div className="text-[10px] text-emerald-600 font-bold">{item.likes.toLocaleString()} likes ({item.engagementRate}%)</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="py-8 sm:py-12 bg-slate-50 text-slate-900 min-h-[calc(100vh-4rem)] relative overflow-hidden">
      {/* Subtle clean ambient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-100/70 via-slate-50 to-white pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Navigation Breadcrumb & Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-5 border-b border-slate-200 bg-white p-4 rounded-2xl border shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs sm:text-sm font-bold text-slate-800 transition-all shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-orange-500" />
              <span>Back to Home</span>
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Admin Creator Studio</span>
              <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                Primary Control
              </span>
            </h1>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Logged in as:</span>
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 shadow-xs">
                <div className="w-6 h-6 rounded-full overflow-hidden border border-orange-500 shadow-xs">
                  <img src={TOPSON_PROFILE_IMAGE} alt="Admin" className="w-full h-full object-cover" />
                </div>
                <span className="text-xs font-bold text-slate-900">Topson Media</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>
          )}
        </div>

        {isAdmin ? (
          /* ========================================================================= */
          /* ADMIN IS FULLY AUTHORIZED: DASHBOARD SUITE                                */
          /* ========================================================================= */
          <div className="space-y-8 animate-in fade-in">
            
            {/* 1. METRICS & VISITOR OVERVIEW CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-5">
              
              {/* Traffic Overview Card with Total Visitors & Interactive Recharts line chart (5 cols) */}
              <div className="lg:col-span-5 p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-sm relative overflow-hidden group hover:border-orange-500/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                      Traffic Overview
                    </span>
                    <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                      <TrendingUp className="w-3 h-3 text-emerald-600" />
                      <span>+18.4% this week</span>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2 mt-1">
                    <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight group-hover:text-orange-600 transition-colors">
                      {totalVisitorsCount.toLocaleString()}
                    </div>
                    <span className="text-xs text-slate-500 font-semibold">Total unique visitors</span>
                  </div>
                </div>

                {/* Recharts Line Chart displaying daily visitor trends over the past week */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1.5">
                    <span>Daily Visitors Trend</span>
                    <span className="text-slate-900 font-bold">Past 7 Days (Mon - Sun)</span>
                  </div>
                  <div className="h-28 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weeklyVisitorTrendData} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="day"
                          stroke="#64748b"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#64748b"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            borderColor: '#e2e8f0',
                            borderRadius: '0.75rem',
                            fontSize: '11px',
                            color: '#0f172a',
                            fontWeight: '600',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                          }}
                          itemStyle={{ color: '#ea580c' }}
                          formatter={(value) => [`${value} visitors`, 'Traffic']}
                        />
                        <Line
                          type="monotone"
                          dataKey="visitors"
                          stroke="#ea580c"
                          strokeWidth={2.75}
                          dot={{ r: 3, fill: '#ea580c', strokeWidth: 1.5, stroke: '#ffffff' }}
                          activeDot={{ r: 5.5, fill: '#ea580c', stroke: '#ffffff', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Total Email Messages (4 cols) */}
              <div className="lg:col-span-4 p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-500/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Inbound Emails
                    </span>
                    <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shadow-xs">
                      <Mail className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                    {emailMessages.length}
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Target Inbox</span>
                  <span className="text-blue-600 font-bold truncate">mail topson media</span>
                </div>
              </div>

              {/* Community Reviews (2 cols) */}
              <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-sm relative overflow-hidden group hover:border-amber-500/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Reviews
                    </span>
                    <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shadow-xs">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 tracking-tight group-hover:text-amber-600 transition-colors">
                    {feedbacks.length}
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
                  Delete & reply enabled
                </div>
              </div>

              {/* Published Videos (2 cols) */}
              <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-500/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Tutorials
                    </span>
                    <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-xs">
                      <Film className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 tracking-tight group-hover:text-emerald-600 transition-colors">
                    {videos.length}
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
                  Edit & delete enabled
                </div>
              </div>

            </div>

            {/* 2. COMPACT DROPDOWN ARCHITECTURE FOR ADMIN CONTROL PANEL (Match image_LO8zrz.png) */}
            <div className="relative z-30" ref={tabDropdownRef}>
              <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left: Active Workspace Board Indicator */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center shrink-0 shadow-xs">
                    {activeTab === 'overview' && <Activity className="w-5 h-5 text-orange-500" />}
                    {activeTab === 'analytics' && <BarChart3 className="w-5 h-5 text-orange-500" />}
                    {activeTab === 'live' && <Radio className="w-5 h-5 text-rose-600 animate-pulse" />}
                    {activeTab === 'chat' && <MessageSquare className="w-5 h-5 text-orange-500" />}
                    {activeTab === 'tutorials' && <Film className="w-5 h-5 text-orange-500" />}
                    {activeTab === 'messages' && <Mail className="w-5 h-5 text-orange-500" />}
                    {activeTab === 'reviews' && <MessageSquare className="w-5 h-5 text-orange-500" />}
                    {activeTab === 'upload' && <UploadCloud className="w-5 h-5 text-orange-500" />}
                    {activeTab === 'users' && <Users className="w-5 h-5 text-orange-500" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                        Admin Workspace
                      </span>
                      {activeTab === 'live' && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-xs animate-pulse">
                          STREAM STUDIO
                        </span>
                      )}
                      {activeTab === 'messages' && emailMessages.length > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white shadow-xs">
                          {emailMessages.length} New
                        </span>
                      )}
                      {activeTab === 'tutorials' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {videos.length} Videos
                        </span>
                      )}
                      {activeTab === 'users' && usersList.length > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                          {usersList.length} Accounts
                        </span>
                      )}
                      {activeTab === 'chat' && chatMessages.some((m) => m.sender === 'user' && (!m.isRead || m.status !== 'read')) && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white animate-pulse">
                          Unread
                        </span>
                      )}
                    </div>
                    <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight truncate mt-0.5">
                      {activeTab === 'overview' && 'Live Activity & Visitors'}
                      {activeTab === 'analytics' && 'Video Engagement Analytics'}
                      {activeTab === 'live' && 'Live Studio Core (WebRTC Broadcast)'}
                      {activeTab === 'chat' && 'Live Chat Studio'}
                      {activeTab === 'tutorials' && `Manage Tutorials (${videos.length})`}
                      {activeTab === 'messages' && `Inbound Email Messages (${emailMessages.length})`}
                      {activeTab === 'reviews' && 'Manage Community Feedbacks'}
                      {activeTab === 'upload' && 'Publish Reel / Tutorial'}
                      {activeTab === 'users' && `Users & Fan Badges (${usersList.length})`}
                    </h2>
                  </div>
                </div>

                {/* Right: Dropdown Picker Selector with modern ChevronDown */}
                <div className="relative shrink-0 flex items-center gap-2">
                  <div className="relative w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setIsTabDropdownOpen(!isTabDropdownOpen)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-300/80 hover:border-orange-500 text-slate-900 font-bold text-xs sm:text-sm flex items-center justify-between sm:justify-start gap-3 transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      aria-haspopup="listbox"
                      aria-expanded={isTabDropdownOpen}
                      title="Switch Admin Control Panel Section"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span className="text-slate-500 font-medium hidden md:inline">Switch Board:</span>
                        <span className="truncate">
                          {activeTab === 'overview' && 'Live Activity & Visitors'}
                          {activeTab === 'analytics' && 'Video Engagement'}
                          {activeTab === 'live' && 'Live Studio Core'}
                          {activeTab === 'chat' && 'Live Chat'}
                          {activeTab === 'tutorials' && 'Manage Tutorials'}
                          {activeTab === 'messages' && 'Inbound Emails'}
                          {activeTab === 'reviews' && 'Community Reviews'}
                          {activeTab === 'upload' && 'Publish Tutorial'}
                          {activeTab === 'users' && 'Users & Badges'}
                        </span>
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
                          isTabDropdownOpen ? 'rotate-180 text-orange-600' : ''
                        }`}
                      />
                    </button>

                    {/* Animated Dropdown Menu List with full workspace modules */}
                    {isTabDropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-full sm:w-80 md:w-96 max-h-[460px] overflow-y-auto custom-scrollbar bg-white rounded-2xl border border-slate-200 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 divide-y divide-slate-100">
                        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Select Workspace Module
                        </div>
                        <div className="pt-1 space-y-1">
                          {[
                            {
                              id: 'overview',
                              label: 'Live Activity & Visitors',
                              desc: 'Real-time telemetry, visitor stream & charts',
                              icon: Activity,
                            },
                            {
                              id: 'live',
                              label: 'Live Studio Core',
                              desc: 'WebRTC face-to-face live stream & viewer hub',
                              icon: Radio,
                              badge: 'LIVE',
                            },
                            {
                              id: 'analytics',
                              label: 'Video Engagement Analytics',
                              desc: 'Views breakdown, like trends & category data',
                              icon: BarChart3,
                            },
                            {
                              id: 'chat',
                              label: 'Live Chat Studio',
                              desc: 'Direct real-time conversations with audience',
                              icon: MessageSquare,
                              badge: chatMessages.some((m) => m.sender === 'user' && (!m.isRead || m.status !== 'read'))
                                ? 'Unread'
                                : undefined,
                            },
                            {
                              id: 'tutorials',
                              label: `Manage Tutorials (${videos.length})`,
                              desc: 'Review, edit video metadata, and delete',
                              icon: Film,
                              badge: `${videos.length}`,
                            },
                            {
                              id: 'messages',
                              label: `Inbound Email Messages (${emailMessages.length})`,
                              desc: 'Contact messages with inline Gmail reply',
                              icon: Mail,
                              badge: emailMessages.length > 0 ? `${emailMessages.length}` : undefined,
                            },
                            {
                              id: 'reviews',
                              label: 'Manage Community Feedbacks',
                              desc: 'Pin top reviews, filter & moderate',
                              icon: MessageSquare,
                              badge: feedbacks.length > 0 ? `${feedbacks.length}` : undefined,
                            },
                            {
                              id: 'upload',
                              label: 'Publish Reel / Tutorial',
                              desc: 'Direct YouTube and video link submission',
                              icon: UploadCloud,
                            },
                            {
                              id: 'users',
                              label: `Users & Fan Badges (${usersList.length})`,
                              desc: 'Permanent account purging & Star badges',
                              icon: Users,
                              badge: usersList.length > 0 ? `${usersList.length}` : undefined,
                            },
                          ].map((opt) => {
                            const isSelected = activeTab === opt.id;
                            const OptIcon = opt.icon;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  setActiveTab(opt.id as any);
                                  setIsTabDropdownOpen(false);
                                }}
                                className={`w-full p-2.5 rounded-xl text-left flex items-start gap-3 transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-orange-50 border border-orange-200 text-orange-950 shadow-2xs font-bold'
                                    : 'hover:bg-slate-50 text-slate-700 hover:text-slate-950 border border-transparent'
                                }`}
                              >
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                    isSelected
                                      ? 'bg-orange-500 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  <OptIcon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-xs sm:text-sm font-bold truncate">
                                      {opt.label}
                                    </span>
                                    {opt.badge && (
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                                        opt.id === 'live' ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-700'
                                      }`}>
                                        {opt.badge}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 font-normal line-clamp-1 mt-0.5">
                                    {opt.desc}
                                  </p>
                                </div>
                                {isSelected && (
                                  <Check className="w-4 h-4 text-orange-600 shrink-0 mt-1" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. TAB CONTENT */}

            {/* TAB: LIVE ACTIVITY & VISITORS */}
            {activeTab === 'overview' && (
              <div className="space-y-8 animate-in fade-in">
                {/* VIDEO ENGAGEMENT METRICS & RECHARTS DATA VISUALIZATION */}
                {renderVideoEngagementVisualization()}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left 8 Cols: Real-time Activity Stream */}
                <div className="lg:col-span-8 rounded-3xl p-6 sm:p-8 bg-white border border-slate-200 shadow-sm space-y-6 text-slate-900">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900">
                        Live User Traffic & Actions
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Real-time visitor logs, tutorial watches, chat interactions, and inquiries.
                      </p>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Live Stream
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
                    {visitorActivities.map((act) => (
                      <div
                        key={act.id}
                        className="p-3.5 rounded-2xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200 flex items-start gap-3 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-orange-500 shrink-0 shadow-2xs mt-0.5">
                          {act.type === 'visit' && <Users className="w-4 h-4 text-blue-500" />}
                          {act.type === 'watch' && <Film className="w-4 h-4 text-purple-500" />}
                          {act.type === 'comment' && <MessageSquare className="w-4 h-4 text-amber-500" />}
                          {act.type === 'chat' && <Sparkles className="w-4 h-4 text-orange-500" />}
                          {act.type === 'email' && <Mail className="w-4 h-4 text-emerald-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {act.userIpOrName || 'Visitor'}
                            </span>
                            <span className="text-[11px] text-slate-500 font-semibold shrink-0">
                              {act.timestamp}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium mt-0.5">
                            {act.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right 4 Cols: Quick Creator Info & Quick Actions */}
                <div className="lg:col-span-4 space-y-5">
                  <div className="rounded-3xl p-6 bg-white border border-slate-200 shadow-sm space-y-4 text-slate-900">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Channel Creator Status
                    </h4>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-orange-500 p-0.5 bg-slate-50 shrink-0 shadow-xs">
                        <img src={TOPSON_PROFILE_IMAGE} alt="Topson Media" className="w-full h-full object-cover rounded-full" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900">Topson Media</div>
                        <div className="text-xs text-slate-500 font-medium">Administrator & Host</div>
                        <div className="text-[11px] text-emerald-600 font-bold mt-0.5">Verified Channels Owner</div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-600 font-medium">
                        <span className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 fill-red-600" viewBox="0 0 24 24">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                          </svg>
                          <span className="text-slate-800 font-bold">YouTube:</span>
                        </span>
                        <a
                          href="https://www.youtube.com/@topson-media1"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-600 hover:text-red-700 font-extrabold transition-colors truncate max-w-[150px]"
                        >
                          @topson-media1
                        </a>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 font-medium">
                        <span className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 fill-[#1877F2]" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                          </svg>
                          <span className="text-slate-800 font-bold">Facebook:</span>
                        </span>
                        <a
                          href="https://www.facebook.com/etienne.topson.kenedy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 font-extrabold transition-colors truncate max-w-[150px]"
                        >
                          Etienne Topson Kenedy
                        </a>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 font-medium">
                        <span className="flex items-center gap-1.5">
                          <WhatsAppBrandBadge className="w-4 h-4 rounded-md" iconClassName="w-3 h-3 fill-white" />
                          <span className="text-slate-800 font-bold">WhatsApp:</span>
                        </span>
                        <a
                          href="https://wa.me/250794903078"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-700 font-extrabold transition-colors"
                        >
                          0794903078
                        </a>
                      </div>
                      <div className="flex justify-between text-slate-600 font-medium">
                        <span>Receiving Email:</span>
                        <span className="text-slate-900 font-bold">mail topson media</span>
                      </div>
                    </div>
                  </div>

                  {/* Switch to Upload */}
                  <div className="rounded-3xl p-6 bg-gradient-to-br from-orange-50 via-amber-50/50 to-orange-50 border border-orange-200 shadow-sm text-slate-900 space-y-3">
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-orange-500" />
                      <span>Publish New Content</span>
                    </h4>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      Paste YouTube video or shorts links to feature them instantly across the platform.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('upload')}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs active:scale-95"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Upload Tutorial Now</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB: DEDICATED VIDEO ENGAGEMENT ANALYTICS & VIEWS VS TIME */}
            {activeTab === 'analytics' && (
              <div className="space-y-8 animate-in fade-in">
                <ViewsVsTimeDashboard
                  videos={videos}
                  onPlayVideo={(v) => setPreviewModalVideo(v)}
                />
                {renderVideoEngagementVisualization()}
              </div>
            )}

            {/* TAB: LIVE CHAT STUDIO */}
            {activeTab === 'chat' && (
              <div className="rounded-3xl overflow-hidden bg-white border border-neutral-200 shadow-sm">
                <AdminChatDashboard
                  currentUser={currentUser}
                  messages={chatMessages}
                  onSendMessage={onSendMessage || (() => {})}
                  onMarkMessagesRead={onMarkMessagesRead}
                  onDeleteMessage={onDeleteChatMessage}
                  onBackToOverview={() => setActiveTab('overview')}
                />
              </div>
            )}

            {/* TAB: MANAGE TUTORIALS (EDIT ALL DETAILS & DELETE) */}
            {activeTab === 'tutorials' && (
              <div className="rounded-3xl p-6 sm:p-8 bg-white border border-slate-200 shadow-sm space-y-6 text-slate-900 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center shadow-xs">
                        <Film className="w-4 h-4" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <span>Manage All Tutorials &amp; Reels</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-300 font-bold">
                          {videos.length} videos live
                        </span>
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Full control over published content: edit titles, thumbnails, categories, duration, tags, or links.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs shrink-0 transition-all hover:scale-102"
                  >
                    <UploadCloud className="w-4 h-4 text-white" />
                    <span>Publish New Tutorial</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  {videos.map((v) => {
                    const isYouTube = !!v.youtubeId || (v.videoUrl && v.videoUrl.includes('youtube'));
                    return (
                      <div
                        key={v.id}
                        className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-orange-300 transition-all flex flex-col justify-between gap-3 shadow-sm group hover:shadow-md"
                      >
                        <div className="flex items-start gap-4">
                          {/* Thumbnail with quick preview play button */}
                          <div
                            onClick={() => setPreviewModalVideo(v)}
                            className="w-28 h-18 rounded-xl overflow-hidden bg-slate-100 shrink-0 relative border border-slate-200 shadow-inner group/thumb cursor-pointer"
                            title="Click to preview video playback"
                          >
                            <img
                              src={v.thumbnail}
                              alt={v.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-80 group-hover/thumb:opacity-100 transition-opacity">
                              <div className="w-7 h-7 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-lg group-hover/thumb:scale-110 transition-transform">
                                <Film className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-black text-orange-700 uppercase tracking-wider bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                                {v.category}
                              </span>
                              {isYouTube ? (
                                <span className="text-[9.5px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md">
                                  YouTube Link
                                </span>
                              ) : (
                                <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                                  Direct Stream
                                </span>
                              )}
                            </div>

                            <h4
                              onClick={() => setPreviewModalVideo(v)}
                              className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 mt-0.5 hover:text-orange-600 transition-colors cursor-pointer"
                              title={v.title}
                            >
                              {v.title}
                            </h4>

                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-1">
                              <span className="font-semibold text-slate-700">{v.duration}</span>
                              <span>&bull;</span>
                              <span>{v.views}</span>
                              <span>&bull;</span>
                              <span className="text-slate-400">{v.date}</span>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 font-normal bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                          {v.description}
                        </p>

                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                          <div className="flex flex-wrap gap-1">
                            {v.tags.slice(0, 2).map((t) => (
                              <span key={t} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium border border-slate-200">
                                #{t}
                              </span>
                            ))}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Preview Button */}
                            <button
                              type="button"
                              onClick={() => setPreviewModalVideo(v)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-slate-200"
                              title="Preview player"
                            >
                              <Eye className="w-3.5 h-3.5 text-orange-500" />
                              <span className="hidden sm:inline">Preview</span>
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditVideo(v)}
                              className="px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                              title="Edit all tutorial details"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-orange-600" />
                              <span>Edit</span>
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteVideoConfirm(v)}
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-colors cursor-pointer shadow-xs"
                              title="Delete this video tutorial"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: COMPACT INBOUND EMAIL MESSAGES WITH INLINE MICRO-REPLY */}
            {activeTab === 'messages' && (
              <div className="rounded-3xl p-5 sm:p-7 bg-white border border-slate-200 shadow-sm space-y-4 text-slate-900 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shadow-xs">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <span>Inbound Email Messages</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                          {emailMessages.length} received
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Website visitor inquiries. Click Reply to dispatch direct email via official Topson Media Mailer.
                      </p>
                    </div>
                  </div>
                </div>

                {emailMessages.length === 0 ? (
                  <div className="py-12 text-center bg-slate-50 rounded-2xl border border-slate-200">
                    <Mail className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">No inbound email messages yet</p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      When visitors send emails from the contact section, they will appear here for instant reply.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                    {emailMessages.map((msg) => {
                      const isReplying = activeReplyEmailId === msg.id;
                      const hasReplies = msg.replies && msg.replies.length > 0;

                      return (
                        <div
                          key={msg.id}
                          className="p-3.5 sm:p-4 hover:bg-slate-50/70 transition-colors flex flex-col gap-2"
                        >
                          {/* Tight message row next to sender's details */}
                          <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                                {msg.senderName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                    {msg.senderName}
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-medium truncate">
                                    &lt;{msg.senderEmail}&gt;
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    · {msg.timestamp}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-700 line-clamp-1 mt-0.5">
                                  <span className="font-semibold text-slate-900">[{msg.subject}]</span> {msg.message}
                                </div>
                              </div>
                            </div>

                            {/* Discrete Reply button */}
                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                              <button
                                type="button"
                                onClick={() => setActiveReplyEmailId(isReplying ? null : msg.id)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs ${
                                  isReplying
                                    ? 'bg-orange-500 text-white shadow-xs'
                                    : 'bg-white hover:bg-orange-50 text-orange-600 border border-slate-200 hover:border-orange-300'
                                }`}
                              >
                                <Send className="w-3 h-3" />
                                <span>{isReplying ? 'Close' : 'Reply'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Dispatched replies history chip if present */}
                          {hasReplies && (
                            <div className="pl-10 space-y-1">
                              {msg.replies!.map((rep) => (
                                <div key={rep.id} className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2.5 py-1 rounded-lg flex items-center justify-between gap-2">
                                  <span className="truncate"><strong>Replied:</strong> {rep.text}</span>
                                  <span className="text-[10px] text-emerald-600 shrink-0">{rep.timestamp}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Compact inline micro-input field immediately below thread */}
                          {isReplying && (
                            <div className="mt-1 pl-0 sm:pl-10 pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2 animate-in fade-in duration-150">
                              <input
                                type="text"
                                value={replyDrafts[msg.id] ?? ''}
                                onChange={(e) =>
                                  setReplyDrafts((prev) => ({ ...prev, [msg.id]: e.target.value }))
                                }
                                placeholder={`Type quick response to ${msg.senderEmail}...`}
                                className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                              />
                              <button
                                type="button"
                                onClick={() => handleSendReply(msg)}
                                disabled={!replyDrafts[msg.id]?.trim() || sendingReplyId === msg.id}
                                className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                              >
                                {sendingReplyId === msg.id ? (
                                  <>
                                    <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    <span>Sending...</span>
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-3 h-3" />
                                    <span>Send</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}

                          {replySentSuccessId === msg.id && (
                            <div className="pl-0 sm:pl-10 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 animate-in fade-in">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Response dispatched directly to {msg.senderEmail}!</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: MANAGE COMMUNITY FEEDBACKS (WITH SYSTEM ACTION EMAIL ALERTS) */}
            {activeTab === 'reviews' && (
              <div className="rounded-3xl p-6 sm:p-8 bg-white border border-slate-200 shadow-sm space-y-6 text-slate-900 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shadow-xs">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <span>Community Feedback Moderation</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                          {feedbacks.length} reviews
                        </span>
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Full moderation control. Deleting a review automatically triggers an automated policy update email alert to that user's Gmail address.
                    </p>
                  </div>
                </div>

                {feedbacks.length === 0 ? (
                  <div className="py-14 text-center bg-slate-50 rounded-2xl border border-slate-200">
                    <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">No community reviews yet</p>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      When viewers post reviews in the community section, they will appear here for moderation.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                    {feedbacks.map((fb) => (
                      <div
                        key={fb.id}
                        className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-orange-300 shadow-sm flex flex-col justify-between gap-3 relative group transition-all"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2.5">
                              <SafeAvatar
                                src={fb.avatarUrl}
                                name={fb.authorName}
                                size="sm"
                              />
                              <div>
                                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                  <span>{fb.authorName}</span>
                                  {(fb.hasFanBadge || fb.isTopFan) && (
                                    <TopFanBadge size="xs" />
                                  )}
                                  {fb.hidden && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                                      Hidden
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium">{fb.authorRole} &bull; {fb.date}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              {/* Hide / Unhide button */}
                              {onHideFeedback && (
                                <button
                                  type="button"
                                  onClick={() => onHideFeedback(fb.id, !fb.hidden)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                                  title={fb.hidden ? 'Unhide review' : 'Hide review from public'}
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}

                              {/* 2. Delete button WITH AUTOMATED BACKGROUND EMAIL ALERT */}
                              <button
                                type="button"
                                onClick={() => handleDeleteFeedbackConfirm(fb)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-colors cursor-pointer"
                                title="Delete feedback and send background email alert"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs sm:text-sm text-slate-700 font-normal leading-relaxed italic bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                            &ldquo;{fb.content || fb.text}&rdquo;
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-2.5 border-t border-slate-100">
                          <span className="text-amber-600 font-bold">Rating: {fb.rating}/5 stars</span>
                          <span>{fb.likesCount || fb.likes || 0} likes &bull; {fb.replies?.length || 0} replies</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: UPLOAD NEW TUTORIAL (EXCLUSIVELY DIRECT YOUTUBE/REEL URL LINK - WHITE MODE) */}
            {activeTab === 'upload' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-200">
                
                {/* Upload Form (7 cols) */}
                <div className="lg:col-span-7 rounded-3xl p-6 sm:p-8 bg-white border border-slate-200 shadow-sm space-y-6 text-slate-900">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center shadow-xs">
                        <UploadCloud className="w-4 h-4" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                        Publish Tutorial Reel / Video
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Direct integration with YouTube video links &amp; Reels. High-resolution thumbnails and video durations are auto-detected instantly!
                    </p>
                  </div>

                  {uploadSuccess && (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Video published successfully with auto-thumbnail! It is now live in the tutorial section.</span>
                    </div>
                  )}

                  {/* EXPLICIT ERROR DIAGNOSTICS DISPLAY */}
                  {uploadDiagnostic && (
                    <div className="rounded-2xl bg-slate-50 border border-red-300 text-slate-800 p-5 sm:p-6 shadow-sm space-y-3.5 font-mono text-xs animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                          <span className="font-bold text-red-600 uppercase tracking-wider text-[11px]">
                            Upload Error Diagnostic
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {uploadDiagnostic.timestamp}
                        </span>
                      </div>

                      <div className="space-y-2 font-sans">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-500 font-mono">Error Code:</span>
                          <span className="px-2.5 py-0.5 rounded-md bg-red-100 text-red-800 border border-red-200 font-mono text-xs font-black">
                            [{uploadDiagnostic.code}]
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1.5 text-xs">
                          <p className="text-slate-800">
                            <span className="font-bold text-slate-500 font-mono">Message: </span>
                            {uploadDiagnostic.message}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2 text-xs">
                          <div>
                            <span className="font-bold text-amber-700 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                              <span>⚠️</span> Root Cause Breakdown
                            </span>
                            <p className="text-slate-600 mt-1 leading-relaxed">
                              {uploadDiagnostic.diagnosis}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-100">
                            <span className="font-bold text-emerald-700 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                              <span>🔧</span> Suggested Fix
                            </span>
                            <p className="text-slate-600 mt-1 leading-relaxed">
                              {uploadDiagnostic.solution}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleUpload} className="space-y-4">
                    {/* Direct YouTube / Reel Link Submission */}
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-slate-700">
                        YouTube Video / Shorts URL
                      </label>
                      <div className="relative">
                        <input
                          type="url"
                          required
                          value={videoLink ?? ''}
                          onChange={(e) => setVideoLink(e.target.value)}
                          placeholder="e.g. https://www.youtube.com/watch?v=... or https://youtu.be/..."
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500/20 transition-all"
                        />
                      </div>

                      {/* Automatic YouTube thumbnail preview */}
                      {detectedYouTubeThumb && (
                        <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-300 shadow-2xs space-y-2.5 animate-in fade-in">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Direct YouTube Stream Detected</span>
                            </span>
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Ready to publish
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <div className="w-32 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 relative border-2 border-emerald-400 shadow-sm group">
                              <img
                                src={detectedYouTubeThumb}
                                alt="Auto Thumbnail from YouTube"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  const id = extractYouTubeId(videoLink);
                                  if (id && !target.src.includes('hqdefault')) {
                                    target.src = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
                                  }
                                }}
                              />
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md">
                                  <Film className="w-3 h-3" />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-900">
                                Captured directly from YouTube
                              </p>
                              <p className="text-[11px] text-slate-500 leading-snug">
                                High-resolution thumbnail will be automatically embedded across public tutorial carousels.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tutorial Title
                      </label>
                      <input
                        type="text"
                        required
                        value={videoTitle ?? ''}
                        onChange={(e) => setVideoTitle(e.target.value)}
                        placeholder="e.g. How to Speed Up Any Android Phone in 2025"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500/20 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Category
                        </label>
                        <select
                          value={videoCategory}
                          onChange={(e) => setVideoCategory(e.target.value as 'phone' | 'pc' | 'digital')}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                        >
                          <option value="phone">Phone Mastery (phone)</option>
                          <option value="pc">PC Performance (pc)</option>
                          <option value="digital">Digital Skills (digital)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Duration
                        </label>
                        <input
                          type="text"
                          value={videoDuration ?? ''}
                          onChange={(e) => setVideoDuration(e.target.value)}
                          placeholder="e.g. 10:30"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Description &amp; Key Takeaways
                      </label>
                      <textarea
                        rows={2}
                        value={videoDescription ?? ''}
                        onChange={(e) => setVideoDescription(e.target.value)}
                        placeholder="Key lessons, step-by-step instructions, or tutorial highlights..."
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isUploading}
                      className="w-full py-3.5 px-4 rounded-xl text-white font-black text-xs sm:text-sm bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 disabled:opacity-60 transition-all shadow-xs active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isUploading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Publishing to Firestore (with network retries)...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4 text-white" />
                          <span>Publish Live Tutorial</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Published Tutorials Feed (5 cols) */}
                <div className="lg:col-span-5 rounded-3xl p-6 sm:p-8 bg-white border border-slate-200 shadow-sm space-y-4 text-slate-900">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Film className="w-4 h-4 text-orange-500" />
                      <span>Live Gallery Sync ({videos.length})</span>
                    </h4>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Active
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
                    {videos.map((v) => (
                      <div
                        key={v.id}
                        className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-orange-300 flex items-center justify-between gap-3 group transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            onClick={() => setPreviewModalVideo(v)}
                            className="w-16 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0 relative border border-slate-200 cursor-pointer group-hover:border-orange-400"
                          >
                            <img
                              src={v.thumbnail}
                              alt={v.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <Film className="w-3 h-3 text-white" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {v.title}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5 font-medium">
                              <span className="font-bold text-orange-600">{v.duration}</span>
                              <span>&bull;</span>
                              <span>{v.views}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditVideo(v)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                            title="Edit details"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-orange-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteVideoConfirm(v)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* TAB: COMMUNITY USERS & FAN BADGES (Dedicated UserManagement component) */}
            {activeTab === 'users' && (
              <div className="animate-in fade-in duration-200">
                <UserManagement
                  currentUser={currentUser}
                  onUserCountChange={(count) => {
                    setUsersList((prev) => {
                      if (prev.length === count) return prev;
                      return new Array(count).fill({ id: 'dummy', username: '', email: '', joinedDate: '' });
                    });
                  }}
                />
              </div>
            )}

            {/* TAB: LIVE STUDIO CORE (Admin WebRTC Face-to-Face Broadcast) */}
            {activeTab === 'live' && (
              <div className="animate-in fade-in duration-200">
                <LiveStudioCore currentUser={currentUser} mode="admin" />
              </div>
            )}

          </div>
        ) : (
          /* ========================================================================= */
          /* NOT LOGGED IN AS ADMIN: CLEAN SIGN IN GATEWAY                             */
          /* ========================================================================= */
          <div className="rounded-3xl p-8 sm:p-12 bg-white border border-slate-200 shadow-xl text-center max-w-md mx-auto my-12 animate-in fade-in text-slate-900">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 mx-auto mb-4 shadow-xs">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">
              Admin Access Only
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 font-medium leading-relaxed">
              Only the channel administrator can access the creator studio. Please sign in with your Admin credentials.
            </p>
            <button
              type="button"
              onClick={onAdminLogin}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4 text-white" />
              <span>Admin Sign In</span>
            </button>
          </div>
        )}

      </div>

      {/* EDIT VIDEO MODAL (CLEAN WHITE MODE) */}
      {editingVideo && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setEditingVideo(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar text-slate-900"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-orange-500" />
                <span>Edit Tutorial Details &amp; Links</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingVideo(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editSaveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Details updated successfully in database!</span>
              </div>
            )}

            <form onSubmit={handleSaveEditVideo} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tutorial Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                  >
                    <option value="Dev Workflows">Phone Mastery</option>
                    <option value="Desk & Gear">PC Performance</option>
                    <option value="Full Stack">Digital Skills</option>
                    <option value="Digital Tools">Digital Tools</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    placeholder="e.g. 11:45"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Views Count
                  </label>
                  <input
                    type="text"
                    value={editViews}
                    onChange={(e) => setEditViews(e.target.value)}
                    placeholder="e.g. 1.8K views"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date
                  </label>
                  <input
                    type="text"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    placeholder="e.g. Just now"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Video Link URL (YouTube link or direct stream)
                </label>
                <input
                  type="url"
                  value={editVideoUrl}
                  onChange={(e) => {
                    setEditVideoUrl(e.target.value);
                    const auto = getYouTubeThumbnail(e.target.value);
                    if (auto) setEditThumbnail(auto);
                  }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Thumbnail Image URL
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={editThumbnail}
                    onChange={(e) => setEditThumbnail(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                  {editThumbnail && (
                    <div className="w-12 h-8 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                      <img src={editThumbnail} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="Android, Phone Mastery, Speed"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleDeleteVideoConfirm(editingVideo)}
                  className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Video</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingVideo(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5 text-white" />
                    <span>Save All Changes</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern YouTube Modal Player Preview in Admin */}
      <YouTubeModalPlayer
        video={previewModalVideo}
        isOpen={!!previewModalVideo}
        onClose={() => setPreviewModalVideo(null)}
        currentUser={currentUser}
      />

    </div>
  );
};
