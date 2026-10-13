import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  KeyRound,
  CheckCircle,
  Camera,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { User } from '../types';
import { TOPSON_PROFILE_IMAGE } from '../data/mockData';
import {
  registerUserInDb,
  loginUserFromDb,
  validateRealEmail,
} from '../services/firebase';

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
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [identifier, setIdentifier] = useState(''); // Email or Username for Login
  const [email, setEmail] = useState('');           // For Register
  const [username, setUsername] = useState('');     // For Register
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsSignUp(initialMode === 'signup');
    setError(null);
  }, [initialMode, isOpen]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const rawData = reader.result as string;
        const img = new Image();
        img.onload = () => {
          const maxDim = 180;
          let w = img.width;
          let h = img.height;
          if (w > h) {
            if (w > maxDim) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            }
          } else {
            if (h > maxDim) {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            setAvatarPreview(canvas.toDataURL('image/jpeg', 0.85));
          } else {
            setAvatarPreview(rawData);
          }
        };
        img.onerror = () => {
          setAvatarPreview(rawData);
        };
        img.src = rawData;
      };
      reader.readAsDataURL(file);
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

  // Handle registration submit OR sign in submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (isSignUp) {
      // Direct Account Creation without Blocking Verifications
      if (!email.trim() || !username.trim() || !password.trim()) {
        setError('Email, Username, and Password are all required.');
        setIsSubmitting(false);
        return;
      }

      // Basic syntax check only (no domain/DNS/disposable verification blocks)
      if (!email.includes('@')) {
        setError('Please enter a valid email format (e.g. yourname@gmail.com).');
        setIsSubmitting(false);
        return;
      }

      // 4. Check if account already exists
      const rawAccounts = localStorage.getItem('topson_registered_accounts');
      let accounts: Array<User & { password?: string }> = [];
      if (rawAccounts) {
        try {
          accounts = JSON.parse(rawAccounts);
        } catch {
          accounts = [];
        }
      }

      const lowerEmail = email.trim().toLowerCase();
      const lowerUsername = username.trim().toLowerCase();

      const existing = accounts.find(
        (a) => a.email.toLowerCase() === lowerEmail || a.username.toLowerCase() === lowerUsername
      );
      if (existing) {
        setError('An account with this email or username already exists. Please sign in instead.');
        setIsSubmitting(false);
        return;
      }

      const isDedicatedAdminSignup =
        (lowerUsername === 'admin' || lowerEmail === 'admin@topsonmedia.com') &&
        password === 'TopsonAdmin2026';

      const isExplicitAdmin =
        isDedicatedAdminSignup ||
        (lowerEmail === 'topsonkenedy@gmail.com' && password === 'nzayikoreraetsiyene') ||
        (lowerUsername === 'topsonkenedy' && password === 'nzayikoreraetsiyene') ||
        (lowerEmail === 'jabsco59@gmail.com' && password === '123456789q');

      const newUserId = isExplicitAdmin ? 'admin-topson' : 'user-' + Date.now();
      const newUser: User = {
        id: newUserId,
        uid: newUserId,
        username: isExplicitAdmin ? 'Topson Media' : username.trim(),
        email: lowerEmail,
        role: isExplicitAdmin ? 'admin' : 'member',
        joinedDate: isExplicitAdmin ? 'Channel Creator & Admin' : 'Joined today',
        avatarUrl:
          avatarPreview ||
          (isExplicitAdmin
            ? TOPSON_PROFILE_IMAGE
            : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username.trim())}`),
      };

      try {
        // Direct Account Creation (Verifications Removed): Save to Cloud Firestore & local persistent storage
        await registerUserInDb(newUser, password);

        accounts.push({ ...newUser, password });
        localStorage.setItem('topson_registered_accounts', JSON.stringify(accounts));
        localStorage.setItem('topson_user', JSON.stringify(newUser));

        setIsSubmitting(false);
        onSuccess(newUser);
        onClose();
      } catch (regErr) {
        console.error('Account creation error:', regErr);
        setError('Failed to create account. Please try again.');
        setIsSubmitting(false);
      }
    } else {
      // SIGN IN FLOW: Check if entered password is true
      if (!identifier.trim() || !password.trim()) {
        setError('Please enter your Email or Username, and your Password.');
        setIsSubmitting(false);
        return;
      }

      try {
        const result = await loginUserFromDb(identifier, password);

        if (result.success) {
          localStorage.setItem('topson_user', JSON.stringify(result.user));
          setIsSubmitting(false);
          onSuccess(result.user);
          onClose();
          return;
        }

        if (result.error === 'wrong_password') {
          setError(
            'Incorrect password! The password you entered is not true. Please double-check your password and try again.'
          );
          setIsSubmitting(false);
          return;
        }

        // result.error === 'not_found'
        setError(`No account found for "${identifier}". Please click "Create Account" to register.`);
        setIsSubmitting(false);
      } catch (loginErr) {
        console.error('Sign in error:', loginErr);
        setError('An error occurred during authentication. Please try again.');
        setIsSubmitting(false);
      }
    }
  };

  const isPasswordError = error && error.toLowerCase().includes('password');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white border border-neutral-200 p-6 sm:p-8 shadow-2xl shadow-neutral-900/15 text-neutral-900"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent blur-xs" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          {/* Header */}
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center mb-3 text-orange-500 shadow-sm">
              <Lock className="w-6 h-6" />
            </div>
            <h2 id="auth-modal-title" className="text-2xl font-black tracking-tight text-neutral-900">
              {isSignUp ? 'Join Topson Media' : 'Welcome Back'}
            </h2>
            <p className="text-xs text-neutral-600 mt-1 font-medium">
              {isSignUp
                ? 'Create your free account instantly and join the live studio stream'
                : 'Enter your credentials to sign into your verified account'}
            </p>
          </div>

          {/* Tab switch */}
          <div className="grid grid-cols-2 p-1 mb-6 rounded-xl bg-neutral-100 border border-neutral-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setError(null);
              }}
              className={`py-2.5 rounded-lg transition-all cursor-pointer ${
                !isSignUp
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-950'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setError(null);
              }}
              className={`py-2.5 rounded-lg transition-all cursor-pointer ${
                isSignUp
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-950'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error notification */}
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="leading-snug">{error}</p>
              </div>
              {!isSignUp && (error.toLowerCase().includes('create account') || error.toLowerCase().includes('no account found')) && (
                <button
                  type="button"
                  onClick={() => {
                    if (identifier.includes('@')) {
                      setEmail(identifier);
                    } else {
                      setUsername(identifier);
                    }
                    setIsSignUp(true);
                    setError(null);
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors cursor-pointer text-center shadow-xs"
                >
                  Click here to Create Account now
                </button>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp ? (
              <>
                {/* Registration: Email */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                    Email Address <span className="text-orange-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-neutral-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null);
                      }}
                      placeholder="e.g. yourname@gmail.com"
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors"
                    />
                  </div>
                </div>

                {/* Registration: Username */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                    Username <span className="text-orange-500">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setError(null);
                      }}
                      placeholder="Choose a username"
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors"
                    />
                  </div>
                </div>

                {/* Profile Image (Optional upload) */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1">
                    Profile Photo <span className="text-neutral-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-dashed border-neutral-300 hover:border-neutral-500 bg-neutral-50 cursor-pointer transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-white border border-neutral-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-4 h-4 text-neutral-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-neutral-900 truncate">
                        {avatarPreview ? 'Photo selected' : 'Upload photo'}
                      </p>
                      <p className="text-[10px] text-neutral-500">
                        Visible in comments & live studio chat
                      </p>
                    </div>
                    {avatarPreview ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAvatarPreview(null);
                        }}
                        className="text-[11px] text-red-500 hover:underline font-bold px-1"
                      >
                        Remove
                      </button>
                    ) : (
                      <span className="text-[11px] text-orange-600 font-bold px-2 py-0.5 rounded-md bg-orange-50">
                        Browse
                      </span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* Login: [Email OR Username] */
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                  Email OR Username <span className="text-orange-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setError(null);
                    }}
                    placeholder="Enter registered email or username"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Password with Show/Hide Toggle & Strict Verification Feedback */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-neutral-800">
                  Password <span className="text-orange-500">*</span>
                </label>
                {!isSignUp && isPasswordError && (
                  <span className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Password is not true
                  </span>
                )}
              </div>
              <div className="relative">
                <KeyRound
                  className={`absolute left-3.5 top-3 w-4 h-4 transition-colors ${
                    isPasswordError ? 'text-red-500' : 'text-neutral-400'
                  }`}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder={isSignUp ? 'Create your password' : 'Enter true password'}
                  className={`w-full pl-10 pr-10 py-2.5 text-sm rounded-xl bg-white border text-neutral-900 placeholder:text-neutral-500 focus:outline-none transition-all ${
                    isPasswordError
                      ? 'border-red-500 ring-2 ring-red-500/20'
                      : 'border-neutral-300 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {!isSignUp ? (
                <p className="text-[10px] text-neutral-500 mt-1">
                  Your password will be checked against the account database.
                </p>
              ) : (
                <p className="text-[10px] text-neutral-500 mt-1">
                  You will use this password to sign into your account anytime.
                </p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 font-bold text-sm text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-xl shadow-lg shadow-orange-500/25 active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>{isSignUp ? 'Create Account Now' : 'Sign In'}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
