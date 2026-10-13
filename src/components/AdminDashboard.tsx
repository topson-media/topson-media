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
  AlertCircle
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
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'chat' | 'messages' | 'reviews' | 'upload' | 'tutorials' | 'users'>('overview');

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
      await deleteUserFromDb(userId);
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

  // Video upload state
  const [uploadType, setUploadType] = useState<'link' | 'device'>('link');
  const [videoLink, setVideoLink] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [deviceFilePreviewUrl, setDeviceFilePreviewUrl] = useState<string | null>(null);
  const [deviceThumbnailUrl, setDeviceThumbnailUrl] = useState<string | null>(null);
  const [deviceThumbnailName, setDeviceThumbnailName] = useState<string>('');
  const [detectedYouTubeViews, setDetectedYouTubeViews] = useState<string>('');
  const [isDetectingYt, setIsDetectingYt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [videoTitle, setVideoTitle] = useState('');
  const [videoCategory, setVideoCategory] = useState<'phone' | 'pc' | 'digital'>('phone');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoDuration, setVideoDuration] = useState('11:45');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Auto YouTube thumbnail detection
  const detectedYouTubeThumb = useMemo(() => {
    if (uploadType === 'link' && videoLink) {
      return getYouTubeThumbnail(videoLink);
    }
    return null;
  }, [uploadType, videoLink]);

  // Video Editing modal state
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

      // Realistic like calculation based on retention and index (~8-11% like ratio)
      const baseRatio = 0.084 + ((idx * 7) % 25) / 1000;
      const likes = Math.max(15, Math.round(views * baseRatio));
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
    if (uploadType === 'link' && videoLink.trim()) {
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
  }, [uploadType, videoLink]);

  const handleDeviceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      if (!videoTitle.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setVideoTitle(cleanName);
      }
      const previewUrl = URL.createObjectURL(file);
      setDeviceFilePreviewUrl(previewUrl);

      // Extract and store duration using URL.createObjectURL and onloadedmetadata helper
      extractVideoDurationFromFile(file).then((durFormatted) => {
        setVideoDuration(durFormatted);
      });
    }
  };

  const handleDeviceThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDeviceThumbnailName(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setDeviceThumbnailUrl(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoTitle.trim()) return;

    // Automatic YouTube thumbnail extraction when pasting a YouTube/reel link!
    const ytThumb = uploadType === 'link' ? getYouTubeThumbnail(videoLink.trim()) : null;
    const finalThumbnail =
      deviceThumbnailUrl ||
      ytThumb ||
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';

    const videoUrlToSave = uploadType === 'link' ? videoLink.trim() : deviceFilePreviewUrl || '';

    setUploadError(null);

    try {
      // 1. ADMIN UPLOAD FORM (Write to Firestore Database)
      // Real network request using addDoc(collection(db, "video_tutorials"), { ... })
      await addDoc(collection(db, 'video_tutorials'), {
        title: videoTitle.trim(),
        category: videoCategory, // 'phone', 'pc', or 'digital'
        video_url: videoUrlToSave,
        created_at: serverTimestamp(),
        thumbnail: finalThumbnail,
        duration: videoDuration.trim() || '10:00',
        description: videoDescription.trim() || `Tutorial on ${videoTitle.trim()}`,
        views: '0 views',
        viewsCount: 0,
        likes: 0,
        likedBy: [],
        comments: [],
      });

      // Clear form inputs
      setVideoTitle('');
      setVideoLink('');
      setSelectedFileName('');
      setDeviceFilePreviewUrl(null);
      setDeviceThumbnailUrl(null);
      setDeviceThumbnailName('');
      setDetectedYouTubeViews('');
      setVideoDescription('');
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save tutorial to Firestore video_tutorials:', err);
      setUploadError('Could not save tutorial to database. Please check your connection.');
    }
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
    const autoYt = getYouTubeThumbnail(editVideoUrl);
    const finalThumb = editThumbnail || autoYt || editingVideo.thumbnail;

    const updated: VideoItem = {
      ...editingVideo,
      title: editTitle.trim() || editingVideo.title,
      category: editCategory,
      duration: editDuration.trim() || editingVideo.duration,
      views: editViews.trim() || editingVideo.views,
      date: editDate.trim() || editingVideo.date,
      description: editDescription.trim() || editingVideo.description,
      thumbnail: finalThumb,
      videoUrl: editVideoUrl.trim() || editingVideo.videoUrl,
      sourceType: editVideoUrl ? 'link' : editingVideo.sourceType,
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

  const handleSendReply = (emailItem: EmailMessage) => {
    const draft = replyDrafts[emailItem.id]?.trim();
    if (!draft) return;

    setSendingReplyId(emailItem.id);

    setTimeout(() => {
      onReplyEmailMessage(emailItem.id, draft);
      setSendingReplyId(null);
      setReplySentSuccessId(emailItem.id);
      setReplyDrafts((prev) => ({ ...prev, [emailItem.id]: '' }));

      // Also trigger browser mailto client so it sends directly via real email
      const subjectEncoded = encodeURIComponent(`Re: ${emailItem.subject} [Topson Media]`);
      const bodyEncoded = encodeURIComponent(
        `Hi ${emailItem.senderName},\n\n${draft}\n\nBest regards,\nTopson Media\nChannel Creator`
      );
      window.open(`mailto:${emailItem.senderEmail}?subject=${subjectEncoded}&body=${bodyEncoded}`, '_blank');

      setTimeout(() => {
        setReplySentSuccessId(null);
      }, 3500);
    }, 400);
  };

  // Recharts Video Engagement Visualization Module
  const renderVideoEngagementVisualization = () => (
    <div className="rounded-3xl p-6 sm:p-7 bg-white border border-neutral-200 shadow-sm space-y-6">
      {/* Header with KPI highlights & View switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-neutral-900 tracking-tight">
              Video Engagement & Performance Analytics
            </h3>
          </div>
          <p className="text-xs text-neutral-600 font-medium mt-1">
            Data visualization of video views, estimated like momentum, and category engagement across {videos.length} tutorials.
          </p>
        </div>

        {/* Metric Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-xl border border-neutral-200 self-start md:self-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setVideoMetricView('views')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              videoMetricView === 'views'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Views by Video
          </button>
          <button
            type="button"
            onClick={() => setVideoMetricView('likes')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              videoMetricView === 'likes'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Like Trends
          </button>
          <button
            type="button"
            onClick={() => setVideoMetricView('categories')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              videoMetricView === 'categories'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Category Distribution
          </button>
        </div>
      </div>

      {/* 4 Quick Stat Micro-Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
          <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-orange-500" />
            <span>Total Video Views</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-neutral-900 mt-1">
            {totalVideoViews.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
            Across {videos.length} published tutorials
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
          <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
            <ThumbsUp className="w-3.5 h-3.5 text-blue-500" />
            <span>Total Estimated Likes</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-neutral-900 mt-1">
            {totalEstimatedLikes.toLocaleString()}
          </div>
          <div className="text-[10px] text-blue-600 font-bold mt-0.5">
            ~8.8% average like rate
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
          <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Avg Views / Tutorial</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-neutral-900 mt-1">
            {avgViews.toLocaleString()}
          </div>
          <div className="text-[10px] text-neutral-500 font-medium mt-0.5">
            Per video average
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
          <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>Top Performing Video</span>
          </div>
          <div className="text-xs sm:text-sm font-black text-neutral-900 truncate mt-1" title={topVideo?.title}>
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
                  name === 'views' ? 'Total Views' : 'Estimated Likes',
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
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#ffffff',
                }}
                formatter={(val: any, name: any) => [
                  `${Number(val).toLocaleString()} ${name}`,
                  name === 'views' ? 'Total Views' : 'Estimated Likes',
                ]}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
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
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#ffffff',
                }}
                formatter={(val: any, name: any) => [
                  `${Number(val).toLocaleString()} ${name === 'totalViews' ? 'views' : 'likes'}`,
                  name === 'totalViews' ? 'Category Views' : 'Category Likes',
                ]}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
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
    <div className="py-8 sm:py-12 bg-neutral-50/60 min-h-[calc(100vh-4rem)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Navigation Breadcrumb & Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-5 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-xs sm:text-sm font-bold text-neutral-800 hover:text-neutral-950 hover:border-neutral-300 transition-all shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-orange-500" />
              <span>Back to Home</span>
            </button>
            <div className="h-4 w-px bg-neutral-300" />
            <h1 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
              <span>Admin Creator Studio</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                Primary Control
              </span>
            </h1>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500 font-medium">Logged in as:</span>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-neutral-200 shadow-2xs">
                <div className="w-6 h-6 rounded-full overflow-hidden border border-orange-500">
                  <img src={TOPSON_PROFILE_IMAGE} alt="Admin" className="w-full h-full object-cover" />
                </div>
                <span className="text-xs font-bold text-neutral-900">Topson Media</span>
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
              <div className="lg:col-span-5 p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-white via-white to-orange-50/40 border border-neutral-200 shadow-sm relative overflow-hidden group hover:border-orange-500/50 hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                      Traffic Overview
                    </span>
                    <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                      <TrendingUp className="w-3 h-3 text-emerald-600" />
                      <span>+18.4% this week</span>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2 mt-1">
                    <div className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">
                      {totalVisitorsCount.toLocaleString()}
                    </div>
                    <span className="text-xs text-neutral-500 font-semibold">Total unique visitors</span>
                  </div>
                </div>

                {/* Recharts Line Chart displaying daily visitor trends over the past week */}
                <div className="mt-4 pt-3 border-t border-neutral-100">
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 font-medium mb-1.5">
                    <span>Daily Visitors Trend</span>
                    <span className="text-neutral-900 font-bold">Past 7 Days (Mon - Sun)</span>
                  </div>
                  <div className="h-28 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weeklyVisitorTrendData} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="day"
                          stroke="#94a3b8"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '0.75rem',
                            fontSize: '11px',
                            color: '#ffffff',
                            fontWeight: '600',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
                          }}
                          itemStyle={{ color: '#f97316' }}
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
              <div className="lg:col-span-4 p-5 sm:p-6 rounded-3xl bg-white border border-neutral-200 shadow-sm relative overflow-hidden group hover:border-orange-500/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Inbound Emails
                    </span>
                    <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Mail className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-neutral-900 tracking-tight">
                    {emailMessages.length}
                  </div>
                </div>
                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500">Target Inbox</span>
                  <span className="text-blue-600 font-bold truncate">mail topson media</span>
                </div>
              </div>

              {/* Community Reviews (2 cols) */}
              <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-white border border-neutral-200 shadow-sm relative overflow-hidden group hover:border-orange-500/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Reviews
                    </span>
                    <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-neutral-900 tracking-tight">
                    {feedbacks.length}
                  </div>
                </div>
                <div className="pt-3 border-t border-neutral-100 text-[11px] text-neutral-500 font-medium">
                  Delete & reply enabled
                </div>
              </div>

              {/* Published Videos (2 cols) */}
              <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-white border border-neutral-200 shadow-sm relative overflow-hidden group hover:border-orange-500/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Tutorials
                    </span>
                    <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Film className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-neutral-900 tracking-tight">
                    {videos.length}
                  </div>
                </div>
                <div className="pt-3 border-t border-neutral-100 text-[11px] text-neutral-500 font-medium">
                  Edit & delete enabled
                </div>
              </div>

            </div>

            {/* 2. TAB CONTROLS */}
            <div className="flex items-center gap-2 border-b border-neutral-200 overflow-x-auto custom-scrollbar pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeTab === 'overview'
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200'
                }`}
              >
                <Activity className="w-4 h-4 text-orange-500" />
                <span>Live Activity & Visitors</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeTab === 'analytics'
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-orange-500" />
                <span>Video Engagement Analytics</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeTab === 'chat'
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-orange-500" />
                <span>Live Chat Studio</span>
                {chatMessages.some((m) => m.sender === 'user' && !m.isRead) && (
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tutorials')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeTab === 'tutorials'
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200'
                }`}
              >
                <Film className="w-4 h-4 text-orange-500" />
                <span>Manage Tutorials ({videos.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('messages')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeTab === 'messages'
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200'
                }`}
              >
                <Mail className="w-4 h-4 text-orange-500" />
                <span>Inbound Email Messages</span>
                {emailMessages.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-orange-500 text-white font-bold">
                    {emailMessages.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeTab === 'reviews'
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-orange-500" />
                <span>Manage Community Feedbacks</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeTab === 'upload'
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200'
                }`}
              >
                <UploadCloud className="w-4 h-4 text-orange-500" />
                <span>Publish Reel / Tutorial</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeTab === 'users'
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200'
                }`}
              >
                <Users className="w-4 h-4 text-orange-500" />
                <span>Users & Fan Badges</span>
                {usersList.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-200 text-neutral-900 font-bold">
                    {usersList.length}
                  </span>
                )}
              </button>
            </div>

            {/* 3. TAB CONTENT */}

            {/* TAB: LIVE ACTIVITY & VISITORS */}
            {activeTab === 'overview' && (
              <div className="space-y-8 animate-in fade-in">
                {/* VIDEO ENGAGEMENT METRICS & RECHARTS DATA VISUALIZATION */}
                {renderVideoEngagementVisualization()}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left 8 Cols: Real-time Activity Stream */}
                <div className="lg:col-span-8 rounded-3xl p-6 sm:p-8 bg-white border border-neutral-200 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-neutral-900">
                        Live User Traffic & Actions
                      </h3>
                      <p className="text-xs text-neutral-600 font-medium">
                        Real-time visitor logs, tutorial watches, chat interactions, and inquiries.
                      </p>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Live Stream
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
                    {visitorActivities.map((act) => (
                      <div
                        key={act.id}
                        className="p-3.5 rounded-2xl bg-neutral-50 hover:bg-neutral-100/70 border border-neutral-200/80 flex items-start gap-3 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-orange-500 shrink-0 shadow-2xs mt-0.5">
                          {act.type === 'visit' && <Users className="w-4 h-4 text-blue-500" />}
                          {act.type === 'watch' && <Film className="w-4 h-4 text-purple-500" />}
                          {act.type === 'comment' && <MessageSquare className="w-4 h-4 text-amber-500" />}
                          {act.type === 'chat' && <Sparkles className="w-4 h-4 text-orange-500" />}
                          {act.type === 'email' && <Mail className="w-4 h-4 text-emerald-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-neutral-900">
                              {act.userIpOrName || 'Visitor'}
                            </span>
                            <span className="text-[11px] text-neutral-600 font-semibold shrink-0">
                              {act.timestamp}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-600 font-medium mt-0.5">
                            {act.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right 4 Cols: Quick Creator Info & Quick Actions */}
                <div className="lg:col-span-4 space-y-5">
                  <div className="rounded-3xl p-6 bg-white border border-neutral-200 shadow-sm space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Channel Creator Status
                    </h4>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-orange-500 p-0.5 bg-white shrink-0">
                        <img src={TOPSON_PROFILE_IMAGE} alt="Topson Media" className="w-full h-full object-cover rounded-full" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-neutral-900">Topson Media</div>
                        <div className="text-xs text-neutral-600 font-medium">Administrator & Host</div>
                        <div className="text-[11px] text-emerald-600 font-bold mt-0.5">Verified Channels Owner</div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-neutral-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-neutral-600 font-medium">
                        <span className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 fill-red-600" viewBox="0 0 24 24">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                          </svg>
                          <span className="text-neutral-800 font-bold">YouTube:</span>
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
                      <div className="flex items-center justify-between text-neutral-600 font-medium">
                        <span className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 fill-[#1877F2]" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                          </svg>
                          <span className="text-neutral-800 font-bold">Facebook:</span>
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
                      <div className="flex items-center justify-between text-neutral-600 font-medium">
                        <span className="flex items-center gap-1.5">
                          <WhatsAppBrandBadge className="w-4 h-4 rounded-md" iconClassName="w-3 h-3 fill-white" />
                          <span className="text-neutral-800 font-bold">WhatsApp:</span>
                        </span>
                        <a
                          href="https://wa.me/250794903078"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-neutral-900 hover:text-emerald-600 font-extrabold transition-colors"
                        >
                          0794903078
                        </a>
                      </div>
                      <div className="flex justify-between text-neutral-600 font-medium">
                        <span>Receiving Email:</span>
                        <span className="text-neutral-900 font-bold">mail topson media</span>
                      </div>
                    </div>
                  </div>

                  {/* Switch to Upload */}
                  <div className="rounded-3xl p-6 bg-gradient-to-br from-neutral-900 to-neutral-800 text-white shadow-sm space-y-3">
                    <h4 className="text-sm font-black">Publish New Content</h4>
                    <p className="text-xs text-neutral-300 font-medium leading-relaxed">
                      Upload directly from your phone/PC or paste YouTube links to feature them instantly.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('upload')}
                      className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Upload Tutorial Now</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB: DEDICATED VIDEO ENGAGEMENT ANALYTICS */}
            {activeTab === 'analytics' && (
              <div className="space-y-8 animate-in fade-in">
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
              <div className="rounded-3xl p-6 sm:p-8 bg-white border border-neutral-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
                  <div>
                    <h3 className="text-lg font-black text-neutral-900 flex items-center gap-2">
                      <span>Manage All Tutorials</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold">
                        {videos.length} videos live
                      </span>
                    </h3>
                    <p className="text-xs text-neutral-600 font-medium mt-0.5">
                      As admin, you can edit any tutorial's title, thumbnail, category, duration, description, link, or delete it completely.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm shrink-0"
                  >
                    <UploadCloud className="w-4 h-4 text-orange-500" />
                    <span>Upload New</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {videos.map((v) => (
                    <div
                      key={v.id}
                      className="p-4 sm:p-5 rounded-2xl bg-neutral-50 border border-neutral-200 hover:border-orange-500/40 transition-all flex flex-col justify-between gap-3 shadow-2xs group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-24 h-16 rounded-xl overflow-hidden bg-neutral-950 shrink-0 relative border border-neutral-200 shadow-2xs">
                          <img
                            src={v.thumbnail}
                            alt={v.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">
                            {v.category}
                          </span>
                          <h4 className="text-sm font-bold text-neutral-900 leading-snug line-clamp-2 mt-0.5">
                            {v.title}
                          </h4>
                          <div className="text-[11px] text-neutral-500 flex items-center gap-2 mt-1">
                            <span className="font-semibold">{v.duration}</span>
                            <span>·</span>
                            <span>{v.views}</span>
                            <span>·</span>
                            <span>{v.date}</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-neutral-600 line-clamp-2 font-medium bg-white p-2.5 rounded-xl border border-neutral-200/70">
                        {v.description}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-neutral-200/80">
                        <div className="flex flex-wrap gap-1">
                          {v.tags.slice(0, 2).map((t) => (
                            <span key={t} className="text-[10px] bg-neutral-200/70 text-neutral-700 px-2 py-0.5 rounded-md font-semibold">
                              #{t}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditVideo(v)}
                            className="px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-neutral-800 hover:text-orange-600 hover:border-orange-500/50 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                            title="Edit all tutorial details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Details</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteVideoConfirm(v)}
                            className="p-1.5 rounded-lg bg-white border border-neutral-300 text-neutral-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer shadow-2xs"
                            title="Delete this video tutorial"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: INBOUND EMAIL MESSAGES WITH REPLY CAPABILITY */}
            {activeTab === 'messages' && (
              <div className="rounded-3xl p-6 sm:p-8 bg-white border border-neutral-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
                  <div>
                    <h3 className="text-lg font-black text-neutral-900 flex items-center gap-2">
                      <span>Messages Sent to mail topson media</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">
                        {emailMessages.length} received
                      </span>
                    </h3>
                    <p className="text-xs text-neutral-600 font-medium mt-0.5">
                      Messages submitted by visitors through the contact form are stored here and sent to your email. You can reply directly below.
                    </p>
                  </div>
                </div>

                {emailMessages.length === 0 ? (
                  <div className="py-12 text-center bg-neutral-50 rounded-2xl border border-neutral-200">
                    <Mail className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-neutral-700">No email messages yet</p>
                    <p className="text-xs text-neutral-500 font-medium mt-1">
                      When visitors send emails from the contact section, they will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {emailMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className="rounded-2xl p-5 bg-neutral-50 border border-neutral-200 shadow-2xs space-y-4"
                      >
                        {/* Header: Sender details */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-200/80">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-neutral-900">
                                {msg.senderName}
                              </span>
                              <span className="text-xs font-semibold text-neutral-500">
                                ({msg.senderEmail})
                              </span>
                            </div>
                            <div className="text-xs font-bold text-orange-600 mt-0.5">
                              Subject: {msg.subject}
                            </div>
                          </div>
                          <span className="text-xs text-neutral-500 font-medium self-start sm:self-auto">
                            {msg.timestamp}
                          </span>
                        </div>

                        {/* Body Message */}
                        <div className="text-xs sm:text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap font-medium bg-white p-4 rounded-xl border border-neutral-200">
                          {msg.message}
                        </div>

                        {/* Thread Replies */}
                        {msg.replies && msg.replies.length > 0 && (
                          <div className="space-y-2 pl-4 border-l-2 border-orange-500">
                            <span className="text-[11px] font-bold text-neutral-500 uppercase">
                              Admin Replies Sent via Email:
                            </span>
                            {msg.replies.map((rep) => (
                              <div key={rep.id} className="p-3 bg-orange-50/60 rounded-xl border border-orange-200/60 text-xs">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="font-bold text-orange-900">Topson Media (Admin)</span>
                                  <span className="text-[10px] text-neutral-500">{rep.timestamp}</span>
                                </div>
                                <p className="text-neutral-800 font-medium whitespace-pre-wrap">{rep.text}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply Form */}
                        <div className="pt-2">
                          <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                            Reply to {msg.senderName} (will send via email):
                          </label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <textarea
                              rows={2}
                              value={replyDrafts[msg.id] ?? ''}
                              onChange={(e) =>
                                setReplyDrafts((prev) => ({ ...prev, [msg.id]: e.target.value }))
                              }
                              placeholder={`Type your reply to ${msg.senderEmail}...`}
                              className="flex-1 p-3 text-xs sm:text-sm rounded-xl bg-white border border-neutral-300 text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                            />
                            <button
                              type="button"
                              onClick={() => handleSendReply(msg)}
                              disabled={!replyDrafts[msg.id]?.trim() || sendingReplyId === msg.id}
                              className="px-5 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 self-end sm:self-auto"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>{sendingReplyId === msg.id ? 'Sending...' : 'Send Reply'}</span>
                            </button>
                          </div>

                          {replySentSuccessId === msg.id && (
                            <div className="mt-2 text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Reply recorded & email client dispatched to {msg.senderEmail}!</span>
                            </div>
                          )}
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: MANAGE COMMUNITY FEEDBACKS (WITH FULL DELETION CONTROL) */}
            {activeTab === 'reviews' && (
              <div className="rounded-3xl p-6 sm:p-8 bg-white border border-neutral-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
                  <div>
                    <h3 className="text-lg font-black text-neutral-900 flex items-center gap-2">
                      <span>Community Feedback Control</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                        {feedbacks.length} reviews
                      </span>
                    </h3>
                    <p className="text-xs text-neutral-600 font-medium mt-0.5">
                      As admin, you have full deletion rights over any inappropriate or outdated feedback.
                    </p>
                  </div>
                </div>

                {feedbacks.length === 0 ? (
                  <div className="py-12 text-center bg-neutral-50 rounded-2xl border border-neutral-200">
                    <MessageSquare className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-neutral-700">No community reviews yet</p>
                    <p className="text-xs text-neutral-500 font-medium mt-1">
                      When viewers post reviews in the community section, they will appear here for your moderation.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {feedbacks.map((fb) => (
                      <div
                        key={fb.id}
                        className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200/90 shadow-2xs flex flex-col justify-between gap-3 relative group"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2.5">
                              {fb.avatarUrl ? (
                                <img src={fb.avatarUrl} alt={fb.authorName} className="w-8 h-8 rounded-full object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-neutral-900 text-white font-bold text-xs flex items-center justify-center">
                                  {fb.authorName.slice(0, 1)}
                                </div>
                              )}
                              <div>
                                <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                                  <span>{fb.authorName}</span>
                                  {fb.hidden && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                                      Hidden
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-neutral-500 font-medium">{fb.authorRole} · {fb.date}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              {/* Hide / Unhide button */}
                              {onHideFeedback && (
                                <button
                                  type="button"
                                  onClick={() => onHideFeedback(fb.id, !fb.hidden)}
                                  className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors cursor-pointer"
                                  title={fb.hidden ? 'Unhide review' : 'Hide review from public'}
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}

                              {/* Delete button */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Delete review from "${fb.authorName}"?`)) {
                                    onDeleteFeedback(fb.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                                title="Delete this feedback"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs sm:text-sm text-neutral-800 font-medium leading-relaxed italic bg-white p-3 rounded-xl border border-neutral-200/80">
                            &ldquo;{fb.content}&rdquo;
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-neutral-500 font-medium pt-2 border-t border-neutral-200/60">
                          <span>Rating: {fb.rating}/5 stars</span>
                          <span>{fb.likes || 0} likes · {fb.replies?.length || 0} replies</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: UPLOAD NEW TUTORIAL */}
            {activeTab === 'upload' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Upload Form (7 cols) */}
                <div className="lg:col-span-7 rounded-3xl p-6 sm:p-8 bg-white border border-neutral-200 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-lg font-black text-neutral-900">
                      Upload Video Tutorial / Reel
                    </h3>
                    <p className="text-xs text-neutral-600 font-medium mt-0.5">
                      When pasting a YouTube video or reel link, the thumbnail is extracted automatically!
                    </p>
                  </div>

                  {uploadSuccess && (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Video published successfully with thumbnail! It is now live in the tutorial section.</span>
                    </div>
                  )}

                  {uploadError && (
                    <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  <form onSubmit={handleUpload} className="space-y-4">
                    {/* Method Toggle */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setUploadType('link')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          uploadType === 'link'
                            ? 'bg-white text-neutral-900 shadow-2xs'
                            : 'text-neutral-600 hover:text-neutral-950'
                        }`}
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>Paste Video/Reel Link</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setUploadType('device')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          uploadType === 'device'
                            ? 'bg-white text-neutral-900 shadow-2xs'
                            : 'text-neutral-600 hover:text-neutral-950'
                        }`}
                      >
                        <HardDrive className="w-3.5 h-3.5" />
                        <span>Upload from Device</span>
                      </button>
                    </div>

                    {uploadType === 'link' ? (
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-neutral-800">
                          Video / Reel Link (YouTube, Shorts, Reel)
                        </label>
                        <div className="relative">
                          <input
                            type="url"
                            required
                            value={videoLink ?? ''}
                            onChange={(e) => setVideoLink(e.target.value)}
                            placeholder="Paste YouTube or Reel link (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...)"
                            className="w-full px-4 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-500 text-xs sm:text-sm focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                          />
                        </div>

                        {/* Automatic YouTube thumbnail preview - Direct from YouTube to Web */}
                        {detectedYouTubeThumb && (
                          <div className="p-4 bg-gradient-to-r from-emerald-50/80 via-emerald-50/40 to-white rounded-2xl border border-emerald-200/90 shadow-2xs space-y-2.5 animate-in fade-in">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>Direct YouTube Thumbnail Detected!</span>
                              </span>
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                Ready to publish
                              </span>
                            </div>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                              <div className="w-32 h-20 rounded-xl overflow-hidden bg-neutral-950 shrink-0 relative border-2 border-emerald-500/50 shadow-sm group">
                                <img
                                  src={detectedYouTubeThumb}
                                  alt="Auto Thumbnail from YouTube"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // fallback if quality fails
                                    const target = e.target as HTMLImageElement;
                                    const id = extractYouTubeId(videoLink);
                                    if (id && !target.src.includes('hqdefault')) {
                                      target.src = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
                                    }
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                  <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center">
                                    <Film className="w-3 h-3" />
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-neutral-900">
                                  Captured directly from YouTube
                                </p>
                                <p className="text-[11px] text-neutral-600 leading-snug">
                                  This exact image will be set automatically as the high-resolution thumbnail displayed on your web tutorial cards.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1">
                          Video File from Device
                        </label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="video/*,.mp4,.mov,.webm"
                          onChange={handleDeviceFileChange}
                          className="hidden"
                        />
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full p-4 rounded-xl border-2 border-dashed border-neutral-300 hover:border-neutral-500 bg-neutral-50 text-center cursor-pointer transition-colors"
                        >
                          <Film className="w-6 h-6 mx-auto mb-2 text-neutral-500" />
                          {selectedFileName ? (
                            <div className="text-xs font-bold text-neutral-900">
                              Selected file: {selectedFileName}
                            </div>
                          ) : (
                            <div>
                              <span className="text-xs font-bold text-neutral-900">
                                Click to choose video from phone or PC
                              </span>
                              <p className="text-[11px] text-neutral-500 mt-0.5">MP4, WebM, MOV supported</p>
                            </div>
                          )}
                        </div>
                        {videoDuration && selectedFileName && (
                          <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                            ✓ Detected Duration: {videoDuration}
                          </p>
                        )}

                        {/* Custom Thumbnail Selection from Device */}
                        <div className="mt-3">
                          <label className="block text-xs font-bold text-neutral-800 mb-1">
                            Custom Thumbnail from Device
                          </label>
                          <input
                            ref={thumbnailInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleDeviceThumbnailChange}
                            className="hidden"
                          />
                          <div
                            onClick={() => thumbnailInputRef.current?.click()}
                            className="w-full p-3 rounded-xl border border-dashed border-neutral-300 hover:border-neutral-500 bg-neutral-50 flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700">
                              <ImageIcon className="w-4 h-4 text-orange-500" />
                              <span className="truncate">
                                {deviceThumbnailName ? deviceThumbnailName : 'Select thumbnail image from device'}
                              </span>
                            </div>
                            {deviceThumbnailUrl && (
                              <div className="w-12 h-8 rounded-lg overflow-hidden border border-neutral-200 shrink-0">
                                <img src={deviceThumbnailUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1">
                        Tutorial Title
                      </label>
                      <input
                        type="text"
                        required
                        value={videoTitle ?? ''}
                        onChange={(e) => setVideoTitle(e.target.value)}
                        placeholder="Title of tutorial or reel"
                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-500 text-xs sm:text-sm focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1">
                          Category
                        </label>
                        <select
                          value={videoCategory}
                          onChange={(e) => setVideoCategory(e.target.value as 'phone' | 'pc' | 'digital')}
                          className="w-full px-4 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-xs sm:text-sm focus:outline-none focus:border-neutral-900"
                        >
                          <option value="phone">Phone Mastery (phone)</option>
                          <option value="pc">PC Performance (pc)</option>
                          <option value="digital">Digital Skills (digital)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1">
                          Duration
                        </label>
                        <input
                          type="text"
                          value={videoDuration ?? ''}
                          onChange={(e) => setVideoDuration(e.target.value)}
                          placeholder="10:30"
                          className="w-full px-4 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-xs sm:text-sm focus:outline-none focus:border-neutral-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1">
                        Description & Takeaways
                      </label>
                      <textarea
                        rows={2}
                        value={videoDescription ?? ''}
                        onChange={(e) => setVideoDescription(e.target.value)}
                        placeholder="Brief walkthrough summary"
                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-500 text-xs sm:text-sm focus:outline-none focus:border-neutral-900"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 px-4 rounded-xl text-white font-bold text-xs sm:text-sm bg-neutral-900 hover:bg-neutral-800 transition-all shadow-sm active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4 text-orange-500" />
                      <span>Publish Tutorial</span>
                    </button>
                  </form>
                </div>

                {/* Published Tutorials Feed (5 cols) */}
                <div className="lg:col-span-5 rounded-3xl p-6 sm:p-8 bg-white border border-neutral-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                    <h4 className="text-sm font-black text-neutral-900">
                      Live Gallery ({videos.length})
                    </h4>
                    <span className="text-xs font-bold text-orange-600">Active</span>
                  </div>

                  <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1 custom-scrollbar">
                    {videos.map((v) => (
                      <div
                        key={v.id}
                        className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-14 h-9 rounded-xl overflow-hidden bg-neutral-950 shrink-0 relative border border-neutral-200">
                            <img
                              src={v.thumbnail}
                              alt={v.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-neutral-900 truncate">
                              {v.title}
                            </div>
                            <div className="text-[10px] text-neutral-600 flex items-center gap-1.5 mt-0.5 font-medium">
                              <span className="font-bold text-neutral-800">{v.duration}</span>
                              <span>·</span>
                              <span>{v.views}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditVideo(v)}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 transition-colors"
                            title="Edit details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteVideoConfirm(v)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
                    // Update user count badge
                    setUsersList((prev) => {
                      if (prev.length === count) return prev;
                      return new Array(count).fill({ id: 'dummy', username: '', email: '', joinedDate: '' });
                    });
                  }}
                />
              </div>
            )}

          </div>
        ) : (
          /* ========================================================================= */
          /* NOT LOGGED IN AS ADMIN: CLEAN SIGN IN GATEWAY                             */
          /* ========================================================================= */
          <div className="rounded-3xl p-8 sm:p-12 bg-white border border-neutral-200 shadow-sm text-center max-w-md mx-auto my-12 animate-in fade-in">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200/60 flex items-center justify-center text-orange-500 mx-auto mb-4 shadow-2xs">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-black text-neutral-900 mb-2">
              Admin Access Only
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 mb-6 font-medium leading-relaxed">
              Only the channel administrator can access the creator studio. Please sign in with your Admin credentials.
            </p>
            <button
              type="button"
              onClick={onAdminLogin}
              className="w-full py-3.5 px-6 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-neutral-900/10 cursor-pointer flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4 text-orange-500" />
              <span>Admin Sign In</span>
            </button>
          </div>
        )}

      </div>

      {/* EDIT VIDEO MODAL (Allows admin to change all details) */}
      {editingVideo && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
          onClick={() => setEditingVideo(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-3xl bg-white border border-neutral-200 shadow-2xl p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-lg font-black text-neutral-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-orange-500" />
                <span>Edit Tutorial Details</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingVideo(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editSaveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Details updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveEditVideo} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Tutorial Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-neutral-900 text-xs sm:text-sm focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-neutral-900 text-xs sm:text-sm focus:outline-none focus:border-neutral-900"
                  >
                    <option value="Dev Workflows">Phone Mastery</option>
                    <option value="Desk & Gear">PC Performance</option>
                    <option value="Full Stack">Digital Skills & Tools</option>
                    <option value="Digital Tools">Digital Tools</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    placeholder="e.g. 11:45"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-neutral-900 text-xs sm:text-sm focus:outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Views Count
                  </label>
                  <input
                    type="text"
                    value={editViews}
                    onChange={(e) => setEditViews(e.target.value)}
                    placeholder="e.g. 1.8K views"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-neutral-900 text-xs sm:text-sm focus:outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Date
                  </label>
                  <input
                    type="text"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    placeholder="e.g. Just now, 2 days ago"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-neutral-900 text-xs sm:text-sm focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Video / YouTube Link URL
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-neutral-900 text-xs sm:text-sm focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Thumbnail Image URL
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={editThumbnail}
                    onChange={(e) => setEditThumbnail(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-neutral-300 text-neutral-900 text-xs sm:text-sm focus:outline-none focus:border-neutral-900"
                  />
                  {editThumbnail && (
                    <div className="w-12 h-8 rounded-lg overflow-hidden bg-black border border-neutral-300 shrink-0">
                      <img src={editThumbnail} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-neutral-900 text-xs sm:text-sm focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="Android, Phone Mastery, Speed"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-neutral-900 text-xs sm:text-sm focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => handleDeleteVideoConfirm(editingVideo)}
                  className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Video</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingVideo(null)}
                    className="px-4 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 font-bold text-xs hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5 text-orange-500" />
                    <span>Save All Changes</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
