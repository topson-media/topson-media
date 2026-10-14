import React, { useState, useEffect } from 'react';
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
import { doc, setDoc, getDoc } from 'firebase/firestore';
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

  useEffect(() => {
    setIsSignUp(initialMode === 'signup');
    setIsResetMode(false);
    setError(null);
    setSuccessMessage(null);
    setPassword('');
  }, [initialMode, isOpen]);

  // Handle ESC key to dismiss modal cleanly
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
        await createUserWithEmailAndPassword(
          auth,
          email.trim().toLowerCase(),
          password
        );

        if (auth.currentUser) {
          try {
            await updateProfile(auth.currentUser, {
              displayName: username.trim(),
            });
          } catch {}

          const uid = auth.currentUser.uid;
          const newUserData: User = {
            id: uid,
            uid: uid,
            username: username.trim(),
            email: email.trim().toLowerCase(),
            role: 'member',
            joinedDate: 'Joined today',
            avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
              username.trim()
            )}`,
          };

          // Save profile metadata to Firestore users table
          try {
            await setDoc(doc(db, 'users', uid), {
              ...newUserData,
              provider: 'password',
              isEmailVerified: false,
              createdAt: Date.now(),
            });
          } catch (dbErr) {
            console.warn('Firestore record error:', dbErr);
          }

          // 2. Immediately trigger official verification function: sendEmailVerification(auth.currentUser)
          await sendEmailVerification(auth.currentUser);

          // 3. Directly after triggering email, enforce immediate session clear using signOut(auth)
          await signOut(auth);

          // 4. Display clear neon-orange success alert
          setSuccessMessage(
            'Konti yawe yakozwe neza! Twakwoherereje link muli Gmail yawe. Banza uyifungure ukande kuri iyo link ngo wemeze imere yawe mbere yo kwinjira!'
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

        // Check if master admin username without @ (e.g. "admin", "topsonkenedy")
        const isAdminSpecialUsername =
          (normalized === 'admin' ||
            normalized === 'topsonkenedy' ||
            normalized === 'topson' ||
            normalized === 'jabsco59') &&
          !normalized.includes('@');

        if (isAdminSpecialUsername) {
          const adminCheck = await loginUserFromDb(inputIdentifier, password);
          if (adminCheck.success) {
            onSuccess(adminCheck.user);
            onClose();
            return;
          } else {
            setError(
              adminCheck.error === 'wrong_password'
                ? language === 'kn'
                  ? 'Ijambobanga si ryo (Wrong password)!'
                  : 'Incorrect password.'
                : language === 'kn'
                ? 'Konti ntibonetse (Account not found).'
                : 'Account not found.'
            );
            setIsSubmitting(false);
            return;
          }
        }

        // Standard Email/Password Sign-In via signInWithEmailAndPassword(auth, email, password)
        await signInWithEmailAndPassword(
          auth,
          inputIdentifier,
          password
        );

        // Strict boolean conditional block: if (!auth.currentUser.emailVerified)
        if (!auth.currentUser || !auth.currentUser.emailVerified) {
          // Immediately call signOut(auth) to freeze and block access
          await signOut(auth);

          // Display strict error message layout exactly as instructed
          setError(
            'Banza wemeze email yawe muli Gmail ngo ubone kwinjira muli website!'
          );
          setIsSubmitting(false);
          return;
        }

        // Verified user! Retrieve or sync profile
        const firebaseUser = auth.currentUser;
        const uid = firebaseUser.uid;
        const verifiedEmail = (firebaseUser.email || inputIdentifier).toLowerCase();

        const isAdmin =
          verifiedEmail === 'topsonkenedy@gmail.com' ||
          verifiedEmail === 'admin@topsonmedia.com' ||
          verifiedEmail === 'jabsco59@gmail.com';

        let appUser: User = {
          id: uid,
          uid: uid,
          username: isAdmin
            ? 'Topson Media'
            : firebaseUser.displayName || verifiedEmail.split('@')[0],
          email: verifiedEmail,
          role: isAdmin ? 'admin' : 'member',
          joinedDate: isAdmin ? 'Channel Creator & Admin' : 'Joined member',
          avatarUrl: firebaseUser.photoURL || TOPSON_PROFILE_IMAGE,
        };

        // Query Firestore users record to preserve custom avatar/username
        try {
          const userSnap = await getDoc(doc(db, 'users', uid));
          if (userSnap.exists()) {
            const data = userSnap.data();
            appUser = {
              ...appUser,
              username: data.username || appUser.username,
              avatarUrl: data.avatarUrl || appUser.avatarUrl,
              role: data.role || appUser.role,
            };
          } else {
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
          }
        } catch {}

        onSuccess(appUser);
        onClose();
      }
    } catch (err: any) {
      console.warn('Email/Password auth error:', err);

      // Handle Admin master fallback if applicable
      const normalized = identifier.trim().toLowerCase();
      if (
        !isSignUp &&
        (normalized === 'admin@topsonmedia.com' ||
          normalized === 'topsonkenedy@gmail.com' ||
          normalized === 'jabsco59@gmail.com')
      ) {
        const fallbackAdmin = await loginUserFromDb(identifier, password);
        if (fallbackAdmin.success) {
          onSuccess(fallbackAdmin.user);
          onClose();
          return;
        }
      }

      if (err.code === 'auth/email-already-in-use') {
        setError(
          language === 'kn'
            ? 'Iyi email isanzwe ikoreshwa. Banza winjire (Sign In).'
            : 'Email is already in use. Please sign in instead.'
        );
      } else if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-credential'
      ) {
        setError(
          language === 'kn'
            ? 'Imere cyangwa ijambobanga si byo.'
            : 'Invalid email or password.'
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden relative my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="p-5 sm:p-6 pb-4 sm:pb-5 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-sm shadow-sm shadow-orange-500/30">
              TM
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-neutral-900 leading-tight">
                {isResetMode
                  ? language === 'kn'
                    ? 'Guhindura Ijambobanga'
                    : 'Reset Password'
                  : isSignUp
                  ? language === 'kn'
                    ? 'Fungura Konti Nshya'
                    : 'Create Your Account'
                  : language === 'kn'
                  ? 'Injira muli Topson Media'
                  : 'Sign In to Topson Media'}
              </h3>
              <p className="text-[11px] sm:text-xs text-neutral-500 font-medium">
                {isResetMode
                  ? language === 'kn'
                    ? 'Twandikire email yawe tukoherereze link muli Gmail'
                    : 'Enter your email to receive a password reset link'
                  : language === 'kn'
                  ? 'Ikoranabuhanga rikgutera imbere buri munsi'
                  : 'Practical Phone & PC tech tutorials'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close authentication modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Neon-Orange Success Alert (Sign-Up Email Verification / Reset Password Link) */}
          {successMessage && (
            <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-600/15 border-2 border-orange-500 text-neutral-950 shadow-[0_0_25px_rgba(249,115,22,0.35)] flex items-start gap-2.5 sm:gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="w-6 h-6 rounded-lg bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold text-neutral-950 leading-relaxed">
                  {successMessage}
                </p>
                <div className="mt-2 text-[10px] sm:text-[11px] font-semibold text-orange-800 flex items-center gap-1">
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
            <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-600/15 border-2 border-orange-500 text-neutral-950 shadow-[0_0_25px_rgba(249,115,22,0.35)] flex items-start gap-2.5 sm:gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="w-6 h-6 rounded-lg bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <AlertCircle className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold text-neutral-950 leading-relaxed">
                  {error}
                </p>
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
                  className="w-full h-11 sm:h-12 px-4 rounded-xl sm:rounded-2xl bg-orange-600 hover:bg-orange-500 active:scale-[0.99] text-white font-black text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
                  className="w-full h-11 sm:h-12 px-4 rounded-xl sm:rounded-2xl bg-white hover:bg-neutral-50 active:scale-[0.99] border-2 border-neutral-200 hover:border-neutral-300 transition-all flex items-center justify-center gap-3 cursor-pointer shadow-xs font-bold text-xs sm:text-sm text-neutral-800 disabled:opacity-50"
                >
                  {isGoogleSubmitting ? (
                    <span className="w-4 h-4 border-2 border-neutral-300 border-t-orange-500 rounded-full animate-spin" />
                  ) : (
                    <>
                      {/* Official Google Vector Logo */}
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                <p className="text-[10px] text-neutral-400 text-center mt-1.5 font-medium">
                  {language === 'kn'
                    ? '⚡ Banza winjire nta gusaba kwemeza email'
                    : '⚡ Instant access · No manual verification email needed'}
                </p>
              </div>

              {/* Sharp Divider */}
              <div className="flex items-center my-3">
                <div className="flex-1 border-t border-neutral-200" />
                <span className="px-3 text-[10px] sm:text-xs uppercase tracking-wider text-neutral-400 font-bold">
                  {language === 'kn' ? 'CYANGWA' : 'OR'}
                </span>
                <div className="flex-1 border-t border-neutral-200" />
              </div>

              {/* --------------------------------------------------------------- */}
              {/* PATHWAY B: TRADITIONAL EMAIL / PASSWORD INPUTS                  */}
              {/* --------------------------------------------------------------- */}
              <form onSubmit={handleSubmit} className="space-y-3" noValidate>
                {/* Username Input (Only on Sign-Up) */}
                {isSignUp && (
                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-neutral-800 mb-1">
                      {language === 'kn' ? 'Amazina yawe' : 'Your Username'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. Eric Mugisha"
                        className="w-full h-10 sm:h-11 pl-9 pr-3 text-xs sm:text-sm rounded-xl bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all shadow-2xs"
                      />
                    </div>
                  </div>
                )}

                {/* Email Field */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-neutral-800 mb-1">
                    {isSignUp
                      ? language === 'kn'
                        ? 'Aderesi ya Email'
                        : 'Email Address'
                      : language === 'kn'
                      ? 'Aderesi ya Email cyangwa Amazina'
                      : 'Email Address or Username'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
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
                      className="w-full h-10 sm:h-11 pl-9 pr-3 text-xs sm:text-sm rounded-xl bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all shadow-2xs"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-neutral-800 mb-1">
                    {language === 'kn' ? 'Ijambobanga (Password)' : 'Password'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-10 sm:h-11 pl-9 pr-10 text-xs sm:text-sm rounded-xl bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* 4. RESET PASSWORD UNDER PASSWORD FIELD */}
                  {!isSignUp && (
                    <div className="flex items-center justify-between pt-1.5 px-0.5">
                      <span className="text-[10px] text-neutral-400">
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
                        className="text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer transition-colors"
                      >
                        {language === 'kn'
                          ? 'Hindura ijambobanga (Reset Password)'
                          : 'Forgot / Reset password?'}
                      </button>
                    </div>
                  )}

                  {isSignUp && (
                    <p className="text-[10px] text-neutral-400 mt-1 font-medium">
                      {language === 'kn'
                        ? 'Byibuze inyuguti 6 · Link yo kwemeza izoherezwa kuri iyi email'
                        : 'At least 6 characters · Verification link sent to this email'}
                    </p>
                  )}
                </div>

                {/* Action Submit Button */}
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting || isGoogleSubmitting}
                    className="w-full h-11 sm:h-12 px-4 rounded-xl sm:rounded-2xl bg-neutral-950 hover:bg-neutral-900 active:scale-[0.99] text-white font-black text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
              <div className="pt-2 border-t border-neutral-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs font-semibold text-neutral-600 hover:text-orange-600 transition-colors cursor-pointer"
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
  );
};
