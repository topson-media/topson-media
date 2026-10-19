import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ArrowLeft,
  Copy,
  ExternalLink,
  Globe,
  Camera,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { auth, db, loginUserFromDb } from '../services/firebase';
import { User } from '../types';
import { TOPSON_PROFILE_IMAGE } from '../data/mockData';
import { useLanguage } from '../context/LanguageContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  initialMode?: 'signin' | 'signup' | 'admin';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'signin',
}) => {
  const { language } = useLanguage();
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [isResetMode, setIsResetMode] = useState(false);
  const [identifier, setIdentifier] = useState(''); // Email or Username for Sign In
  const [email, setEmail] = useState('');           // For Sign Up / Reset
  const [username, setUsername] = useState('');     // For Sign Up
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [domainCopied, setDomainCopied] = useState(false);

  const DEFAULT_MEMBER_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80';

  // Profile image for user account creation (uses regular member avatar, never admin profile picture)
  const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_MEMBER_AVATAR);
  const [avatarFileName, setAvatarFileName] = useState<string>('');
  const [noAccountFound, setNoAccountFound] = useState<boolean>(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsSignUp(initialMode === 'signup');
    setIsResetMode(false);
    setError(null);
    setSuccessMessage(null);
    setUnauthorizedDomain(null);
    setDomainCopied(false);
    setNoAccountFound(false);
    setPassword('');
  }, [initialMode, isOpen]);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFileName(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setAvatarUrl(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopyDomain = async (domainToCopy: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(domainToCopy);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = domainToCopy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setDomainCopied(true);
      setTimeout(() => setDomainCopied(false), 2500);
    } catch (copyErr) {
      console.error('Failed to copy domain to clipboard:', copyErr);
    }
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ---------------------------------------------------------------------------
  // PATHWAY A: GOOGLE SIGN-IN POPUP LOGIC (Instant Trust)
  // ---------------------------------------------------------------------------
  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsGoogleSubmitting(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      // Standard Firebase Auth method: signInWithPopup(auth, new GoogleAuthProvider())
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      if (!firebaseUser) {
        throw new Error('No user profile returned from Google.');
      }

      const uid = firebaseUser.uid;
      const userEmail = (firebaseUser.email || '').toLowerCase().trim();
      const displayName =
        firebaseUser.displayName ||
        userEmail.split('@')[0] ||
        'Topson Learner';
      const photoURL = firebaseUser.photoURL || TOPSON_PROFILE_IMAGE;

      const isAdmin =
        userEmail === 'topsonkenedy@gmail.com' ||
        userEmail === 'admin@topsonmedia.com' ||
        userEmail === 'jabsco59@gmail.com';

      // Check if this account was suspended by Topson Media in Firestore
      try {
        const existingDoc = await getDoc(doc(db, 'users', uid));
        if (existingDoc.exists() && existingDoc.data().suspended === true) {
          await signOut(auth);
          setError('Your account was suspended by Topson Media, you must call help center TM');
          setIsGoogleSubmitting(false);
          return;
        }
      } catch (checkErr) {
        console.warn('Suspension check notice:', checkErr);
      }

      const appUser: User = {
        id: uid,
        uid: uid,
        username: isAdmin ? 'Topson Media' : displayName,
        email: userEmail,
        role: isAdmin ? 'admin' : 'member',
        joinedDate: isAdmin ? 'Channel Creator & Admin' : 'Joined via Google',
        avatarUrl: photoURL,
      };

      // Since Google accounts are already fully verified by Google:
      // Instantly register/login their persistent user session & save metadata to users database
      try {
        await setDoc(
          doc(db, 'users', uid),
          {
            ...appUser,
            provider: 'google',
            isEmailVerified: true,
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      } catch (dbErr) {
        console.warn('Firestore user profile sync warning:', dbErr);
      }

      // Grant full access to Live Chat or tutorials seamlessly without requiring any additional verification links
      onSuccess(appUser);
      onClose();
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (
        err.code === 'auth/popup-closed-by-user' ||
        err.code === 'auth/cancelled-popup-request'
      ) {
        // User voluntarily dismissed the Google popup window
        setError(
          language === 'kn'
            ? 'Kwinjira na Google byahagaritswe. Ongera ugerageze.'
            : 'Google sign-in was cancelled. Please try again.'
        );
      } else if (err.code === 'auth/popup-blocked') {
        setError(
          language === 'kn'
            ? 'Browser yawe yabujije popup ya Google. Banza uyemerere popup.'
            : 'Popup blocked by browser. Please allow popups for this site.'
        );
      } else if (err.code === 'auth/unauthorized-domain') {
        const currentHostname =
          typeof window !== 'undefined' && window.location.hostname
            ? window.location.hostname
            : 'run.app';
        setUnauthorizedDomain(currentHostname);
        setError(
          language === 'kn'
            ? `Domain "${currentHostname}" ntiri muri Authorized Domains muri Firebase Console ya "topson-media-64bc9".`
            : `Domain "${currentHostname}" is not authorized for OAuth in Firebase Console ("topson-media-64bc9").`
        );
      } else {
        setError(
          err.message ||
            (language === 'kn'
              ? 'Ntibyakunze kwinjira na Google. Ongera ugerageze.'
              : 'Failed to sign in with Google. Please try again.')
        );
      }
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 4. RESET PASSWORD LOGIC (sendPasswordResetEmail)
  // ---------------------------------------------------------------------------
  const handleResetPassword = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    setError(null);
    setSuccessMessage(null);

    const emailToReset = (email || identifier).trim().toLowerCase();
    if (!emailToReset || !emailToReset.includes('@')) {
      setError(
        language === 'kn'
          ? 'Banza wandike aderesi ya email yawe ihamye kugira ngo twohereze link yo guhindura ijambobanga.'
          : 'Please enter a valid email address to receive the password reset link.'
      );
      return;
    }

    setIsResetSubmitting(true);
    try {
      // Trigger Firebase Auth sendPasswordResetEmail to send reset link to user's email
      await sendPasswordResetEmail(auth, emailToReset);

      setSuccessMessage(
        language === 'kn'
          ? `Twakwoherereje link yo guhindura ijambobanga kuri email "${emailToReset}". Banza uyifungure muli Gmail yawe uhindure ijambobanga!`
          : `Password reset link sent to "${emailToReset}". Please check your email to change your password!`
      );
      setIsResetMode(false);
    } catch (err: any) {
      console.warn('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        setError(
          language === 'kn'
            ? 'Nta konti ibonetse ifite iyi email. Banza ufungure konti.'
            : 'No account found with this email address.'
        );
      } else if (err.code === 'auth/invalid-email') {
        setError(
          language === 'kn'
            ? 'Aderesi ya email si yo. Yandike neza.'
            : 'Invalid email address format.'
        );
      } else {
        setError(
          err.message ||
            (language === 'kn'
              ? 'Ntibyakunze kohereza link yo guhindura ijambobanga. Ongera ugerageze.'
              : 'Failed to send password reset email. Please try again.')
        );
      }
    } finally {
      setIsResetSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // PATHWAY B: EMAIL/PASSWORD LOGIC (Strict Verification Gate)
  // ---------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        // =======================================================================
        // SIGN-UP PROCESS:
        // =======================================================================
        if (!email.trim() || !username.trim() || !password.trim()) {
          setError(
            language === 'kn'
              ? 'Uzuza imere, amazina, n\'ijambobanga byose.'
              : 'Email, Username, and Password are all required.'
          );
          setIsSubmitting(false);
          return;
        }

        if (password.length < 6) {
          setError(
            language === 'kn'
              ? 'Ijambobanga rigomba kugira byibuze inyuguti 6.'
              : 'Password must be at least 6 characters.'
          );
          setIsSubmitting(false);
          return;
        }

        // 1. Create user account via createUserWithEmailAndPassword(auth, email, password)
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email.trim().toLowerCase(),
          password
        );

        const newUser = userCredential.user;
        if (newUser) {
          const chosenAvatar = avatarUrl || DEFAULT_MEMBER_AVATAR;

          try {
            await updateProfile(newUser, {
              displayName: username.trim(),
              photoURL: chosenAvatar,
            });
          } catch {}

          const uid = newUser.uid;
          const newUserData: User = {
            id: uid,
            uid: uid,
            username: username.trim(),
            email: email.trim().toLowerCase(),
            role: 'member',
            joinedDate: 'Joined today',
            avatarUrl: chosenAvatar,
          };

          // Hold database entry in pending state until email confirmation is complete
          // Users are NOT saved into active users table until auth.currentUser.emailVerified evaluates to true
          try {
            await setDoc(doc(db, 'pending_verifications', uid), {
              ...newUserData,
              provider: 'password',
              isEmailVerified: false,
              status: 'pending_verification',
              createdAt: Date.now(),
            });
          } catch (dbErr) {
            console.warn('Pending verification record notice:', dbErr);
          }

          // 2. Immediately trigger the official verification function: sendEmailVerification(auth.currentUser)
          await sendEmailVerification(newUser);

          // 3. Directly after triggering the email, enforce an immediate session clear using signOut(auth)
          await signOut(auth);

          // 4. Display clear neon-orange success alert exactly as instructed
          setSuccessMessage(
            language === 'kn'
              ? 'Konti yawe yakozwe neza! Twakwoherereje link muli Gmail yawe. Banza uyifungure ukande kuri iyo link ngo wemeze imere yawe mbere yo kwinjira!'
              : 'Account created successfully! A verification link was sent to your email. Please verify your email in your inbox before signing in!'
          );

          // Switch view to Sign In so they can enter credentials once verified
          setIsSignUp(false);
          setIdentifier(email.trim().toLowerCase());
          setPassword('');
        }
      } else {
        // =======================================================================
        // SIGN-IN PROCESS:
        // =======================================================================
        if (!identifier.trim() || !password.trim()) {
          setError(
            language === 'kn'
              ? 'Uzuza imere (cyangwa amazina) hamwe n\'ijambobanga.'
              : 'Please enter both your email/username and password.'
          );
          setIsSubmitting(false);
          return;
        }

        const inputIdentifier = identifier.trim();
        const normalized = inputIdentifier.toLowerCase();

        // 1. Direct Official Admin Credentials Check
        const isAdminTarget =
          normalized === 'topsonkenedy@gmail.com' ||
          normalized === 'admin@topsonmedia.com' ||
          normalized === 'topsonkenedy' ||
          normalized === 'admin' ||
          normalized === 'topson';

        if (isAdminTarget) {
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
              avatarUrl: TOPSON_PROFILE_IMAGE,
              visitsCount: 999,
              fanBadge: true,
            };

            try {
              await setDoc(
                doc(db, 'users', 'admin-topsonkenedy'),
                {
                  ...adminUser,
                  provider: 'password',
                  isEmailVerified: true,
                  updatedAt: Date.now(),
                },
                { merge: true }
              );
            } catch {}

            onSuccess(adminUser);
            onClose();
            return;
          } else {
            setError(
              language === 'kn'
                ? 'Ijambobanga ry\'ubuyobozi si ryo (Wrong admin password)!'
                : 'Incorrect password for Admin account.'
            );
            setIsSubmitting(false);
            return;
          }
        }

        // 2. Standard Email/Password Sign-In via signInWithEmailAndPassword(auth, email, password)
        // If user didn't create account, Firebase will reject with auth/user-not-found or auth/invalid-credential
        const signinResult = await signInWithEmailAndPassword(
          auth,
          inputIdentifier,
          password
        );

        const currentSignedInUser = signinResult.user || auth.currentUser;

        // Strict boolean conditional block: if (!auth.currentUser.emailVerified)
        if (!currentSignedInUser || !currentSignedInUser.emailVerified) {
          // Re-send verification link to the typed email so user receives verification link
          if (currentSignedInUser && !currentSignedInUser.emailVerified) {
            try {
              await sendEmailVerification(currentSignedInUser);
            } catch (vErr) {
              console.warn('Resend verification link notice:', vErr);
            }
          }

          // Immediately call signOut(auth) to freeze and block their access
          await signOut(auth);

          // Display strict error message layout exactly as instructed
          setError(
            language === 'kn'
              ? 'Banza wemeze email yawe muli Gmail ngo ubone kwinjira muli website!'
              : 'Please verify your email address in Gmail before signing in to the website!'
          );
          setIsSubmitting(false);
          return;
        }

        // Verified user! Retrieve or sync profile
        const firebaseUser = currentSignedInUser;
        const uid = firebaseUser.uid;
        const verifiedEmail = (firebaseUser.email || inputIdentifier).toLowerCase();

        const isAdmin = verifiedEmail === 'topsonkenedy@gmail.com';

        let appUser: User = {
          id: uid,
          uid: uid,
          username: isAdmin
            ? 'Topson Kenedy'
            : firebaseUser.displayName || verifiedEmail.split('@')[0],
          email: verifiedEmail,
          role: isAdmin ? 'admin' : 'member',
          joinedDate: isAdmin ? 'Channel Creator & Admin' : 'Joined member',
          avatarUrl: firebaseUser.photoURL || TOPSON_PROFILE_IMAGE,
        };

        // Check if user is suspended in Firestore
        try {
          const userSnap = await getDoc(doc(db, 'users', uid));
          if (userSnap.exists() && userSnap.data().suspended === true) {
            await signOut(auth);
            setError('Your account was suspended by Topson Media, you must call help center TM');
            setIsSubmitting(false);
            return;
          }
        } catch {}

        // Email is verified! Promote from pending_verifications to active users collection
        try {
          const pendingSnap = await getDoc(doc(db, 'pending_verifications', uid));
          const userSnap = await getDoc(doc(db, 'users', uid));

          if (pendingSnap.exists()) {
            const pData = pendingSnap.data();
            appUser = {
              ...appUser,
              username: pData.username || appUser.username,
              avatarUrl: pData.avatarUrl || appUser.avatarUrl,
              role: pData.role || appUser.role,
              isEmailVerified: true,
            };
          } else if (userSnap.exists()) {
            const data = userSnap.data();
            appUser = {
              ...appUser,
              username: data.username || appUser.username,
              avatarUrl: data.avatarUrl || appUser.avatarUrl,
              role: data.role || appUser.role,
              isEmailVerified: true,
            };
          }

          // Save to active users table now that email confirmation is complete
          await setDoc(
            doc(db, 'users', uid),
            {
              ...appUser,
              provider: 'password',
              isEmailVerified: true,
              updatedAt: Date.now(),
            },
            { merge: true }
          );

          // Clean up pending entry
          if (pendingSnap.exists()) {
            await deleteDoc(doc(db, 'pending_verifications', uid)).catch(() => {});
          }
        } catch (dbErr) {
          console.warn('User promotion sync notice:', dbErr);
        }

        onSuccess(appUser);
        onClose();
      }
    } catch (err: any) {
      console.warn('Email/Password auth error:', err);

      // Check if Admin special login fallback is needed
      const normalized = identifier.trim().toLowerCase();
      if (
        !isSignUp &&
        (normalized === 'topsonkenedy@gmail.com' ||
          normalized === 'admin@topsonmedia.com' ||
          normalized === 'topsonkenedy' ||
          normalized === 'admin')
      ) {
        if (password === 'nzayikoreraetsiyene@jonas' || password === 'topson2025') {
          const adminCheck = await loginUserFromDb(identifier, password);
          if (adminCheck.success) {
            onSuccess(adminCheck.user);
            onClose();
            return;
          }
        }
      }

      if (err.code === 'auth/operation-not-allowed') {
        setError(
          language === 'kn'
            ? 'Uburyo bwa Email/Password ntiburemererwa muri Firebase. Banza ubyemeze muri Authentication > Sign-in providers.'
            : 'Email/Password sign-in is not enabled in Firebase Authentication console. Please make sure Email/Password is toggled ON under Authentication > Sign-in method.'
        );
      } else if (err.code === 'auth/email-already-in-use') {
        setError(
          language === 'kn'
            ? 'Iyi email isanzwe ikoreshwa. Banza winjire (Sign In).'
            : 'Email is already in use. Please sign in instead.'
        );
      } else if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-credential'
      ) {
        // Explicitly block users who haven't created an account yet
        setNoAccountFound(true);
        setError(
          language === 'kn'
            ? 'Nta konti ibonetse ifite iyi email! Ntiwemerewe kwinjira utabanje gufungura konti. Banza ufungure konti nshya hasi hano.'
            : 'No account found with this email. You cannot sign in without creating an account first! Please create your account below.'
        );
      } else if (err.code === 'auth/wrong-password') {
        setError(
          language === 'kn'
            ? 'Ijambobanga si ryo (Wrong password).'
            : 'Incorrect password.'
        );
      } else if (err.code === 'auth/invalid-email') {
        setError(
          language === 'kn'
            ? 'Uzuza imere (Email) ihamye kandi ibaho neza!'
            : 'Please enter a valid email address.'
        );
      } else if (err.code === 'auth/too-many-requests') {
        setError(
          language === 'kn'
            ? 'Wagerageje kenshi cyane. Banza utegereze akanya gato.'
            : 'Too many failed attempts. Please wait a moment.'
        );
      } else {
        setError(
          err.message ||
            (language === 'kn'
              ? 'Habaye ikibazo. Ongera ugerageze.'
              : 'An unexpected error occurred. Please try again.')
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 md:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md lg:max-w-4xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto bg-slate-950 rounded-2xl sm:rounded-3xl shadow-[0_0_60px_rgba(249,115,22,0.35)] border border-orange-500/40 relative my-auto animate-in zoom-in-95 duration-200 grid grid-cols-1 lg:grid-cols-12 custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================================= */}
        {/* LEFT SIDE: DYNAMIC VISUAL AREA WITH FLOATING PROFILE & AMBIENT NEON GLOW  */}
        {/* HIDDEN ON MOBILE & TABLET (up to lg breakpoint), VISIBLE ON LG+ SCREENS  */}
        {/* ========================================================================= */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-b from-slate-950 via-slate-900 to-black p-6 lg:p-8 flex-col items-center justify-between relative overflow-hidden text-center border-b lg:border-b-0 lg:border-r border-slate-800/80">
          {/* Ambient High-End Neon-Orange Radial Glow & Cyber Grid */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(249,115,22,0.4)_0%,rgba(0,0,0,0)_75%)] pointer-events-none animate-pulse" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#f9731612_1px,transparent_1px),linear-gradient(to_bottom,#f9731612_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-40" />

          {/* Top subtle branding badge */}
          <div className="relative z-10 w-full flex items-center justify-between text-left">
            <span className="text-[11px] font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 border border-orange-500/30 px-3 py-1 rounded-full shadow-[0_0_12px_rgba(249,115,22,0.3)]">
              Official Hub
            </span>
            <span className="text-[11px] font-bold text-slate-400">
              TM 2025
            </span>
          </div>

          {/* Floating Profile Picture: Smooth infinite gliding animation with neon radial ring */}
          <div className="relative z-10 my-auto py-4 flex flex-col items-center">
            {/* Ambient Radial Backlight Glow */}
            <div className="absolute -inset-6 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 opacity-50 blur-2xl animate-pulse pointer-events-none" />

            {/* Floating Image with Smooth CSS Translation Loop */}
            <div className="relative w-32 h-32 lg:w-40 lg:h-40 rounded-full p-1.5 bg-gradient-to-tr from-orange-500 via-amber-400 to-orange-600 shadow-[0_0_40px_rgba(249,115,22,0.7)] animate-bounce [animation-duration:3.6s] ease-in-out">
              <div className="w-full h-full rounded-full overflow-hidden bg-slate-950 p-1 border-2 border-white/30">
                <img
                  src={TOPSON_PROFILE_IMAGE}
                  alt="topson media"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    e.currentTarget.src = '/welcome.png';
                  }}
                />
              </div>
            </div>

            {/* Text description under floating image */}
            <h3 className="text-xl font-black text-white tracking-tight mt-4">
              topson media
            </h3>
            <p className="text-xs text-slate-300 font-medium max-w-[240px] mt-1.5 leading-relaxed">
              Empowering you with Phone & PC tutorials, daily tech hacks, and 24/7 direct support.
            </p>

            {/* Feature Badges */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
              <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-bold shadow-[0_0_10px_rgba(249,115,22,0.25)]">
                YouTube Partner
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700 text-[10px] font-bold">
                Live Support
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700 text-[10px] font-bold">
                100% Free
              </span>
            </div>
          </div>

          {/* Bottom quote / footer in left side */}
          <div className="relative z-10 text-[10.5px] text-slate-400 font-medium">
            &ldquo;Making tech feel easy for curious minds everywhere&rdquo;
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT SIDE: ZERO-SCROLL TIGHTENED CREDENTIALS SECTION & GOOGLE BUTTON     */}
        {/* ========================================================================= */}
        <div className="col-span-12 lg:col-span-7 bg-white text-neutral-900 p-3 sm:p-4 md:p-5 flex flex-col justify-between relative overflow-y-auto max-h-[95vh] md:max-h-[90vh] custom-scrollbar">
          <div className="w-full max-w-md lg:max-w-lg mx-auto flex flex-col justify-between h-full">
            {/* Top Form Header with Close Button */}
            <div className="pb-2 sm:pb-2.5 border-b border-neutral-100 flex items-start justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-black text-neutral-950 tracking-tight leading-tight">
                  {isResetMode
                    ? language === 'kn'
                      ? 'Guhindura Ijambobanga'
                      : 'Reset Password'
                    : isSignUp
                    ? language === 'kn'
                      ? 'Join Topson Media'
                      : 'Join Topson Media'
                    : language === 'kn'
                    ? 'Injira muli Topson Media'
                    : 'Sign In to Topson Media'}
                </h2>
                <p className="text-[10px] sm:text-[11px] text-neutral-500 font-medium mt-0.5">
                  {isResetMode
                    ? language === 'kn'
                      ? 'Twandikire email tukoherereze link yo guhindura ijambobanga'
                      : 'Enter email to receive password reset link'
                    : isSignUp
                    ? language === 'kn'
                      ? 'Kora konti yawe ngo ubone tutorials na live chat yihuse'
                      : 'Create your account to access tutorials and instant live chat'
                    : language === 'kn'
                    ? 'Injira muri konti yawe ya Topson Media'
                    : 'Welcome back! Please enter your details'}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"
                aria-label="Close authentication modal"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* Form Content */}
            <div className="py-1.5 sm:py-2 space-y-1.5 sm:space-y-2">
          {/* Neon-Orange Success Alert (Sign-Up Email Verification / Reset Password Link) */}
          {successMessage && (
            <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-600/15 border-2 border-orange-500 text-neutral-950 shadow-[0_0_20px_rgba(249,115,22,0.3)] flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
              <div className="w-5 h-5 rounded-md bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-neutral-950 leading-relaxed">
                  {successMessage}
                </p>
                <div className="mt-1 text-[10px] font-semibold text-orange-800 flex items-center gap-1">
                  <span>📩</span>
                  <span>
                    {language === 'kn'
                      ? 'Reba no mu gasanduku ka Spam/Junk niba ubutumwa butahageze vuba.'
                      : 'Check your Inbox and Spam/Junk folder if not seen right away.'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Neon-Orange Error Alert (Unverified Account or Auth Failures) */}
          {error && (
            <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-600/15 border-2 border-orange-500 text-neutral-950 shadow-[0_0_20px_rgba(249,115,22,0.3)] flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
              <div className="w-5 h-5 rounded-md bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <AlertCircle className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-neutral-950 leading-relaxed">
                  {error}
                </p>

                {/* Direct quick action: create account button if no account found */}
                {noAccountFound && (
                  <div className="mt-3 pt-2.5 border-t border-orange-500/30">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(true);
                        setError(null);
                        setNoAccountFound(false);
                        if (identifier && identifier.includes('@')) {
                          setEmail(identifier.trim());
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-orange-600/30 cursor-pointer"
                    >
                      <span>
                        + {language === 'kn' ? 'Fungura Konti Nshya Nonaha' : 'Create Your Account Now'}
                      </span>
                    </button>
                  </div>
                )}

                {/* Unauthorized Domain Interactive Solution Helper */}
                {unauthorizedDomain && (
                  <div className="mt-3 pt-3 border-t border-orange-500/30 space-y-2.5 text-neutral-900">
                    <p className="text-[11px] font-bold text-orange-950 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-orange-600" />
                      <span>
                        {language === 'kn'
                          ? 'Aderesi igomba kongerwa muri Firebase Console:'
                          : 'Domain to add to Firebase Console Authorized Domains:'}
                      </span>
                    </p>

                    <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/95 border border-orange-300 shadow-2xs">
                      <code className="text-[11px] sm:text-xs font-mono font-bold text-neutral-900 truncate select-all">
                        {unauthorizedDomain}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopyDomain(unauthorizedDomain)}
                        className="shrink-0 px-2.5 py-1 text-[11px] font-bold rounded-md bg-orange-500 hover:bg-orange-600 active:scale-95 text-white transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                        title="Copy domain to clipboard"
                      >
                        {domainCopied ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{language === 'kn' ? 'Yandukuwe!' : 'Copied!'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{language === 'kn' ? 'Koporora' : 'Copy'}</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="text-[10px] sm:text-[11px] text-neutral-800 space-y-1 bg-orange-50/70 p-2.5 rounded-lg border border-orange-200">
                      <p className="font-bold text-neutral-950">
                        {language === 'kn'
                          ? 'Uburyo bworoshye bwo kubikemura:'
                          : 'Quick 3-step setup in Firebase Console:'}
                      </p>
                      <ol className="list-decimal pl-4 space-y-1 text-neutral-700">
                        <li>
                          {language === 'kn' ? (
                            <>
                              Fungura{' '}
                              <a
                                href="https://console.firebase.google.com/project/topson-media-64bc9/authentication/settings"
                                target="_blank"
                                rel="noreferrer"
                                className="underline font-bold text-orange-700 hover:text-orange-900 inline-flex items-center gap-0.5"
                              >
                                Firebase Console Settings{' '}
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </>
                          ) : (
                            <>
                              Open{' '}
                              <a
                                href="https://console.firebase.google.com/project/topson-media-64bc9/authentication/settings"
                                target="_blank"
                                rel="noreferrer"
                                className="underline font-bold text-orange-700 hover:text-orange-900 inline-flex items-center gap-0.5"
                              >
                                Firebase Console Settings{' '}
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </>
                          )}
                        </li>
                        <li>
                          {language === 'kn'
                            ? 'Muri "Authorized domains", kanda "Add domain"'
                            : 'Under "Authorized domains", click "Add domain"'}
                        </li>
                        <li>
                          {language === 'kn'
                            ? 'Shyiramo domain wakoporoye hejuru (cyangwa shyiramo "run.app") hanyuma ukande "Add"'
                            : 'Paste the domain copied above (or simply "run.app") and save'}
                        </li>
                      </ol>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setUnauthorizedDomain(null);
                        const input = document.getElementById('auth-email-input');
                        if (input) {
                          input.focus();
                        }
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <span>
                        👉{' '}
                        {language === 'kn'
                          ? 'Koresha Email & Password hasi hano (Birakora nonaha)'
                          : 'Use Email & Password below instead (Works instantly)'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* RESET PASSWORD VIEW (Triggered from 'Forgot Password' link)     */}
          {/* --------------------------------------------------------------- */}
          {isResetMode ? (
            <form onSubmit={handleResetPassword} className="space-y-3.5" noValidate>
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-neutral-800 mb-1">
                  {language === 'kn' ? 'Aderesi ya Email yawe' : 'Your Email Address'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email || identifier}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setIdentifier(e.target.value);
                    }}
                    placeholder="you@gmail.com"
                    className="w-full h-10 sm:h-11 pl-9 pr-3 text-xs sm:text-sm rounded-xl bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all shadow-2xs"
                  />
                </div>
                <p className="text-[10px] text-neutral-500 mt-1.5 font-medium leading-relaxed">
                  {language === 'kn'
                    ? 'Turakwoherereza link muli Gmail yawe igufasha gushyiraho ijambobanga rishya ryizewe.'
                    : 'We will send a secure link to your Gmail so you can set a new password.'}
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={isResetSubmitting}
                  className="w-full h-10 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 active:scale-[0.99] text-white font-black text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isResetSubmitting ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>
                        {language === 'kn'
                          ? 'Ohereza Link yo Guhindura Ijambobanga'
                          : 'Send Password Reset Link'}
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(false);
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="w-full py-2 text-xs font-bold text-neutral-600 hover:text-neutral-900 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>
                    {language === 'kn'
                      ? 'Subira Ahandikirwa Ijambobanga (Sign In)'
                      : 'Back to Sign In'}
                  </span>
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* --------------------------------------------------------------- */}
              {/* PATHWAY A: PROMINENT "CONTINUE WITH GOOGLE" BUTTON              */}
              {/* --------------------------------------------------------------- */}
              <div>
                <button
                  type="button"
                  disabled={isGoogleSubmitting || isSubmitting}
                  onClick={handleGoogleSignIn}
                  className="w-full h-10 px-3 rounded-xl bg-white hover:bg-neutral-50 active:scale-[0.99] border-2 border-neutral-200 hover:border-neutral-300 transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-xs font-bold text-xs sm:text-sm text-neutral-800 disabled:opacity-50"
                >
                  {isGoogleSubmitting ? (
                    <span className="w-4 h-4 border-2 border-neutral-300 border-t-orange-500 rounded-full animate-spin" />
                  ) : (
                    <>
                      {/* Official Google Vector Logo */}
                      <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>
                        {language === 'kn'
                          ? 'Komeza na Google'
                          : 'Continue with Google'}
                      </span>
                    </>
                  )}
                </button>
                <p className="text-[9.5px] sm:text-[10px] text-neutral-400 text-center mt-1 font-medium">
                  {language === 'kn'
                    ? '⚡ Banza winjire nta gusaba kwemeza email'
                    : '⚡ Instant access · No manual verification email needed'}
                </p>
              </div>

              {/* Sharp Divider */}
              <div className="flex items-center my-1.5 sm:my-2">
                <div className="flex-1 border-t border-neutral-200" />
                <span className="px-2.5 text-[9.5px] sm:text-[10px] uppercase tracking-wider text-neutral-400 font-bold">
                  {language === 'kn' ? 'CYANGWA' : 'OR'}
                </span>
                <div className="flex-1 border-t border-neutral-200" />
              </div>

              {/* --------------------------------------------------------------- */}
              {/* PATHWAY B: TRADITIONAL EMAIL / PASSWORD INPUTS                  */}
              {/* --------------------------------------------------------------- */}
              <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-2.5" noValidate>
                {/* Profile Image Picker (Asked when creating account) */}
                {isSignUp && (
                  <div className="p-2 sm:p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10.5px] sm:text-xs font-bold text-neutral-800">
                        {language === 'kn' ? 'Ifoto ya Profile' : 'Profile Image'} <span className="text-orange-600 font-semibold text-[9.5px]">({language === 'kn' ? 'Hitamo' : 'Choose'})</span>
                      </label>
                      <span className="text-[9.5px] text-neutral-400 font-medium">PNG, JPG, WebP</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {/* Active Avatar Circular Preview */}
                      <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-orange-500 shadow-xs shrink-0 bg-white">
                        <img
                          src={avatarUrl || DEFAULT_MEMBER_AVATAR}
                          alt="Profile Preview"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = DEFAULT_MEMBER_AVATAR;
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarFileChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          className="w-full h-7 py-0.5 px-2.5 rounded-lg border border-dashed border-neutral-300 hover:border-orange-500 bg-white text-[10px] sm:text-[11px] font-bold text-neutral-700 hover:text-orange-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Camera className="w-3 h-3 text-orange-500 shrink-0" />
                          <span className="truncate">
                            {avatarFileName ? avatarFileName : (language === 'kn' ? 'Shyiraho Ifoto (Upload)' : 'Upload from Device')}
                          </span>
                        </button>

                        {/* Quick Avatar Presets (Member-only avatars, very compact) */}
                        <div className="flex items-center gap-1.5 overflow-x-auto">
                          <span className="text-[9.5px] text-neutral-400 font-semibold shrink-0">
                            {language === 'kn' ? 'Cyangwa:' : 'Presets:'}
                          </span>
                          {[
                            { name: 'Tech Explorer', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80' },
                            { name: 'Creator', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80' },
                            { name: 'Tech Pro', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80' },
                            { name: 'Developer', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80' },
                            { name: 'Innovator', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80' },
                          ].map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setAvatarUrl(preset.url);
                                setAvatarFileName('');
                              }}
                              className={`w-5 h-5 rounded-full overflow-hidden border transition-transform cursor-pointer shrink-0 ${
                                avatarUrl === preset.url
                                  ? 'border-orange-500 ring-2 ring-orange-500/40 scale-110'
                                  : 'border-neutral-200 hover:border-neutral-400 opacity-80 hover:opacity-100'
                              }`}
                              title={preset.name}
                            >
                              <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Username Input (Only on Sign-Up) */}
                {isSignUp && (
                  <div>
                    <label className="block text-[10.5px] sm:text-xs font-bold text-neutral-800 mb-0.5">
                      {language === 'kn' ? 'Amazina yawe' : 'Your Username'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-neutral-400">
                        <UserIcon className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. Eric Mugisha"
                        className="w-full h-10 pl-8 pr-3 text-xs sm:text-sm rounded-xl bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all shadow-2xs"
                      />
                    </div>
                  </div>
                )}

                {/* Email Field */}
                <div>
                  <label className="block text-[10.5px] sm:text-xs font-bold text-neutral-800 mb-0.5">
                    {isSignUp
                      ? language === 'kn'
                        ? 'Aderesi ya Email'
                        : 'Email Address'
                      : language === 'kn'
                      ? 'Aderesi ya Email cyangwa Amazina'
                      : 'Email Address or Username'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-neutral-400">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <input
                      id="auth-email-input"
                      type={isSignUp ? 'email' : 'text'}
                      required
                      value={isSignUp ? email : identifier}
                      onChange={(e) =>
                        isSignUp
                          ? setEmail(e.target.value)
                          : setIdentifier(e.target.value)
                      }
                      placeholder={
                        isSignUp ? 'you@gmail.com' : 'you@gmail.com or username'
                      }
                      className="w-full h-10 pl-8 pr-3 text-xs sm:text-sm rounded-xl bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all shadow-2xs"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-[10.5px] sm:text-xs font-bold text-neutral-800 mb-0.5">
                    {language === 'kn' ? 'Ijambobanga (Password)' : 'Password'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-neutral-400">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-10 pl-8 pr-9 text-xs sm:text-sm rounded-xl bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* 4. RESET PASSWORD UNDER PASSWORD FIELD */}
                  {!isSignUp && (
                    <div className="flex items-center justify-between pt-1 px-0.5">
                      <span className="text-[9.5px] text-neutral-400">
                        {language === 'kn' ? 'Wibagiwe ijambobanga?' : 'Trouble logging in?'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsResetMode(true);
                          setError(null);
                          setSuccessMessage(null);
                          if (identifier && identifier.includes('@')) {
                            setEmail(identifier.trim());
                          }
                        }}
                        className="text-[10.5px] font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer transition-colors"
                      >
                        {language === 'kn'
                          ? 'Hindura ijambobanga (Reset)'
                          : 'Forgot / Reset password?'}
                      </button>
                    </div>
                  )}

                  {isSignUp && (
                    <p className="text-[9.5px] text-neutral-400 mt-0.5 font-medium">
                      {language === 'kn'
                        ? 'Byibuze inyuguti 6 · Link yo kwemeza izoherezwa kuri iyi email'
                        : 'At least 6 characters · Verification link sent to this email'}
                    </p>
                  )}
                </div>

                {/* Action Submit Button */}
                <div className="pt-0.5">
                  <button
                    type="submit"
                    disabled={isSubmitting || isGoogleSubmitting}
                    className="w-full h-10 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-900 active:scale-[0.99] text-white font-black text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span>
                        {isSignUp
                          ? language === 'kn'
                            ? 'Fungura Konti (Kora Sign Up)'
                            : 'Create Account'
                          : language === 'kn'
                          ? 'Injira (Sign In)'
                          : 'Sign In'}
                      </span>
                    )}
                  </button>
                </div>
              </form>

              {/* Mode Switcher Footer */}
              <div className="pt-1.5 border-t border-neutral-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[11px] sm:text-xs font-semibold text-neutral-600 hover:text-orange-600 transition-colors cursor-pointer"
                >
                  {isSignUp ? (
                    <>
                      <span>
                        {language === 'kn'
                          ? 'Ufite konti isanzwe? '
                          : 'Already have an account? '}
                      </span>
                      <span className="font-bold text-orange-600 underline">
                        {language === 'kn' ? 'Injira hano' : 'Sign In here'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        {language === 'kn'
                          ? 'Nta konti ufite? '
                          : "Don't have an account? "}
                      </span>
                      <span className="font-bold text-orange-600 underline">
                        {language === 'kn' ? 'Fungura konti hano' : 'Sign Up here'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  </div>
);
};
