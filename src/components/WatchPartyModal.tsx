import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Send,
  X,
  Volume2,
  VolumeX,
  Radio,
  Share2,
  Check,
  Shield,
  Clock,
  Flame,
  ThumbsUp,
  PartyPopper,
  Lightbulb,
  Heart,
  Rocket,
} from 'lucide-react';
import { renderMessageWithLinks } from '../utils/linkParser';
import { VideoItem, User, WatchPartyAttendee, WatchPartyRoom, WatchPartyMessage } from '../types';
import {
  subscribeToWatchPartyRoom,
  joinWatchPartyRoom,
  updateAttendeeProgress,
  updateHostPlayback,
  sendWatchPartyReaction,
  sendWatchPartyMessage,
  leaveWatchPartyRoom,
  ATTENDEE_COLORS,
} from '../services/watchParty';

interface WatchPartyModalProps {
  video: VideoItem;
  currentUser: User | null;
  onClose: () => void;
  onOpenAuth?: () => void;
}

export const WatchPartyModal: React.FC<WatchPartyModalProps> = ({
  video,
  currentUser,
  onClose,
  onOpenAuth,
}) => {
  const roomId = `room-${video.id}`;
  const videoRef = useRef<HTMLVideoElement>(null);

  const [room, setRoom] = useState<WatchPartyRoom | null>(null);
  const [currentAttendee, setCurrentAttendee] = useState<WatchPartyAttendee | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(180);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; sender: string }[]>([]);

  const isHost = currentAttendee?.isHost || room?.hostId === (currentUser?.id || currentAttendee?.userId);

  // 1. Join room and subscribe to real-time sync updates
  useEffect(() => {
    let myAttendeeId: string | null = null;

    const initParty = async () => {
      // Estimate initial duration from video metadata or duration string (e.g. "05:30")
      let estDuration = 300;
      if (video.duration && video.duration.includes(':')) {
        const parts = video.duration.split(':').map((p) => parseInt(p, 10));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          estDuration = parts[0] * 60 + parts[1];
        }
      }

      const attendee = await joinWatchPartyRoom(
        roomId,
        video,
        currentUser,
        estDuration,
        currentUser?.role === 'admin'
      );
      myAttendeeId = attendee.id;
      setCurrentAttendee(attendee);
    };

    initParty();

    const unsubscribe = subscribeToWatchPartyRoom(roomId, (updatedRoom) => {
      if (updatedRoom) {
        setRoom(updatedRoom);
        if (updatedRoom.duration && updatedRoom.duration > 0) {
          setDuration(updatedRoom.duration);
        }
        // Handle floating reactions from real-time database
        if (updatedRoom.reactions && updatedRoom.reactions.length > 0) {
          const latest = updatedRoom.reactions[updatedRoom.reactions.length - 1];
          if (Date.now() - latest.timestamp < 3500) {
            setFloatingReactions((prev) => {
              if (prev.some((r) => r.id === latest.id)) return prev;
              return [...prev, latest];
            });
            setTimeout(() => {
              setFloatingReactions((prev) => prev.filter((r) => r.id !== latest.id));
            }, 3000);
          }
        }
      }
    });

    return () => {
      unsubscribe();
      if (myAttendeeId) {
        leaveWatchPartyRoom(roomId, myAttendeeId);
      }
    };
  }, [roomId, video.id]);

  // 2. Sync playback updates periodically
  useEffect(() => {
    if (!currentAttendee) return;

    const interval = setInterval(() => {
      if (videoRef.current) {
        const cur = videoRef.current.currentTime;
        const dur = videoRef.current.duration || duration;
        const playing = !videoRef.current.paused;
        setCurrentTime(cur);

        updateAttendeeProgress(roomId, currentAttendee.id, cur, dur, playing);

        if (isHost) {
          updateHostPlayback(roomId, cur, dur, playing);
        }
      } else {
        // Fallback for YouTube or simulated progress
        if (isPlaying) {
          setCurrentTime((prev) => {
            const next = Math.min(prev + 1, duration);
            updateAttendeeProgress(roomId, currentAttendee.id, next, duration, true);
            if (isHost) updateHostPlayback(roomId, next, duration, true);
            return next;
          });
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentAttendee, isHost, isPlaying, duration, roomId]);

  // Video playback controls
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
        if (isHost) updateHostPlayback(roomId, videoRef.current.currentTime, duration, true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
        if (isHost) updateHostPlayback(roomId, videoRef.current.currentTime, duration, false);
      }
    } else {
      const nextPlay = !isPlaying;
      setIsPlaying(nextPlay);
      if (isHost) updateHostPlayback(roomId, currentTime, duration, nextPlay);
      if (currentAttendee) {
        updateAttendeeProgress(roomId, currentAttendee.id, currentTime, duration, nextPlay);
      }
    }
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    if (currentAttendee) {
      updateAttendeeProgress(roomId, currentAttendee.id, newTime, duration, isPlaying);
    }
    if (isHost) {
      updateHostPlayback(roomId, newTime, duration, isPlaying);
    }
  };

  // Synchronize playback with Host or another attendee
  const handleSyncToTarget = (targetTime: number, targetPlaying = true) => {
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      if (targetPlaying && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    }
    setIsPlaying(targetPlaying);
    if (currentAttendee) {
      updateAttendeeProgress(roomId, currentAttendee.id, targetTime, duration, targetPlaying);
    }
  };

  // Reactions
  const handleSendReaction = (emoji: string) => {
    const sender = currentUser?.username || currentAttendee?.username || 'Attendee';
    sendWatchPartyReaction(roomId, emoji, sender);
  };

  // Chat message submit
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const message: WatchPartyMessage = {
      id: 'msg_' + Date.now(),
      senderName: currentUser?.username || currentAttendee?.username || 'Viewer',
      senderAvatar: currentUser?.avatarUrl,
      text: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    sendWatchPartyMessage(roomId, message);
    setChatInput('');
  };

  const formatTime = (seconds: number) => {
    const sec = Math.floor(seconds || 0);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const attendeesList: WatchPartyAttendee[] = Object.values(room?.attendees || {});
  const hostTime = room?.currentTime ?? currentTime;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl my-4 sm:my-8 rounded-3xl overflow-hidden bg-neutral-950 border border-neutral-800 text-white shadow-2xl flex flex-col max-h-[92vh]"
      >
        {/* Watch Party Header */}
        <div className="p-3.5 sm:p-5 border-b border-neutral-800 flex items-center justify-between gap-3 bg-neutral-900/80 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-orange-500/20 text-orange-500 flex items-center justify-center shrink-0 border border-orange-500/30">
              <Radio className="w-5 h-5 animate-pulse text-orange-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-white truncate">
                  Watch Party Live
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" />
                  <span>Real-time Sync</span>
                </span>
              </div>
              <h4 className="text-xs text-neutral-400 truncate max-w-sm sm:max-w-md">
                {video.title}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Share / Copy Room */}
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Copy Room Link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Invite'}</span>
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              aria-label="Close Watch Party"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Watch Party Grid: Video on Left/Top (7 cols), Attendees & Sync Roster on Right (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-y-auto">
          
          {/* Left Column (Video Player & Synchronized Master Controls) */}
          <div className="lg:col-span-8 flex flex-col justify-between p-3.5 sm:p-6 border-b lg:border-b-0 lg:border-r border-neutral-800">
            <div className="space-y-4">
              
              {/* Video Player Canvas with Floating Reactions */}
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-neutral-800 shadow-inner group">
                
                {/* Floating Emoji Reaction Overlay */}
                <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
                  {floatingReactions.map((rx) => (
                    <div
                      key={rx.id}
                      className="absolute bottom-6 right-8 text-3xl sm:text-4xl animate-bounce-slow flex flex-col items-center gap-1"
                      style={{
                        animation: 'floatUp 2.8s ease-out forwards',
                      }}
                    >
                      <span>{rx.emoji}</span>
                      <span className="text-[10px] bg-black/70 text-white px-2 py-0.5 rounded-full font-bold">
                        {rx.sender}
                      </span>
                    </div>
                  ))}
                </div>

                {video.sourceType === 'device' && video.videoUrl ? (
                  <video
                    ref={videoRef}
                    src={video.videoUrl}
                    poster={video.thumbnail}
                    playsInline
                    muted={isMuted}
                    onTimeUpdate={() => {
                      if (videoRef.current) {
                        setCurrentTime(videoRef.current.currentTime);
                      }
                    }}
                    onLoadedMetadata={() => {
                      if (videoRef.current?.duration) {
                        setDuration(videoRef.current.duration);
                      }
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    className="w-full h-full object-contain"
                  />
                ) : video.youtubeId ? (
                  <div className="relative w-full h-full">
                    <iframe
                      src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
                      title={video.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  </div>
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center bg-neutral-900">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-4 text-center">
                      <Play className="w-12 h-12 text-orange-500 fill-orange-500 mb-2" />
                      <p className="text-xs text-neutral-300">Synchronized Playback Active</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Master Playback Scrub Timeline */}
              <div className="space-y-2 bg-neutral-900/60 p-3.5 rounded-2xl border border-neutral-800">
                <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
                  <span>{formatTime(currentTime)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-neutral-400">
                      Host Time: <strong className="text-orange-400">{formatTime(hostTime)}</strong>
                    </span>
                    <span>/ {formatTime(duration)}</span>
                  </div>
                </div>

                {/* Main Interactive Scrub Bar */}
                <div className="relative w-full h-2.5 bg-neutral-800 rounded-full cursor-pointer overflow-hidden group">
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-150"
                    style={{ width: `${Math.min(100, Math.max(0, (currentTime / (duration || 1)) * 100))}%` }}
                  />
                  {/* Host indicator marker */}
                  <div
                    className="absolute top-0 w-1.5 h-full bg-white shadow-sm"
                    style={{ left: `${Math.min(99, Math.max(0, (hostTime / (duration || 1)) * 100))}%` }}
                    title={`Host at ${formatTime(hostTime)}`}
                  />
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={1}
                    value={currentTime}
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>

                {/* Control Action Buttons */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={togglePlayPause}
                      className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                      <span>{isPlaying ? 'Pause' : 'Play'}</span>
                    </button>

                    {video.sourceType === 'device' && (
                      <button
                        type="button"
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-2 rounded-xl text-neutral-400 hover:text-white bg-neutral-800 cursor-pointer"
                      >
                        {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  {/* ONE-CLICK SYNC BUTTON WITH HOST */}
                  <button
                    type="button"
                    onClick={() => handleSyncToTarget(hostTime, room?.isPlaying ?? true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-900 bg-white hover:bg-neutral-100 flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-orange-600" />
                    <span>Sync with Host ({formatTime(hostTime)})</span>
                  </button>
                </div>
              </div>

              {/* Real-time Emoji Reactions Bar */}
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-neutral-900/60 border border-neutral-800">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider pl-1 shrink-0">
                  Quick React:
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {[
                    { emoji: '🔥', icon: <Flame className="w-3.5 h-3.5 text-orange-500" /> },
                    { emoji: '👏', icon: <ThumbsUp className="w-3.5 h-3.5 text-amber-500" /> },
                    { emoji: '🎉', icon: <PartyPopper className="w-3.5 h-3.5 text-purple-400" /> },
                    { emoji: '💡', icon: <Lightbulb className="w-3.5 h-3.5 text-yellow-400" /> },
                    { emoji: '❤️', icon: <Heart className="w-3.5 h-3.5 text-red-500" /> },
                    { emoji: '🚀', icon: <Rocket className="w-3.5 h-3.5 text-sky-400" /> },
                  ].map((btn) => (
                    <button
                      key={btn.emoji}
                      type="button"
                      onClick={() => handleSendReaction(btn.emoji)}
                      className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm active:scale-90 transition-transform cursor-pointer flex items-center gap-1"
                    >
                      <span>{btn.emoji}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Right Column (Synchronized Attendee Roster with Individual Progress Bars + Live Room Chat) */}
          <div className="lg:col-span-4 flex flex-col justify-between p-3.5 sm:p-6 bg-neutral-900/30">
            <div className="space-y-5">
              
              {/* ATTENDEE SYNCHRONIZED PROGRESS BARS */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-orange-500" />
                    <h5 className="text-xs sm:text-sm font-bold text-white">
                      Attendees ({attendeesList.length || 1})
                    </h5>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>In Room</span>
                  </span>
                </div>

                {/* Small Synchronized Progress Bar for EACH Attendee */}
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {attendeesList.map((att) => {
                    const progressPercent = Math.min(
                      100,
                      Math.max(0, ((att.currentTime || 0) / (att.duration || duration || 1)) * 100)
                    );
                    const colorScheme =
                      ATTENDEE_COLORS.find((c) => c.name === att.color) || ATTENDEE_COLORS[0];
                    const isSelf = att.id === currentAttendee?.id;
                    const diffSeconds = Math.round((att.currentTime || 0) - hostTime);

                    return (
                      <div
                        key={att.id}
                        className={`p-2.5 rounded-xl border transition-all ${
                          isSelf
                            ? 'bg-neutral-900 border-neutral-700 ring-1 ring-orange-500/30'
                            : 'bg-neutral-900/50 border-neutral-800'
                        }`}
                      >
                        {/* Attendee Name, Badge & Time */}
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-6 h-6 rounded-full bg-neutral-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0 ring-2 ${colorScheme.ring}`}
                            >
                              {att.username ? att.username.slice(0, 1).toUpperCase() : 'V'}
                            </div>
                            <span className="font-bold text-neutral-200 text-xs truncate max-w-[120px]">
                              {att.username} {isSelf && '(You)'}
                            </span>
                            {att.isHost && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-orange-500 text-white uppercase">
                                Host
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-[11px] font-mono text-neutral-400 shrink-0">
                            <span>{formatTime(att.currentTime || 0)}</span>
                            {!att.isHost && diffSeconds !== 0 && (
                              <span
                                className={`text-[10px] font-bold ${
                                  Math.abs(diffSeconds) <= 2 ? 'text-emerald-400' : 'text-amber-400'
                                }`}
                              >
                                {diffSeconds > 0 ? `+${diffSeconds}s` : `${diffSeconds}s`}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Synchronized Progress Bar for This Attendee */}
                        <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${colorScheme.bar} transition-all duration-300 rounded-full`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* LIVE WATCH PARTY CHAT */}
              <div className="pt-2 border-t border-neutral-800">
                <div className="text-xs font-bold text-neutral-300 mb-2 flex items-center justify-between">
                  <span>Room Discussion</span>
                  <span className="text-[10px] text-neutral-500">Live Sync</span>
                </div>

                <div className="h-32 overflow-y-auto space-y-2 pr-1 custom-scrollbar text-xs mb-2">
                  {(room?.messages || []).map((msg) => (
                    <div key={msg.id} className="p-2 rounded-xl bg-neutral-900 border border-neutral-800/80">
                      <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-0.5">
                        <span className="font-bold text-orange-400">{msg.senderName}</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <p className="text-neutral-200 text-xs break-words">{renderMessageWithLinks(msg.text)}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendChat} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Say something to attendees..."
                    className="flex-1 h-9 px-3 text-xs rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder:text-neutral-500 focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="submit"
                    className="h-9 w-9 rounded-xl bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
