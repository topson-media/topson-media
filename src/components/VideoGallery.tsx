import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Play,
  Clock,
  BookOpen,
  Film,
  Link as LinkIcon,
  UploadCloud,
  ChevronUp,
  ChevronDown,
  Trash2,
  Edit3,
  X,
  Maximize2,
  Heart,
  MessageSquare,
  Send,
  Image as ImageIcon,
  Sparkles,
  Radio,
  ArrowUpRight,
} from 'lucide-react';
import { WatchPartyModal } from './WatchPartyModal';
import { VideoItem, VideoComment, User } from '../types';
import {
  getYouTubeThumbnail,
  extractYouTubeId,
  fetchYouTubeVideoDetails,
  formatViewsCount,
  formatVideoDuration,
} from '../utils/youtubeHelper';
import { extractVideoDurationFromFile } from '../utils/videoDuration';
import { formatUploadedTimeAgo, formatTimeAgo } from '../utils/timeAgo';
import { useLanguage } from '../context/LanguageContext';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, DEFAULT_TUTORIALS, seedInitialTutorialsIfEmpty } from '../services/firebase';

interface VideoGalleryProps {
  videos: VideoItem[];
  searchQuery: string;
  currentUser?: User | null;
  onOpenAdminAuth?: () => void;
  onUploadVideo?: (video: VideoItem) => void;
  onDeleteVideo?: (videoId: string) => void;
  onUpdateVideo?: (video: VideoItem) => void;
  onLikeVideo?: (videoId: string) => void;
  onAddComment?: (videoId: string, comment: VideoComment) => void;
  onIncrementViews?: (videoId: string) => void;
  isStandalonePage?: boolean;
}

export const VideoGallery: React.FC<VideoGalleryProps> = ({
  videos,
  searchQuery,
  currentUser = null,
  onOpenAdminAuth,
  onUploadVideo,
  onDeleteVideo,
  onUpdateVideo,
  onLikeVideo,
  onAddComment,
  onIncrementViews,
  isStandalonePage = false,
}) => {
  const { t } = useLanguage();
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [watchPartyVideo, setWatchPartyVideo] = useState<VideoItem | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);

  // Edit Video Modal state
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

  // Track expanded descriptions per video card
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Comment input state inside active video modal
  const [commentText, setCommentText] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');

  // Upload modal state
  const [uploadType, setUploadType] = useState<'link' | 'device'>('device');
  const [videoLink, setVideoLink] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [deviceFilePreviewUrl, setDeviceFilePreviewUrl] = useState<string | null>(null);
  const [deviceThumbnailUrl, setDeviceThumbnailUrl] = useState<string | null>(null);
  const [deviceThumbnailName, setDeviceThumbnailName] = useState<string>('');
  const [detectedYouTubeViews, setDetectedYouTubeViews] = useState<string>('');
  const [isDetectingYt, setIsDetectingYt] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<string>('Phone Mastery');
  const [newDuration, setNewDuration] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [tutorials, setTutorials] = useState<VideoItem[]>([]);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // 2. PUBLIC VIDEO GALLERY (Read from Firestore Database):
  // Real-time Firestore database snapshot listener streaming video_tutorials collection
  useEffect(() => {
    const q = query(collection(db, 'video_tutorials'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: VideoItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const rawCat = data.category || 'phone';
            const categoryLabel =
              rawCat === 'phone' ? 'Phone Mastery' :
              rawCat === 'pc' ? 'PC Performance' :
              rawCat === 'digital' ? 'Digital Skills' :
              rawCat;

            const videoUrl = data.video_url || data.videoUrl || '';
            const ytThumb = videoUrl ? getYouTubeThumbnail(videoUrl) : null;
            const thumbnail =
              data.thumbnail ||
              ytThumb ||
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';

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
              category: categoryLabel,
              duration: data.duration || '10:00',
              views: data.views || (typeof data.viewsCount === 'number' ? `${data.viewsCount} views` : '1.5K views'),
              viewsCount: typeof data.viewsCount === 'number' ? data.viewsCount : 0,
              viewedBy: Array.isArray(data.viewedBy) ? data.viewedBy : [],
              date: dateStr,
              createdAt: uploadTs,
              uploadTimestamp: uploadTs,
              thumbnail,
              videoUrl,
              sourceType: data.sourceType || 'link',
              description: data.description || `Tutorial on ${data.title || ''}`,
              tags: Array.isArray(data.tags) ? data.tags : [categoryLabel],
              likes: typeof data.likes === 'number' ? data.likes : 0,
              likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
              comments: Array.isArray(data.comments) ? data.comments : [],
            });
          });
          setTutorials(list);
        } else {
          // If Firestore is empty, seed initial permanent tutorials so no "No tutorials found" error ever appears
          seedInitialTutorialsIfEmpty();
        }
      },
      (error) => {
        console.warn('Firestore video_tutorials listener error:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Keep active video in sync when data updates
  useEffect(() => {
    if (activeVideo && tutorials.length > 0) {
      const fresh = tutorials.find((v) => v.id === activeVideo.id);
      if (fresh) setActiveVideo(fresh);
    }
  }, [tutorials]);

  // Auto-detect YouTube views and thumbnail when admin pastes link
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
            if (details.duration && !newDuration) {
              setNewDuration(details.duration);
            }
            if (details.title && !newTitle) {
              setNewTitle(details.title);
            }
          })
          .catch((err) => console.warn('YouTube details fetch err:', err))
          .finally(() => setIsDetectingYt(false));
      }
    }
  }, [uploadType, videoLink]);

  const detectedYouTubeThumb = useMemo(() => {
    if (uploadType === 'link' && videoLink) {
      return getYouTubeThumbnail(videoLink);
    }
    return null;
  }, [uploadType, videoLink]);

  const filteredVideos = useMemo(() => {
    // Primary source: real-time Firestore video_tutorials
    // Fallback: props or default tutorials so "No tutorials found" is never shown on direct load
    const effectiveList =
      tutorials.length > 0
        ? tutorials
        : videos.length > 0
        ? videos
        : DEFAULT_TUTORIALS.map((d, i) => ({
            id: 'init-' + i,
            title: d.title,
            category: d.category === 'phone' ? 'Phone Mastery' : d.category === 'pc' ? 'PC Performance' : 'Digital Skills',
            duration: d.duration,
            views: d.views,
            viewsCount: d.viewsCount,
            viewedBy: [],
            date: 'Recently added',
            createdAt: Date.now() - i * 3600000,
            uploadTimestamp: Date.now() - i * 3600000,
            thumbnail: d.thumbnail,
            videoUrl: d.video_url,
            sourceType: 'link' as const,
            description: d.description,
            tags: [d.category],
            likes: d.likes,
            likedBy: [],
            comments: [],
          }));

    const q = searchQuery.toLowerCase().trim();
    if (!q) return effectiveList;

    return effectiveList.filter((video) => {
      return (
        video.title.toLowerCase().includes(q) ||
        video.description.toLowerCase().includes(q) ||
        video.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [tutorials, videos, searchQuery]);

  // Display all uploaded tutorials streamed from Firestore
  const displayedVideos = useMemo(() => {
    return filteredVideos;
  }, [filteredVideos]);

  // Video file change from device -> auto-detect duration & name
  const handleDeviceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      if (!newTitle.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setNewTitle(cleanName);
      }
      const previewUrl = URL.createObjectURL(file);
      setDeviceFilePreviewUrl(previewUrl);

      // Extract and store duration using URL.createObjectURL and onloadedmetadata helper
      extractVideoDurationFromFile(file).then((durFormatted) => {
        setNewDuration(durFormatted);
      });
    }
  };

  // Thumbnail image change from device
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

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    // Thumbnail selection: from device thumbnail input, YouTube auto-extract, or fallback
    const autoYtThumb = uploadType === 'link' ? getYouTubeThumbnail(videoLink.trim()) : null;
    const finalThumbnail =
      deviceThumbnailUrl ||
      autoYtThumb ||
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';

    // Views: YouTube views if link, or real initial count for uploaded video
    const finalViews =
      uploadType === 'link'
        ? detectedYouTubeViews || '1.5K views'
        : '0 views';

    const categoryCode =
      newCategory.toLowerCase().includes('phone') ? 'phone' :
      newCategory.toLowerCase().includes('pc') ? 'pc' :
      'digital';

    const urlToSave =
      uploadType === 'link'
        ? videoLink.trim()
        : deviceFilePreviewUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

    try {
      addDoc(collection(db, 'video_tutorials'), {
        title: newTitle.trim(),
        category: categoryCode,
        video_url: urlToSave,
        created_at: serverTimestamp(),
        thumbnail: finalThumbnail,
        duration: newDuration.trim() || '10:00',
        description: newDescription.trim() || 'Tech walkthrough on ' + newTitle.trim(),
        views: finalViews,
        viewsCount: uploadType === 'device' ? 0 : 1500,
        likes: 0,
        likedBy: [],
        comments: [],
      });
    } catch (err) {
      console.warn('Failed to add doc in VideoGallery:', err);
    }

    setNewTitle('');
    setVideoLink('');
    setSelectedFileName('');
    setDeviceFilePreviewUrl(null);
    setDeviceThumbnailUrl(null);
    setDeviceThumbnailName('');
    setNewDescription('');
    setNewDuration('');
    setDetectedYouTubeViews('');
    setUploadSuccess(true);
    setTimeout(() => {
      setUploadSuccess(false);
      setUploadModalOpen(false);
    }, 1200);
  };

  const handleOpenEditVideo = (video: VideoItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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
    } else {
      setTutorials((prev: VideoItem[]) => prev.map((v) => (v.id === updated.id ? updated : v)));
    }

    setEditSaveSuccess(true);
    setTimeout(() => {
      setEditSaveSuccess(false);
      setEditingVideo(null);
    }, 900);
  };

  const handleDeleteVideoConfirm = (video: VideoItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Delete tutorial "${video.title}"?`)) {
      if (onDeleteVideo) {
        onDeleteVideo(video.id);
      } else {
        setTutorials((prev: VideoItem[]) => prev.filter((v) => v.id !== video.id));
      }
    }
  };

  const isVideoLink = (video: VideoItem) => {
    if (video.sourceType === 'link') return true;
    if (video.videoUrl) {
      const url = video.videoUrl.toLowerCase();
      if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com')) {
        return true;
      }
      if (url.startsWith('http://') || url.startsWith('https://')) {
        if (!url.endsWith('.mp4') && !url.endsWith('.webm') && !url.includes('googleapis')) {
          return true;
        }
      }
    }
    return false;
  };

  const handleCardClick = (video: VideoItem, e?: React.MouseEvent) => {
    if (e && (e.target as HTMLElement).closest('.card-action-element')) {
      return;
    }

    // Increment real views count when a user plays or views the tutorial
    if (onIncrementViews) {
      onIncrementViews(video.id);
    }

    if (isVideoLink(video) && video.videoUrl) {
      window.open(video.videoUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    setActiveVideo(video);
  };

  const handleLikeClick = (video: VideoItem, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (onLikeVideo) {
      onLikeVideo(video.id);
    } else {
      // Local optimistic toggle
      const userId = currentUser?.id || 'guest';
      setTutorials((prev: VideoItem[]) =>
        prev.map((v) => {
          if (v.id !== video.id) return v;
          const likedBy = Array.isArray(v.likedBy) ? v.likedBy : [];
          const hasLiked = likedBy.includes(userId);
          const nextLikedBy = hasLiked ? likedBy.filter((u: string) => u !== userId) : [...likedBy, userId];
          const nextLikes = Math.max(0, (v.likes || 0) + (hasLiked ? -1 : 1));
          return { ...v, likes: nextLikes, likedBy: nextLikedBy };
        })
      );
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !activeVideo) return;

    const author =
      currentUser?.username ||
      commentAuthor.trim() ||
      'Viewer';

    const hasFanBadge = !!currentUser?.fanBadge;
    const newComment: VideoComment = {
      id: 'c-' + Date.now(),
      authorName: author,
      authorAvatar: currentUser?.avatarUrl,
      userId: currentUser?.id,
      text: commentText.trim(),
      timestamp: 'Just now',
      createdAt: Date.now(),
      hasFanBadge,
    };

    if (onAddComment) {
      onAddComment(activeVideo.id, newComment);
    } else {
      const updatedComments = [newComment, ...(activeVideo.comments || [])];
      setActiveVideo({ ...activeVideo, comments: updatedComments });
      setTutorials((prev: VideoItem[]) =>
        prev.map((v) => (v.id === activeVideo.id ? { ...v, comments: updatedComments } : v))
      );
    }

    setCommentText('');
  };

  return (
    <section
      id="videos"
      className={`py-16 sm:py-20 scroll-mt-20 ${
        !isStandalonePage ? 'border-t border-neutral-200' : ''
      } bg-white`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Kicker */}
        <div className="text-xs font-bold tracking-widest uppercase text-neutral-800 mb-6">
          VIDEO GALLERY {isStandalonePage ? '· COMPLETE ARCHIVE' : ''}
        </div>

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-neutral-900 tracking-tight leading-[1.05]">
              {t.videosSection.header}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 mt-1 font-medium">
              {t.videosSection.subtext}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* ONLY ADMIN CAN SEE WHERE TO UPLOAD */}
            {currentUser?.role === 'admin' && (
              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="h-12 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-neutral-900 hover:bg-neutral-800 transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-2 shrink-0"
              >
                <UploadCloud className="w-4 h-4 text-orange-500" />
                <span>Upload Video (Admin)</span>
              </button>
            )}
          </div>
        </div>

        {/* Search status indicator */}
        {searchQuery.trim() && (
          <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-neutral-700 bg-neutral-50 px-4 py-2.5 rounded-xl border border-neutral-200">
            <span>Filtering by: &ldquo;{searchQuery}&rdquo;</span>
            <span className="text-neutral-400">·</span>
            <span>{displayedVideos.length} matching tutorials</span>
          </div>
        )}

        {/* AUTOMATIC MULTI-COLUMN COMPACT GRID (2 cols mobile, 3 cols tablet & desktop) */}
        {displayedVideos.length === 0 ? (
          <div className="rounded-3xl p-12 bg-white border border-neutral-200 text-center space-y-3">
            <Film className="w-12 h-12 text-neutral-400 mx-auto" />
            <h3 className="text-xl font-bold text-neutral-900">No tutorials found</h3>
            <p className="text-xs text-neutral-600">Try adjusting your search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6 w-full">
            {displayedVideos.map((video) => {
              const isExpanded = !!expandedCards[video.id];
              const isLink = isVideoLink(video);
              const isPlaying = activePlayingId === video.id;
              const userId = currentUser?.id || 'guest';
              const isLiked = Array.isArray(video.likedBy) ? (video.likedBy as string[]).includes(userId) : false;
              const likesCount = video.likes || 0;
              const commentsCount = video.comments?.length || 0;

              const cleanTags = video.tags.filter(
                (t) => !t.toLowerCase().includes('digital skills') && !t.toLowerCase().includes('skills')
              );

              const videoPlaybackSrc =
                video.videoUrl ||
                'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

              return (
                <div
                  key={video.id}
                  className="w-full group rounded-xl sm:rounded-2xl overflow-hidden bg-white border border-neutral-200 shadow-xs hover:shadow-lg hover:border-orange-500/50 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Media Area: 16:9 ratio */}
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-950">
                      {isPlaying ? (
                        <div className="relative w-full h-full bg-black">
                          <video
                            src={videoPlaybackSrc}
                            controls
                            autoPlay
                            playsInline
                            className="w-full h-full object-contain bg-black"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex items-center gap-1 z-20">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePlayingId(null);
                                setActiveVideo(video);
                              }}
                              className="p-1 rounded-full bg-black/70 hover:bg-neutral-800 text-white transition-colors cursor-pointer"
                              title="Expand player"
                            >
                              <Maximize2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePlayingId(null);
                              }}
                              className="p-1 rounded-full bg-black/70 hover:bg-neutral-800 text-white transition-colors cursor-pointer"
                              title="Stop playback"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={(e) => handleCardClick(video, e)}
                          className="relative w-full h-full cursor-pointer group/thumb"
                        >
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300 opacity-95"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />

                          {/* Duration badge */}
                          <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 py-0.5 rounded bg-black/85 text-[8px] sm:text-[10px] font-semibold text-white">
                            <Clock className="w-2 sm:w-2.5 h-2 sm:h-2.5" />
                            <span>{video.duration}</span>
                          </div>

                          {/* Link badge vs Video badge */}
                          {isLink ? (
                            <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded bg-red-600 text-[8px] sm:text-[9px] font-bold text-white shadow-sm">
                              <svg className="w-2 sm:w-2.5 h-2 sm:h-2.5 fill-white" viewBox="0 0 24 24">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                              </svg>
                              <span>YouTube</span>
                            </div>
                          ) : (
                            <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded bg-black/80 text-[8px] sm:text-[9px] font-semibold text-white">
                              <Film className="w-2 sm:w-2.5 h-2 sm:h-2.5 text-orange-400" />
                              <span>Video</span>
                            </div>
                          )}

                          {/* Hover action banner */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity bg-black/40">
                            {isLink ? (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-red-600 text-white font-bold text-xs shadow-md">
                                <LinkIcon className="w-3.5 h-3.5" />
                                <span>Open Video</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white text-neutral-950 font-bold text-xs shadow-md">
                                <Play className="w-3.5 h-3.5 fill-neutral-950 ml-0.5" />
                                <span>Play Tutorial</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Metadata & Title */}
                    <div className="p-2.5 sm:p-4">
                      <div className="flex items-center justify-between gap-1 text-[9px] sm:text-[11px] text-neutral-500 font-semibold mb-1.5 sm:mb-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-orange-600 font-bold flex items-center gap-0.5">
                            <span>🕒</span>
                            <span>{formatUploadedTimeAgo(video.createdAt || video.uploadTimestamp || video.date)}</span>
                          </span>
                          <span>·</span>
                          <span className="text-neutral-700 font-bold">{video.views}</span>
                        </div>
                        <span
                          className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 font-bold text-[9px] border border-orange-200/50 shrink-0"
                          title="Estimated reading time"
                        >
                          <BookOpen className="w-2.5 h-2.5" />
                          <span>
                            {Math.max(
                              1,
                              Math.min(
                                6,
                                Math.ceil(
                                  ((video.title || '').split(/\s+/).length +
                                    ((video.description || '').split(/\s+/).length || 20)) /
                                    35
                                )
                              )
                            )}{' '}
                            min read
                          </span>
                        </span>
                      </div>

                      <h3
                        onClick={(e) => handleCardClick(video, e)}
                        className="text-xs sm:text-sm font-bold text-neutral-900 leading-snug hover:text-orange-600 transition-colors cursor-pointer line-clamp-2"
                        title={video.title}
                      >
                        {video.title}
                      </h3>

                      {isExpanded && (
                        <div className="mt-2 pt-2 border-t border-neutral-100 animate-in fade-in space-y-1.5 sm:space-y-2">
                          <p className="text-[11px] sm:text-xs text-neutral-600 leading-relaxed">
                            {video.description}
                          </p>

                          {cleanTags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {cleanTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[9px] sm:text-[10px] font-semibold text-neutral-700 bg-neutral-100 px-1.5 sm:px-2 py-0.5 rounded-md"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Action Bar: Like, Comment, Watch Party + Expand Details */}
                  <div className="px-2 sm:px-4 py-2 sm:py-3 border-t border-neutral-100 flex items-center justify-between card-action-element">
                    <div className="flex items-center gap-1.5 sm:gap-3">
                      {/* Like button */}
                      <button
                        type="button"
                        onClick={(e) => handleLikeClick(video, e)}
                        className={`inline-flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                          isLiked
                            ? 'text-rose-600'
                            : 'text-neutral-600 hover:text-rose-600'
                        }`}
                        title={isLiked ? 'Unlike' : 'Like this post'}
                      >
                        <Heart className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                        <span>{likesCount}</span>
                      </button>

                      {/* Comment button -> Opens player modal with comments */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveVideo(video);
                        }}
                        className="inline-flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-bold text-neutral-600 hover:text-orange-600 transition-colors cursor-pointer"
                        title="View comments"
                      >
                        <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neutral-500" />
                        <span>{commentsCount}</span>
                      </button>

                      {/* Watch Party button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setWatchPartyVideo(video);
                        }}
                        className="inline-flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-[11px] font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded sm:rounded-lg transition-colors cursor-pointer border border-orange-200/50"
                        title="Watch together with synchronized playback"
                      >
                        <Radio className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-orange-500 animate-pulse" />
                        <span>Party</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedCards((prev) => ({ ...prev, [video.id]: !prev[video.id] }));
                        }}
                        className="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-bold text-neutral-500 hover:text-neutral-900 cursor-pointer"
                      >
                        <span>{isExpanded ? 'Less' : 'More'}</span>
                        {isExpanded ? <ChevronUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                      </button>

                      {/* Admin Quick Actions */}
                      {currentUser?.role === 'admin' && (
                        <div className="flex items-center gap-0.5 ml-0.5 sm:ml-1 border-l border-neutral-200 pl-1 sm:pl-2">
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditVideo(video, e)}
                            className="p-0.5 sm:p-1 rounded text-neutral-500 hover:text-orange-600 hover:bg-neutral-100 cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteVideoConfirm(video, e)}
                            className="p-0.5 sm:p-1 rounded text-neutral-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* COMPACT & MINIMALIST PREMIUM YOUTUBE CALL-TO-ACTION CARD WIDGET */}
        <div className="mt-8 sm:mt-10 p-3.5 sm:p-4 rounded-2xl bg-neutral-50 border border-neutral-200/90 shadow-2xs max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-red-600/10 text-red-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 fill-red-600" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-neutral-900 truncate">
                More tutorials available on YouTube
              </h4>
              <p className="text-[11px] text-neutral-500 font-medium truncate">
                Watch 50+ complete phone and PC workflows on our channel.
              </p>
            </div>
          </div>
          <a
            href="https://www.youtube.com/@topson-media1"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#FF0000] hover:bg-[#CC0000] active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
          >
            <span>View more</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Video Player Modal with Likes & Comments */}
        {activeVideo && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in overflow-y-auto"
            onClick={() => setActiveVideo(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-3xl my-8 rounded-3xl overflow-hidden bg-neutral-950 border border-neutral-800 text-white shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/70 hover:bg-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="relative aspect-video w-full bg-neutral-900 overflow-hidden">
                {isVideoLink(activeVideo) ? (
                  <div className="relative w-full h-full">
                    <img
                      src={activeVideo.thumbnail}
                      alt={activeVideo.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover opacity-75"
                    />
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-6 text-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg">
                        <svg className="w-7 h-7 fill-white" viewBox="0 0 24 24">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-bold text-white max-w-md">{activeVideo.title}</h4>
                      <a
                        href={activeVideo.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#FF0000] hover:bg-[#CC0000] text-white font-bold text-sm shadow-md transition-colors"
                      >
                        <LinkIcon className="w-4 h-4" />
                        <span>Watch on YouTube</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <video
                    src={
                      activeVideo.videoUrl ||
                      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
                    }
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain bg-black"
                  />
                )}
              </div>

              {/* Video Info & Interaction Section */}
              <div className="p-6 bg-white text-neutral-900 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
                  <div>
                    <h3 className="text-lg font-black text-neutral-900 leading-snug">
                      {activeVideo.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-neutral-500 font-semibold mt-1">
                      <span>{activeVideo.category}</span>
                      <span>·</span>
                      <span>{activeVideo.duration}</span>
                      <span>·</span>
                      <span className="text-neutral-900 font-bold">{activeVideo.views}</span>
                      <span>·</span>
                      <span>{activeVideo.date}</span>
                    </div>
                  </div>

                  {/* Action Buttons: Watch Party + Like Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const v = activeVideo;
                        setActiveVideo(null);
                        setWatchPartyVideo(v);
                      }}
                      className="h-10 px-3.5 py-2 rounded-xl text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Launch synchronized Watch Party"
                    >
                      <Radio className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                      <span>Watch Party</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleLikeClick(activeVideo, e)}
                      className={`h-10 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shrink-0 ${
                        activeVideo.likedBy?.includes(currentUser?.id || 'guest')
                          ? 'bg-rose-50 text-rose-600 border-rose-200'
                          : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${activeVideo.likedBy?.includes(currentUser?.id || 'guest') ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span>{activeVideo.likes || 0} Likes</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed">
                  {activeVideo.description}
                </p>

                {/* Comments Section */}
                <div className="pt-4 border-t border-neutral-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                      Comments ({activeVideo.comments?.length || 0})
                    </h4>
                  </div>

                  {/* Add comment form */}
                  <form onSubmit={handleCommentSubmit} className="space-y-2">
                    {!currentUser && (
                      <input
                        type="text"
                        value={commentAuthor}
                        onChange={(e) => setCommentAuthor(e.target.value)}
                        placeholder="Your name (optional)"
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-300 text-neutral-900 focus:outline-none focus:border-neutral-900"
                      />
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Write a comment..."
                        className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-neutral-300 text-neutral-900 focus:outline-none focus:border-neutral-900"
                      />
                      <button
                        type="submit"
                        disabled={!commentText.trim()}
                        className="h-10 px-4 rounded-xl bg-neutral-900 text-white font-bold text-xs hover:bg-neutral-800 disabled:opacity-40 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <span>Post</span>
                        <Send className="w-3 h-3" />
                      </button>
                    </div>
                  </form>

                  {/* Comments list */}
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {(!activeVideo.comments || activeVideo.comments.length === 0) ? (
                      <p className="text-xs text-neutral-400 italic py-2">
                        No comments yet. Be the first to share your thoughts!
                      </p>
                    ) : (
                      activeVideo.comments.map((c) => (
                        <div
                          key={c.id}
                          className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/60 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-neutral-900">{c.authorName}</span>
                              {(c.hasFanBadge || (currentUser?.username?.toLowerCase() === c.authorName.toLowerCase() && currentUser?.fanBadge)) && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[8px] font-black uppercase shadow-2xs tracking-wide">
                                  <span>⭐</span> Top Fan
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-neutral-400">{formatTimeAgo(c.createdAt || c.timestamp)}</span>
                          </div>
                          <p className="text-neutral-700 text-xs leading-relaxed">{c.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Upload Video Modal (Admin only, Paste Link OR Upload from Device) */}
        {uploadModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in overflow-y-auto"
            onClick={() => setUploadModalOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg my-8 rounded-3xl p-6 sm:p-7 bg-white text-neutral-900 shadow-2xl border border-neutral-200"
            >
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-black text-neutral-900 mb-1">
                Upload New Tutorial (Admin)
              </h3>
              <p className="text-xs text-neutral-600 mb-4 font-medium">
                Upload a video file from your device with custom thumbnail, or paste a YouTube link.
              </p>

              {uploadSuccess ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-neutral-900">Tutorial published!</h4>
                  <p className="text-xs text-neutral-600">Video is now live in the gallery.</p>
                </div>
              ) : (
                <form onSubmit={handleUploadSubmit} className="space-y-4">
                  {/* Selector: Video from Device vs YouTube Link */}
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-neutral-100 border border-neutral-200">
                    <button
                      type="button"
                      onClick={() => setUploadType('device')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        uploadType === 'device'
                          ? 'bg-white text-neutral-900 shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      <Film className="w-3.5 h-3.5 text-orange-500" />
                      <span>Upload from Device</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadType('link')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        uploadType === 'link'
                          ? 'bg-white text-neutral-900 shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      <LinkIcon className="w-3.5 h-3.5 text-red-500" />
                      <span>YouTube Link</span>
                    </button>
                  </div>

                  {uploadType === 'device' ? (
                    <div className="space-y-3">
                      {/* Video File Picker */}
                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1">
                          Select Video File (MP4, WebM) <span className="text-orange-500">*</span>
                        </label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="video/*"
                          onChange={handleDeviceFileChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full h-12 py-3 px-4 rounded-xl border border-dashed border-neutral-300 hover:border-neutral-500 text-xs font-medium text-neutral-700 flex items-center justify-center gap-2 cursor-pointer bg-neutral-50"
                        >
                          <Film className="w-4 h-4 text-orange-500" />
                          <span className="truncate">
                            {selectedFileName ? selectedFileName : 'Choose video file from device'}
                          </span>
                        </button>
                        {newDuration && (
                          <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                            ✓ Detected Duration: {newDuration}
                          </p>
                        )}
                      </div>

                      {/* Thumbnail Image Picker from Device */}
                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1">
                          Select Thumbnail from Device
                        </label>
                        <input
                          ref={thumbnailInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleDeviceThumbnailChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => thumbnailInputRef.current?.click()}
                          className="w-full h-12 py-3 px-4 rounded-xl border border-dashed border-neutral-300 hover:border-neutral-500 text-xs font-medium text-neutral-700 flex items-center justify-center gap-2 cursor-pointer bg-neutral-50"
                        >
                          <ImageIcon className="w-4 h-4 text-orange-500" />
                          <span className="truncate">
                            {deviceThumbnailName ? deviceThumbnailName : 'Select thumbnail image from device'}
                          </span>
                        </button>
                        {deviceThumbnailUrl && (
                          <div className="mt-2 w-28 h-16 rounded-lg overflow-hidden border border-neutral-200 shadow-2xs">
                            <img src={deviceThumbnailUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1">
                        YouTube URL or Reel Link <span className="text-orange-500">*</span>
                      </label>
                      <input
                        type="url"
                        required
                        value={videoLink}
                        onChange={(e) => setVideoLink(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full h-11 px-3.5 text-xs rounded-xl bg-white border border-neutral-300 text-neutral-900 focus:outline-none focus:border-neutral-900"
                      />
                      {isDetectingYt && (
                        <p className="text-[11px] text-neutral-500 mt-1">Fetching YouTube view count & details...</p>
                      )}
                      {detectedYouTubeViews && (
                        <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                          ✓ YouTube Views: {detectedYouTubeViews}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-800 mb-1">
                      Tutorial Title <span className="text-orange-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Title of tutorial"
                      className="w-full h-11 px-3.5 text-xs rounded-xl bg-white border border-neutral-300 text-neutral-900 focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  {/* Category & Duration */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1">
                        Category
                      </label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full h-11 px-3 text-xs rounded-xl bg-white border border-neutral-300 text-neutral-900 focus:outline-none focus:border-neutral-900"
                      >
                        <option value="Phone Mastery">Phone Mastery</option>
                        <option value="PC Performance">PC Performance</option>
                        <option value="Digital & Web">Digital & Web</option>
                        <option value="Dev Workflows">Dev Workflows</option>
                        <option value="Desk & Gear">Desk & Gear</option>
                        <option value="Full Stack">Full Stack</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1">
                        Duration
                      </label>
                      <input
                        type="text"
                        value={newDuration}
                        onChange={(e) => setNewDuration(e.target.value)}
                        placeholder="MM:SS (e.g. 08:30)"
                        className="w-full h-11 px-3.5 text-xs rounded-xl bg-white border border-neutral-300 text-neutral-900 focus:outline-none focus:border-neutral-900"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-800 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Brief walkthrough summary"
                      className="w-full p-3 text-xs rounded-xl bg-white border border-neutral-300 text-neutral-900 focus:outline-none focus:border-neutral-900 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full h-12 py-3 px-4 font-bold text-xs sm:text-sm text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-all cursor-pointer shadow-xs active:scale-98"
                  >
                    Publish Tutorial Video
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Edit Video Modal */}
        {editingVideo && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in overflow-y-auto"
            onClick={() => setEditingVideo(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg my-8 rounded-3xl p-6 sm:p-7 bg-white text-neutral-900 shadow-2xl border border-neutral-200"
            >
              <button
                type="button"
                onClick={() => setEditingVideo(null)}
                className="absolute top-4 right-4 p-2 rounded-full text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-black text-neutral-900 mb-3">
                Edit Tutorial Details
              </h3>

              {editSaveSuccess ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-neutral-900">Changes Saved!</h4>
                </div>
              ) : (
                <form onSubmit={handleSaveEditVideo} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-800 mb-1">Title</label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full h-10 px-3 text-xs rounded-xl border border-neutral-300 text-neutral-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1">Duration</label>
                      <input
                        type="text"
                        value={editDuration}
                        onChange={(e) => setEditDuration(e.target.value)}
                        className="w-full h-10 px-3 text-xs rounded-xl border border-neutral-300 text-neutral-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1">Views</label>
                      <input
                        type="text"
                        value={editViews}
                        onChange={(e) => setEditViews(e.target.value)}
                        className="w-full h-10 px-3 text-xs rounded-xl border border-neutral-300 text-neutral-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-800 mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-neutral-300 text-neutral-900 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full h-11 py-2.5 px-4 font-bold text-xs text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-all cursor-pointer shadow-xs active:scale-98"
                  >
                    Save Changes
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Watch Party Synchronized Live Room Modal */}
        {watchPartyVideo && (
          <WatchPartyModal
            video={watchPartyVideo}
            currentUser={currentUser}
            onClose={() => setWatchPartyVideo(null)}
            onOpenAuth={onOpenAdminAuth}
          />
        )}

      </div>
    </section>
  );
};
