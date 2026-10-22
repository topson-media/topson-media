import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Heart,
  Users,
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
  Send,
  Sparkles,
  Share2,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  AlertCircle,
  Play,
  Square,
  Clock,
  Eye,
  Camera,
  CheckCircle2,
} from 'lucide-react';
import { User, LiveSession, LiveStreamChatMessage } from '../types';
import {
  subscribeToLiveSession,
  startLiveStreamInDb,
  endLiveStreamInDb,
  incrementLiveStreamLikes,
  subscribeToLiveStreamMessages,
  sendLiveStreamMessage,
} from '../services/firebase';
import { SafeAvatar } from './SafeAvatar';

interface LiveStudioCoreProps {
  currentUser: User | null;
  mode?: 'admin' | 'viewer';
  onOpenAuth?: () => void;
}

interface FloatingHeart {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
}

export const LiveStudioCore: React.FC<LiveStudioCoreProps> = ({
  currentUser,
  mode = 'admin',
  onOpenAuth,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  // Live session state from Firestore
  const [session, setSession] = useState<LiveSession | null>(null);
  const [messages, setMessages] = useState<LiveStreamChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Admin Go Live controls
  const [streamTitle, setStreamTitle] = useState('Topson Media Live Masterclass: Full-Stack & Tech Q&A');
  const [activeTopic, setActiveTopic] = useState('Phone Mastery & Coding');
  const [isConnectingMedia, setIsConnectingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [streamDuration, setStreamDuration] = useState(0);

  // Floating hearts animation state
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [recentLikesBurst, setRecentLikesBurst] = useState(0);

  // Media refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // 1. Subscribe to Firestore Live Session snapshot
  useEffect(() => {
    const unsub = subscribeToLiveSession((sess) => {
      setSession(sess);
    });
    return () => unsub();
  }, []);

  // 2. Subscribe to Live Chat Messages
  useEffect(() => {
    const unsub = subscribeToLiveStreamMessages((msgs) => {
      setMessages(msgs);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });
    return () => unsub();
  }, []);

  // 3. Track live broadcast duration when live
  useEffect(() => {
    let timer: any = null;
    if (session?.isLive) {
      timer = setInterval(() => {
        setStreamDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setStreamDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [session?.isLive]);

  // Clean up WebRTC tracks on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Format streaming timer (MM:SS or HH:MM:SS)
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  /**
   * WEB RTC MEDIA DEVICE BROADCAST HANDLER
   * Instantiates real local audio/video capture container for face-to-face broadcast
   */
  const handleGoLiveNow = async () => {
    if (!isAdmin) return;
    setIsConnectingMedia(true);
    setMediaError(null);

    try {
      // 1. Request camera and microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      // Attach to local video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => console.warn('AutoPlay error:', err));
      }

      // 2. Publish live session record to Firestore
      const result = await startLiveStreamInDb({
        title: streamTitle,
        adminName: currentUser?.username || 'Topson Kenedy',
        adminAvatar: currentUser?.avatarUrl,
        activeTopic,
      });

      if (!result.success) {
        setMediaError(result.error || 'Failed to initialize session in Firestore.');
      }
    } catch (err: any) {
      console.error('WebRTC getUserMedia error:', err);
      let message = 'Unable to access camera or microphone.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Camera & Microphone permission denied. Please allow permissions in your browser.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No video capture device or webcam found.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        message = 'Camera is already in use by another application.';
      }
      setMediaError(message);
    } finally {
      setIsConnectingMedia(false);
    }
  };

  // End live broadcast
  const handleEndLiveStream = async () => {
    if (window.confirm('Are you sure you want to end this live broadcast?')) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      await endLiveStreamInDb();
    }
  };

  // Toggle Microphone
  const handleToggleMic = () => {
    if (!mediaStreamRef.current) return;
    const audioTracks = mediaStreamRef.current.getAudioTracks();
    audioTracks.forEach((track) => {
      track.enabled = isMicMuted;
    });
    setIsMicMuted(!isMicMuted);
  };

  // Toggle Camera
  const handleToggleVideo = () => {
    if (!mediaStreamRef.current) return;
    const videoTracks = mediaStreamRef.current.getVideoTracks();
    videoTracks.forEach((track) => {
      track.enabled = isVideoDisabled;
    });
    setIsVideoDisabled(!isVideoDisabled);
  };

  // Trigger floating heart explosion when clicking "Like Stream"
  const handleLikeStream = async () => {
    // 1. Atomic Firestore increment
    incrementLiveStreamLikes(1);

    // 2. Spawn dynamic floating heart particles
    const colors = ['#f43f5e', '#ec4899', '#f97316', '#e11d48', '#fb7185', '#ef4444'];
    const newHearts: FloatingHeart[] = Array.from({ length: 4 }).map((_, i) => ({
      id: Date.now() + Math.random() + i,
      x: Math.random() * 80 + 10, // 10% to 90% horizontal position
      y: 0,
      size: Math.floor(Math.random() * 16) + 18, // 18px to 34px
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.floor(Math.random() * 60) - 30,
    }));

    setHearts((prev) => [...prev.slice(-20), ...newHearts]);
    setRecentLikesBurst((prev) => prev + 1);

    // Remove old hearts after animation
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => !newHearts.some((nh) => nh.id === h.id)));
    }, 1800);
  };

  // Send message in Live Chat
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;

    if (!currentUser && onOpenAuth) {
      onOpenAuth();
      return;
    }

    setIsSendingChat(true);
    await sendLiveStreamMessage({
      senderName: currentUser?.username || 'Guest Viewer',
      senderAvatar: currentUser?.avatarUrl,
      text,
      isAdmin,
    });
    setChatInput('');
    setIsSendingChat(false);
  };

  // EXPLICIT ADMINISTRATIVE VALIDATION GUARD (Admin Mode)
  if (mode === 'admin' && !isAdmin) {
    return (
      <div className="p-8 sm:p-12 rounded-3xl bg-white border border-rose-200 shadow-sm text-center max-w-2xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-slate-900 tracking-tight">
          Administrative Access Required
        </h3>
        <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">
          The <strong>Live Studio Core</strong> broadcasting gateway is exclusively restricted to authenticated Topson Media Administrators.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
            Permission Code: 403_ADMIN_ONLY
          </span>
        </div>
      </div>
    );
  }

  const isLive = !!session?.isLive;

  return (
    <div className="space-y-6">
      {/* Top Banner / Status Overview */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-xs ${
              isLive ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-orange-50 text-orange-600 border border-orange-200'
            }`}>
              <Radio className={`w-5 h-5 ${isLive ? 'animate-pulse text-rose-600' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Live Studio Core
                </h3>
                {isLive ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-500 text-white shadow-xs animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    LIVE ON AIR
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    Standby Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Direct WebRTC face-to-face live tutorial streaming with real-time viewer interactions.
              </p>
            </div>
          </div>
        </div>

        {/* Live Metrics: Viewers & Likes */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <div className="text-left">
              <div className="text-[10px] uppercase font-bold text-slate-400">Viewers</div>
              <div className="text-sm font-black text-slate-900 leading-none">
                {isLive ? (session?.viewersCount || 1).toLocaleString() : 0}
              </div>
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            <div className="text-left">
              <div className="text-[10px] uppercase font-bold text-rose-500">Likes</div>
              <div className="text-sm font-black text-rose-700 leading-none">
                {(session?.likesCount || 0).toLocaleString()}
              </div>
            </div>
          </div>

          {isLive && streamDuration > 0 && (
            <div className="px-3.5 py-2 rounded-2xl bg-slate-900 text-white flex items-center gap-2 shadow-xs">
              <Clock className="w-4 h-4 text-rose-400" />
              <div className="text-left">
                <div className="text-[10px] uppercase font-bold text-slate-400">Duration</div>
                <div className="text-xs font-mono font-black text-white leading-none">
                  {formatDuration(streamDuration)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Streaming Video Layout (Left) + Live Interactions Hub (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 8 Cols: Video Broadcast Container */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl flex items-center justify-center">
            
            {/* Live WebRTC Video Track */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={mode === 'admin'} // Admin mutes local playback to prevent feedback loop
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                isLive && !isVideoDisabled ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Standby / Off-air Cover */}
            {(!isLive || isVideoDisabled) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white bg-radial from-slate-900 via-slate-950 to-black">
                <div className="w-20 h-20 rounded-3xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-4 text-orange-400 shadow-2xl">
                  {isVideoDisabled ? <VideoOff className="w-10 h-10 text-rose-400" /> : <Radio className="w-10 h-10" />}
                </div>
                <h4 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  {isVideoDisabled
                    ? 'Camera Feed Disabled (Audio Only)'
                    : isLive
                    ? 'Broadcasting Live Stream...'
                    : 'Studio Standby Mode'}
                </h4>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md mt-1.5 leading-relaxed">
                  {mode === 'admin'
                    ? 'Configure your masterclass title and click "GO LIVE NOW" below to initiate WebRTC face-to-face broadcast.'
                    : 'Topson Media Live Studio is currently off-air. Check back shortly for our live Q&A sessions!'}
                </p>

                {mode === 'viewer' && !isLive && (
                  <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 border border-white/20 text-xs font-bold text-white backdrop-blur-md">
                    <Clock className="w-3.5 h-3.5 text-orange-400" />
                    <span>Next Masterclass: Weekly Live Q&A</span>
                  </div>
                )}
              </div>
            )}

            {/* Top Overlay Badge & Title inside Video */}
            {isLive && (
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
                <div className="flex items-center gap-2.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/90 text-white text-xs font-black tracking-wide shadow-md backdrop-blur-sm animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white" />
                    <span>REC &bull; LIVE</span>
                  </div>
                  <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 text-white text-xs font-bold backdrop-blur-md border border-white/10">
                    <Eye className="w-3.5 h-3.5 text-orange-400" />
                    <span>{(session?.viewersCount || 1).toLocaleString()} watching</span>
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-bold backdrop-blur-md border border-white/10">
                  <SafeAvatar
                    src={session?.adminAvatar}
                    name={session?.adminName || 'Topson'}
                    size="xs"
                  />
                  <span>{session?.adminName || 'Topson Media'}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                </div>
              </div>
            )}

            {/* FLOATING HEARTS & PARTICLES ANIMATION OVERLAY */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
              {hearts.map((h) => (
                <div
                  key={h.id}
                  style={{
                    left: `${h.x}%`,
                    bottom: '20px',
                    fontSize: `${h.size}px`,
                    transform: `rotate(${h.rotation}deg)`,
                  }}
                  className="absolute animate-float-heart drop-shadow-md select-none"
                >
                  ❤️
                </div>
              ))}
            </div>

            {/* Quick Floating "Like Stream" Action Button in Video Corner (For Viewers & Admin) */}
            <button
              type="button"
              onClick={handleLikeStream}
              className="absolute bottom-4 right-4 z-40 p-3 sm:px-4 sm:py-2.5 rounded-full bg-rose-500/90 hover:bg-rose-600 text-white font-bold text-xs shadow-xl backdrop-blur-md border border-rose-400/50 flex items-center gap-2 cursor-pointer transition-all active:scale-90 hover:scale-105 group"
              title="Send Heart / Like Broadcast"
            >
              <Heart className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Like Stream</span>
              <span className="font-mono text-xs font-black">
                {(session?.likesCount || 0).toLocaleString()}
              </span>
            </button>
          </div>

          {/* Media Diagnostics or Error Banner */}
          {mediaError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{mediaError}</span>
              </div>
              <button
                type="button"
                onClick={() => setMediaError(null)}
                className="text-xs underline cursor-pointer text-rose-700"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ADMIN BROADCAST CONTROL PANEL ("Go Live" & Live Controls) */}
          {mode === 'admin' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              {!isLive ? (
                /* GO LIVE PANEL */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Masterclass Broadcast Title
                    </label>
                    <input
                      type="text"
                      value={streamTitle}
                      onChange={(e) => setStreamTitle(e.target.value)}
                      placeholder="e.g. Masterclass: Full-Stack React, Tailwind & Cloud Performance"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Broadcast Topic / Category
                      </label>
                      <select
                        value={activeTopic}
                        onChange={(e) => setActiveTopic(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-colors cursor-pointer"
                      >
                        <option value="Phone Mastery &amp; Coding">Phone Mastery &amp; Coding</option>
                        <option value="PC Performance &amp; Hardware">PC Performance &amp; Hardware</option>
                        <option value="Full-Stack Web Dev &amp; Cloud">Full-Stack Web Dev &amp; Cloud</option>
                        <option value="Community Q&amp;A Live">Community Q&amp;A Live</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      {/* High-Contrast "GO LIVE NOW" Button with glowing pulsing red recording indicator */}
                      <button
                        type="button"
                        onClick={handleGoLiveNow}
                        disabled={isConnectingMedia}
                        className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-sm tracking-wide shadow-lg shadow-rose-600/30 ring-4 ring-rose-500/30 flex items-center justify-center gap-2.5 transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                      >
                        <span className="w-3 h-3 rounded-full bg-white animate-ping" />
                        <span>{isConnectingMedia ? 'Connecting Camera...' : 'GO LIVE NOW'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* LIVE IN-STREAM BROADCAST CONTROLS */
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {/* Toggle Microphone */}
                    <button
                      type="button"
                      onClick={handleToggleMic}
                      className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                        isMicMuted
                          ? 'bg-rose-50 text-rose-600 border-rose-200'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                      }`}
                      title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                    >
                      {isMicMuted ? <MicOff className="w-4 h-4 text-rose-600" /> : <Mic className="w-4 h-4 text-slate-700" />}
                      <span>{isMicMuted ? 'Mic Muted' : 'Mute Mic'}</span>
                    </button>

                    {/* Toggle Video Camera */}
                    <button
                      type="button"
                      onClick={handleToggleVideo}
                      className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                        isVideoDisabled
                          ? 'bg-rose-50 text-rose-600 border-rose-200'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                      }`}
                      title={isVideoDisabled ? 'Turn On Camera' : 'Turn Off Camera'}
                    >
                      {isVideoDisabled ? <VideoOff className="w-4 h-4 text-rose-600" /> : <Video className="w-4 h-4 text-slate-700" />}
                      <span>{isVideoDisabled ? 'Camera Off' : 'Camera On'}</span>
                    </button>
                  </div>

                  {/* End Broadcast Button */}
                  <button
                    type="button"
                    onClick={handleEndLiveStream}
                    className="py-3 px-5 rounded-2xl bg-slate-900 hover:bg-rose-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <Square className="w-4 h-4 text-rose-400 fill-rose-400" />
                    <span>End Live Stream</span>
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right 4 Cols: Live Interactions Hub (Real-time Live Chat & Audience Feedback) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col h-[520px] overflow-hidden">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center">
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Live Interactions Hub
                </h4>
                <div className="text-[10px] text-slate-400 font-medium">Real-time viewer feed</div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLikeStream}
              className="p-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-black"
              title="Send Heart"
            >
              <Heart className="w-3.5 h-3.5 fill-rose-500" />
              <span>+1</span>
            </button>
          </div>

          {/* Messages Stream Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar bg-slate-50/50">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
                <Sparkles className="w-8 h-8 text-orange-400 mb-2 opacity-75" />
                <p className="text-xs font-bold text-slate-600">Live chat is open!</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                  Say hello, ask a tech question, or send a reaction to Topson Media.
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-2.5 rounded-2xl text-xs space-y-1 transition-all ${
                    m.isAdmin
                      ? 'bg-orange-50 border border-orange-200 text-orange-950'
                      : 'bg-white border border-slate-200/80 text-slate-900 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <SafeAvatar
                        src={m.senderAvatar}
                        name={m.senderName}
                        size="xs"
                      />
                      <span className="font-bold truncate text-[11px]">
                        {m.senderName}
                      </span>
                      {m.isAdmin && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-orange-600 text-white uppercase tracking-wider">
                          Host
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {m.timestamp}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 font-medium pl-6 leading-relaxed break-words">
                    {m.text}
                  </p>
                </div>
              ))
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Message Input Form */}
          <form onSubmit={handleSendChat} className="p-3 border-t border-slate-100 bg-white flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={currentUser ? 'Send live question...' : 'Sign in to join live chat...'}
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
            />
            <button
              type="submit"
              disabled={isSendingChat || !chatInput.trim()}
              className="p-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white transition-colors cursor-pointer shrink-0 shadow-xs active:scale-95"
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>

      </div>

      <style>{`
        @keyframes float-heart {
          0% {
            opacity: 1;
            transform: translateY(0) scale(0.8) rotate(0deg);
          }
          50% {
            opacity: 0.9;
            transform: translateY(-80px) scale(1.2) rotate(15deg);
          }
          100% {
            opacity: 0;
            transform: translateY(-160px) scale(1.5) rotate(-15deg);
          }
        }
        .animate-float-heart {
          animation: float-heart 1.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
