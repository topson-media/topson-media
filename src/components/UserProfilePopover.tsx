import React, { useState, useRef, useEffect } from 'react';
import {
  User as UserIcon,
  Mail,
  ShieldCheck,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  Camera,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Save,
  Check,
} from 'lucide-react';
import { User } from '../types';
import { TopFanBadge } from './TopFanBadge';
import {
  updateUserProfileInDb,
  updateUserPasswordInAuth,
} from '../services/firebase';

const TOPSON_PROFILE_IMAGE =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';

// Curated avatar presets
const AVATAR_PRESETS = [
  TOPSON_PROFILE_IMAGE,
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  'https://api.dicebear.com/7.x/bottts/svg?seed=TopsonTech',
];

interface UserProfilePopoverProps {
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onUpdateUser?: (updated: User) => void;
}

export const UserProfilePopover: React.FC<UserProfilePopoverProps> = ({
  currentUser,
  isOpen,
  onClose,
  onLogout,
  onUpdateUser,
}) => {
  const [username, setUsername] = useState(currentUser?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Password update state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync state whenever currentUser changes or popover opens
  useEffect(() => {
    if (isOpen && currentUser) {
      setUsername(currentUser.username || '');
      setAvatarUrl(currentUser.avatarUrl || '');
      setProfileSuccessMsg(null);
      setProfileErrorMsg(null);
      setPasswordSuccessMsg(null);
      setPasswordErrorMsg(null);
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [isOpen, currentUser]);

  // Click outside to dismiss
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !currentUser) return null;

  const currentUid = currentUser.uid || currentUser.id;

  // Handle local file selection for avatar photo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      setProfileErrorMsg('Please select an image smaller than 4MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setAvatarUrl(dataUrl);
        setProfileSuccessMsg('Photo selected. Click "Save Profile" to apply.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle saving profile changes (Username & Avatar)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = username.trim();
    if (!cleanName) {
      setProfileErrorMsg('Username cannot be empty.');
      return;
    }

    setIsSavingProfile(true);
    setProfileErrorMsg(null);
    setProfileSuccessMsg(null);

    try {
      const res = await updateUserProfileInDb(currentUid, {
        username: cleanName,
        avatarUrl: avatarUrl.trim(),
      });

      if (!res.success && res.error) {
        setProfileErrorMsg(res.error);
        setIsSavingProfile(false);
        return;
      }

      const updatedUser: User = {
        ...currentUser,
        username: cleanName,
        avatarUrl: avatarUrl.trim(),
      };

      try {
        localStorage.setItem('topson_user', JSON.stringify(updatedUser));
      } catch {
        // ignore
      }

      if (onUpdateUser) {
        onUpdateUser(updatedUser);
      }

      setProfileSuccessMsg('Profile details updated successfully!');
      setTimeout(() => setProfileSuccessMsg(null), 3500);
    } catch (err: any) {
      setProfileErrorMsg(err?.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle updating password in Firebase Auth
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrorMsg(null);
    setPasswordSuccessMsg(null);

    if (newPassword.length < 6) {
      setPasswordErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('Passwords do not match.');
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await updateUserPasswordInAuth(newPassword);
      if (res.success) {
        setPasswordSuccessMsg('Password changed securely!');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordSection(false);
        setTimeout(() => setPasswordSuccessMsg(null), 4000);
      } else {
        setPasswordErrorMsg(res.message || 'Could not update password.');
      }
    } catch (err: any) {
      setPasswordErrorMsg(err?.message || 'Password update failed.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const defaultAvatar =
    currentUser.role === 'admin'
      ? TOPSON_PROFILE_IMAGE
      : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
          currentUser.username || 'User'
        )}`;

  const displayAvatar = avatarUrl || currentUser.avatarUrl || defaultAvatar;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-profile-title"
      className="fixed inset-0 z-50 flex items-start justify-end sm:justify-end p-3 sm:p-5 pt-16 sm:pt-20 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        ref={popoverRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm sm:max-w-md bg-white border border-slate-200 shadow-2xl rounded-3xl p-5 sm:p-6 text-slate-900 max-h-[88vh] overflow-y-auto custom-scrollbar flex flex-col justify-between space-y-5 animate-in zoom-in-95 duration-150"
      >
        {/* Top Header: User Greeting & Close Button */}
        <div>
          <div className="flex items-start justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center shadow-xs">
                <UserIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 id="user-profile-title" className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  <span>Account Settings</span>
                  {(currentUser.isTopFan || currentUser.fanBadge) && (
                    <TopFanBadge size="xs" />
                  )}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Manage profile photo, username &amp; security
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Feedback Toast Alerts */}
          {profileSuccessMsg && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{profileSuccessMsg}</span>
            </div>
          )}

          {profileErrorMsg && (
            <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{profileErrorMsg}</span>
            </div>
          )}

          {/* Profile Photo Editor & Presets */}
          <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-4">
              <div className="relative group shrink-0">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-orange-500 p-0.5 bg-white shadow-sm">
                  <img
                    src={displayAvatar}
                    alt={currentUser.username}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover rounded-xl"
                    onError={(e) => {
                      e.currentTarget.src = defaultAvatar;
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-orange-600 text-white flex items-center justify-center shadow-md hover:bg-orange-700 transition-transform active:scale-95 cursor-pointer"
                  title="Upload image from device"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                  <span>{currentUser.username}</span>
                  {(currentUser.isTopFan || currentUser.fanBadge) && (
                    <TopFanBadge size="xs" />
                  )}
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  {currentUser.email || 'Topson Media Account'}
                </div>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  {currentUser.role === 'admin' ? (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-300">
                      Channel Admin
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      Community Member
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsEditingPhoto(!isEditingPhoto)}
                    className="text-[11px] font-bold text-orange-600 hover:text-orange-700 underline cursor-pointer"
                  >
                    {isEditingPhoto ? 'Hide Presets' : 'Choose Preset'}
                  </button>
                </div>
              </div>
            </div>

            {/* Avatar Preset Options */}
            {isEditingPhoto && (
              <div className="pt-2 border-t border-slate-200 animate-in fade-in slide-in-from-top-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Select Avatar Icon Preset
                </p>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {AVATAR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setAvatarUrl(preset);
                        setProfileSuccessMsg('Preset selected! Click "Save Profile" to apply.');
                      }}
                      className={`w-9 h-9 rounded-xl overflow-hidden border-2 shrink-0 p-0.5 transition-all cursor-pointer ${
                        avatarUrl === preset
                          ? 'border-orange-500 shadow-xs scale-105'
                          : 'border-slate-200 hover:border-orange-300'
                      }`}
                    >
                      <img src={preset} alt={`Preset ${idx}`} className="w-full h-full object-cover rounded-lg" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-9 h-9 rounded-xl border-2 border-dashed border-slate-300 hover:border-orange-500 text-slate-500 hover:text-orange-600 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                    title="Choose file from Phone/PC"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile Name Edit Form */}
          <form onSubmit={handleSaveProfile} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Username / Display Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Etienne Topson"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingProfile || (username === currentUser.username && avatarUrl === (currentUser.avatarUrl || ''))}
              className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSavingProfile ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Updates...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </form>

          {/* Account Details Record Chips */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2 text-xs">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Account Details Record
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 font-medium">Verified Email</div>
                  <div className="font-bold text-slate-800 truncate" title={currentUser.email}>
                    {currentUser.email || 'None'}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 font-medium">Member Since</div>
                  <div className="font-bold text-slate-800 truncate">
                    {currentUser.joinedDate || 'Recent'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Password Security Section */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Lock className="w-3.5 h-3.5 text-orange-500" />
                <span>Password &amp; Security</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordSection(!showPasswordSection);
                  setPasswordErrorMsg(null);
                  setPasswordSuccessMsg(null);
                }}
                className="text-[11px] font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
              >
                {showPasswordSection ? 'Cancel' : 'Change Password'}
              </button>
            </div>

            {passwordSuccessMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{passwordSuccessMsg}</span>
              </div>
            )}

            {passwordErrorMsg && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span>{passwordErrorMsg}</span>
              </div>
            )}

            {showPasswordSection && (
              <form onSubmit={handleSavePassword} className="space-y-2.5 pt-1 animate-in fade-in slide-in-from-top-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    New Secure Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full px-3 py-1.5 pr-8 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-orange-500 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full px-3 py-1.5 pr-8 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-orange-500 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingPassword || !newPassword || !confirmPassword}
                  className="w-full py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSavingPassword ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3" />
                      <span>Update Password Now</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* LOGOUT TRIGGER BUTTON (Base Grid Layer) */}
        <div className="pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="w-full py-2.5 px-4 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <LogOut className="w-4 h-4 text-red-600" />
            <span>Sign Out / Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};
