import {
  getDatabase,
  ref,
  set,
  update,
  onValue,
  Database,
} from 'firebase/database';
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  getDoc,
} from 'firebase/firestore';
import { app, db } from './firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { VideoItem, User, WatchPartyAttendee, WatchPartyRoom, WatchPartyMessage } from '../types';

// Distinctive attendee accent colors for avatars and synchronized progress bars
export const ATTENDEE_COLORS = [
  { name: 'orange', ring: 'ring-orange-500', bar: 'bg-orange-500', text: 'text-orange-500', bg: 'bg-orange-500/10' },
  { name: 'emerald', ring: 'ring-emerald-500', bar: 'bg-emerald-500', text: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { name: 'sky', ring: 'ring-sky-500', bar: 'bg-sky-500', text: 'text-sky-500', bg: 'bg-sky-500/10' },
  { name: 'purple', ring: 'ring-purple-500', bar: 'bg-purple-500', text: 'text-purple-500', bg: 'bg-purple-500/10' },
  { name: 'rose', ring: 'ring-rose-500', bar: 'bg-rose-500', text: 'text-rose-500', bg: 'bg-rose-500/10' },
  { name: 'amber', ring: 'ring-amber-500', bar: 'bg-amber-500', text: 'text-amber-500', bg: 'bg-amber-500/10' },
];

// Initialize Realtime Database safely with automatic fallback
let rtdb: Database | null = null;
try {
  const rtdbUrl =
    (firebaseConfig as any).databaseURL ||
    `https://${firebaseConfig.projectId}-default-rtdb.firebaseio.com`;
  rtdb = getDatabase(app, rtdbUrl);
} catch (e) {
  // Gracefully fallback to Firestore real-time doc synchronization
  rtdb = null;
}

// Local in-memory state fallback when offline or before initial sync
const localRooms: Record<string, WatchPartyRoom> = {};
const localListeners: Record<string, Set<(room: WatchPartyRoom | null) => void>> = {};

function notifyLocal(roomId: string) {
  const listeners = localListeners[roomId];
  if (listeners && localRooms[roomId]) {
    listeners.forEach((cb) => cb({ ...localRooms[roomId] }));
  }
}

/**
 * Subscribe in real-time to a Watch Party Room.
 * Uses Firebase Realtime Database with Firestore onSnapshot fallback.
 */
export function subscribeToWatchPartyRoom(
  roomId: string,
  callback: (room: WatchPartyRoom | null) => void
): () => void {
  let unsubFirestore: (() => void) | null = null;
  let unsubRtdb: (() => void) | null = null;

  if (!localListeners[roomId]) {
    localListeners[roomId] = new Set();
  }
  localListeners[roomId].add(callback);

  // 1. Try Firebase Realtime Database
  if (rtdb) {
    try {
      const roomRef = ref(rtdb, `watch_parties/${roomId}`);
      unsubRtdb = onValue(
        roomRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val() as WatchPartyRoom;
            localRooms[roomId] = data;
            callback(data);
          }
        },
        (error) => {
          // RTDB permission or offline warning - Firestore will cover it
          console.warn('Firebase RTDB watch party listener fallback:', error.message);
        }
      );
    } catch (e) {
      console.warn('RTDB init listener failed, using Firestore');
    }
  }

  // 2. Also listen via Firestore real-time document listener
  try {
    const docRef = doc(db, 'watch_parties', roomId);
    unsubFirestore = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as WatchPartyRoom;
          localRooms[roomId] = data;
          callback(data);
        } else if (localRooms[roomId]) {
          callback(localRooms[roomId]);
        }
      },
      (error) => {
        console.warn('Firestore watch party listener fallback:', error.message);
        if (localRooms[roomId]) {
          callback(localRooms[roomId]);
        }
      }
    );
  } catch (e) {
    console.warn('Firestore snapshot setup fallback:', e);
  }

  // Return unsubscribe handler
  return () => {
    if (localListeners[roomId]) {
      localListeners[roomId].delete(callback);
    }
    if (unsubRtdb) {
      unsubRtdb();
    }
    if (unsubFirestore) {
      unsubFirestore();
    }
  };
}

/**
 * Join or initialize a Watch Party room for a tutorial.
 */
export async function joinWatchPartyRoom(
  roomId: string,
  video: VideoItem,
  user: User | null,
  initialDuration = 300,
  isHost = false
): Promise<WatchPartyAttendee> {
  const attendeeId = 'att_' + (user?.id || 'guest_' + Math.random().toString(36).substring(2, 8));
  const username = user?.username || (isHost ? 'Topson (Host)' : 'Viewer ' + attendeeId.slice(-4));
  const colorIndex = Math.floor(Math.random() * ATTENDEE_COLORS.length);
  const color = ATTENDEE_COLORS[colorIndex].name;

  const attendee: WatchPartyAttendee = {
    id: attendeeId,
    userId: user?.id || attendeeId,
    username,
    avatarUrl: user?.avatarUrl,
    currentTime: 0,
    duration: initialDuration,
    isPlaying: false,
    isHost,
    lastPing: Date.now(),
    color,
  };

  // Check if room exists in Firestore
  let existingRoom: WatchPartyRoom | null = localRooms[roomId] || null;

  try {
    const docRef = doc(db, 'watch_parties', roomId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      existingRoom = snap.data() as WatchPartyRoom;
    }
  } catch (e) {
    // offline
  }

  if (!existingRoom) {
    existingRoom = {
      id: roomId,
      videoId: video.id,
      videoTitle: video.title,
      videoThumbnail: video.thumbnail,
      videoUrl: video.videoUrl,
      youtubeId: video.youtubeId,
      sourceType: (video.sourceType as any) || (video.youtubeId ? 'link' : 'device'),
      hostId: attendee.userId,
      hostName: attendee.username,
      currentTime: 0,
      duration: initialDuration,
      isPlaying: false,
      lastUpdated: Date.now(),
      attendees: {
        [attendeeId]: attendee,
      },
      reactions: [],
      messages: [
        {
          id: 'welcome-' + Date.now(),
          senderName: 'Topson Media',
          text: `🎉 Watch Party room started for "${video.title}". Playback is synchronized in real-time!`,
          timestamp: 'Just now',
        },
      ],
    };
  } else {
    // Add or update current attendee
    existingRoom.attendees = {
      ...(existingRoom.attendees || {}),
      [attendeeId]: attendee,
    };
    if (isHost || !existingRoom.hostId) {
      existingRoom.hostId = attendee.userId;
      existingRoom.hostName = attendee.username;
    }
  }

  localRooms[roomId] = existingRoom;
  notifyLocal(roomId);

  // Sync to Firestore
  try {
    const docRef = doc(db, 'watch_parties', roomId);
    await setDoc(docRef, existingRoom, { merge: true });
  } catch (e) {
    console.warn('Firestore setDoc watch party fallback:', e);
  }

  // Sync to RTDB if available
  if (rtdb) {
    try {
      const roomRef = ref(rtdb, `watch_parties/${roomId}`);
      await set(roomRef, existingRoom);
    } catch (e) {
      // ignore
    }
  }

  return attendee;
}

/**
 * Update attendee's personal progress bar and playback time in real-time.
 */
export async function updateAttendeeProgress(
  roomId: string,
  attendeeId: string,
  currentTime: number,
  duration: number,
  isPlaying: boolean
): Promise<void> {
  const room = localRooms[roomId];
  if (room && room.attendees && room.attendees[attendeeId]) {
    room.attendees[attendeeId].currentTime = currentTime;
    room.attendees[attendeeId].duration = duration || room.attendees[attendeeId].duration;
    room.attendees[attendeeId].isPlaying = isPlaying;
    room.attendees[attendeeId].lastPing = Date.now();
    notifyLocal(roomId);
  }

  // Sync to Firestore
  try {
    const docRef = doc(db, 'watch_parties', roomId);
    await updateDoc(docRef, {
      [`attendees.${attendeeId}.currentTime`]: currentTime,
      [`attendees.${attendeeId}.duration`]: duration,
      [`attendees.${attendeeId}.isPlaying`]: isPlaying,
      [`attendees.${attendeeId}.lastPing`]: Date.now(),
    });
  } catch (e) {
    // ignore
  }

  // Sync to RTDB
  if (rtdb) {
    try {
      const attRef = ref(rtdb, `watch_parties/${roomId}/attendees/${attendeeId}`);
      await update(attRef, {
        currentTime,
        duration,
        isPlaying,
        lastPing: Date.now(),
      });
    } catch (e) {
      // ignore
    }
  }
}

/**
 * Update Host master playback (broadcast play/pause and timestamp to all attendees).
 */
export async function updateHostPlayback(
  roomId: string,
  currentTime: number,
  duration: number,
  isPlaying: boolean
): Promise<void> {
  const room = localRooms[roomId];
  if (room) {
    room.currentTime = currentTime;
    room.duration = duration || room.duration;
    room.isPlaying = isPlaying;
    room.lastUpdated = Date.now();
    notifyLocal(roomId);
  }

  try {
    const docRef = doc(db, 'watch_parties', roomId);
    await updateDoc(docRef, {
      currentTime,
      duration,
      isPlaying,
      lastUpdated: Date.now(),
    });
  } catch (e) {
    // fallback
  }

  if (rtdb) {
    try {
      const roomRef = ref(rtdb, `watch_parties/${roomId}`);
      await update(roomRef, {
        currentTime,
        duration,
        isPlaying,
        lastUpdated: Date.now(),
      });
    } catch (e) {
      // fallback
    }
  }
}

/**
 * Send an animated emoji reaction to all attendees.
 */
export async function sendWatchPartyReaction(
  roomId: string,
  emoji: string,
  sender: string
): Promise<void> {
  const reaction = {
    id: 'rx_' + Date.now() + Math.random().toString(36).substring(2, 6),
    emoji,
    sender,
    timestamp: Date.now(),
  };

  const room = localRooms[roomId];
  if (room) {
    room.reactions = [...(room.reactions || []).slice(-8), reaction];
    notifyLocal(roomId);
  }

  try {
    const docRef = doc(db, 'watch_parties', roomId);
    const existing = room?.reactions || [reaction];
    await updateDoc(docRef, {
      reactions: existing.slice(-8),
    });
  } catch (e) {
    // ignore
  }

  if (rtdb) {
    try {
      const rxRef = ref(rtdb, `watch_parties/${roomId}/reactions`);
      await set(rxRef, (room?.reactions || [reaction]).slice(-8));
    } catch (e) {
      // ignore
    }
  }
}

/**
 * Send a chat message in the watch party room.
 */
export async function sendWatchPartyMessage(
  roomId: string,
  message: WatchPartyMessage
): Promise<void> {
  const room = localRooms[roomId];
  if (room) {
    room.messages = [...(room.messages || []).slice(-30), message];
    notifyLocal(roomId);
  }

  try {
    const docRef = doc(db, 'watch_parties', roomId);
    await updateDoc(docRef, {
      messages: (room?.messages || [message]).slice(-30),
    });
  } catch (e) {
    // ignore
  }

  if (rtdb) {
    try {
      const msgRef = ref(rtdb, `watch_parties/${roomId}/messages`);
      await set(msgRef, (room?.messages || [message]).slice(-30));
    } catch (e) {
      // ignore
    }
  }
}

/**
 * Leave watch party room.
 */
export async function leaveWatchPartyRoom(
  roomId: string,
  attendeeId: string
): Promise<void> {
  const room = localRooms[roomId];
  if (room && room.attendees) {
    delete room.attendees[attendeeId];
    notifyLocal(roomId);
  }

  try {
    const docRef = doc(db, 'watch_parties', roomId);
    await updateDoc(docRef, {
      [`attendees.${attendeeId}`]: null,
    });
  } catch (e) {
    // ignore
  }

  if (rtdb) {
    try {
      const attRef = ref(rtdb, `watch_parties/${roomId}/attendees/${attendeeId}`);
      await set(attRef, null);
    } catch (e) {
      // ignore
    }
  }
}
