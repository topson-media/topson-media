import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Trash2,
  Award,
  ShieldCheck,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  UserCheck,
  UserX,
  Filter,
  ExternalLink,
  ChevronRight,
  Mail,
  Send
} from 'lucide-react';
import { User } from '../types';
import { TOPSON_PROFILE_IMAGE } from '../data/mockData';
import { TopFanBadge } from './TopFanBadge';
import { UserDetailsModal } from './UserDetailsModal';
import {
  fetchUsersListFromDb,
  deleteUserFromDb,
  awardFanBadgeInDb,
  setUserSuspendedInDb
} from '../services/firebase';
import {
  sendAccountStatusAlert,
  sendTopFanBadgeEmail
} from '../services/emailService';

interface UserManagementProps {
  currentUser?: User | null;
  onUserCountChange?: (count: number) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  currentUser,
  onUserCountChange,
}) => {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'top_fans' | 'pending' | 'loyal' | 'suspended'>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'delete' | 'info' } | null>(null);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<User | null>(null);

  // Track accounts that have been deactivated / suspended locally in localStorage & Firestore
  const [suspendedUserIds, setSuspendedUserIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('topson_suspended_users');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const showToast = (message: string, type: 'success' | 'delete' | 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const list = await fetchUsersListFromDb();
      setUsersList(list);
      const firestoreSuspended = list.filter((u) => u.suspended).map((u) => u.id);
      if (firestoreSuspended.length > 0) {
        setSuspendedUserIds((prev) => Array.from(new Set([...prev, ...firestoreSuspended])));
      }
      if (onUserCountChange) {
        onUserCountChange(list.length);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // 1. Toggle user account status (Active <-> Suspended) + AUTO BACKGROUND EMAIL ALERT
  const handleToggleAccountStatus = async (userId: string, username: string) => {
    const targetUser = usersList.find((u) => u.id === userId);
    const isSuspended = suspendedUserIds.includes(userId);
    let nextSuspended: string[];

    if (isSuspended) {
      nextSuspended = suspendedUserIds.filter((id) => id !== userId);
      await setUserSuspendedInDb(userId, false);
      showToast(`Account for "${username}" was re-activated successfully.`, 'success');
    } else {
      nextSuspended = [...suspendedUserIds, userId];
      await setUserSuspendedInDb(userId, true);

      // Instantly send automated background email to user's Gmail address
      if (targetUser?.email && targetUser.email.includes('@')) {
        sendAccountStatusAlert({
          to: targetUser.email,
          username: targetUser.username || username,
          action: 'suspended',
          customReason: 'Your account was suspended by Topson Media. You must call help center TM (+250 794 903 078).',
        }).catch((err) => console.warn('Background suspension email error:', err));

        showToast(
          `Account for "${username}" was suspended. Automated alert email dispatched to ${targetUser.email}.`,
          'info'
        );
      } else {
        showToast(`Account for "${username}" was suspended. User can no longer post or chat.`, 'info');
      }
    }

    setSuspendedUserIds(nextSuspended);
    localStorage.setItem('topson_suspended_users', JSON.stringify(nextSuspended));
  };

  // 2. Permanently delete user + AUTO BACKGROUND EMAIL ALERT
  const handleDeleteUser = async (userId: string, username: string) => {
    const targetUser = usersList.find((u) => u.id === userId);
    if (
      !window.confirm(
        `Are you sure you want to permanently delete user "${username}"? All associated account data will be removed.`
      )
    ) {
      return;
    }

    try {
      // Send background email alert before deleting
      if (targetUser?.email && targetUser.email.includes('@')) {
        sendAccountStatusAlert({
          to: targetUser.email,
          username: targetUser.username || username,
          action: 'deleted',
          customReason: 'Your account was deleted by Topson Media. If you have questions, please reach out to Topson Media administration.',
        }).catch((err) => console.warn('Background deletion email error:', err));
      }

      await deleteUserFromDb(userId);
      setUsersList((prev) => prev.filter((u) => u.id !== userId));
      if (onUserCountChange) {
        onUserCountChange(Math.max(0, usersList.length - 1));
      }
      showToast(
        `User account "${username}" was deleted. Automated status update email sent to their Gmail.`,
        'delete'
      );
    } catch (err) {
      console.error('Failed to delete user:', err);
      showToast(`Could not delete user "${username}". Please try again.`, 'delete');
    }
  };

  // 3. INSTANT TOP FAN BADGE ASSIGNMENT & EMAIL WIDGET
  const handleAwardFanBadge = async (userId: string, username: string) => {
    const targetUser = usersList.find((u) => u.id === userId);
    try {
      // Instantly toggle isTopFan: true and fanBadge: true in Firestore
      await awardFanBadgeInDb(userId, true);

      // Instantly update local state so badge renders immediately
      setUsersList((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, isTopFan: true, fanBadge: true, hasFanBadge: true, fanBadgeOffered: false }
            : u
        )
      );

      // Trigger automated HTML email message to their Gmail inbox
      const recipientEmail = targetUser?.email;
      if (recipientEmail && recipientEmail.includes('@')) {
        await sendTopFanBadgeEmail({
          to: recipientEmail,
          username: targetUser?.username || username,
        });
        showToast(
          `Official TOP FAN badge active for "${username}"! Branded celebration email dispatched to ${recipientEmail}.`,
          'success'
        );
      } else {
        showToast(
          `Official TOP FAN badge graphics component is now active for "${username}" across the whole website!`,
          'success'
        );
      }
    } catch (err) {
      console.error('Failed to award fan badge:', err);
      showToast(`Could not award fan badge to "${username}".`, 'delete');
    }
  };

  // Filtered users calculation
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      // 1. Search Query filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.username.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.id && u.id.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // 2. Tab Filter
      if (selectedFilter === 'top_fans') {
        return !!u.isTopFan || !!u.fanBadge;
      }
      if (selectedFilter === 'pending') {
        return !!u.fanBadgeOffered && !u.fanBadge && !u.isTopFan;
      }
      if (selectedFilter === 'loyal') {
        return (u.visitsCount || 1) >= 3;
      }
      if (selectedFilter === 'suspended') {
        return suspendedUserIds.includes(u.id);
      }

      return true;
    });
  }, [usersList, searchQuery, selectedFilter, suspendedUserIds]);

  const totalUsers = usersList.length;
  const topFansCount = usersList.filter((u) => u.isTopFan || u.fanBadge).length;
  const pendingBadgesCount = usersList.filter((u) => u.fanBadgeOffered && !u.fanBadge).length;
  const loyalUsersCount = usersList.filter((u) => (u.visitsCount || 1) >= 3).length;
  const suspendedCount = usersList.filter((u) => suspendedUserIds.includes(u.id)).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Alert Notification */}
      {toast && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-bold shadow-xl animate-in slide-in-from-top-2 duration-200 border ${
            toast.type === 'delete'
              ? 'bg-red-950/90 text-red-200 border-red-500/50'
              : toast.type === 'info'
              ? 'bg-slate-900/90 text-slate-200 border-slate-700'
              : 'bg-gradient-to-r from-amber-950/90 via-orange-950/90 to-slate-950/90 text-amber-200 border-orange-500/60 shadow-[0_0_25px_rgba(249,115,22,0.3)]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-lg">
              {toast.type === 'delete' ? '🗑️' : toast.type === 'info' ? 'ℹ️' : '⭐'}
            </span>
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 hover:opacity-75 cursor-pointer text-current"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header & Controls in Glassmorphic Container */}
      <div className="rounded-3xl p-6 sm:p-7 bg-slate-950/40 backdrop-blur-xl border border-slate-800 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/40 flex items-center justify-center shadow-[0_0_12px_rgba(249,115,22,0.3)]">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              User Accounts Directory &amp; Fan Badges
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/40">
              Admin Exclusive
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-2xl font-normal leading-relaxed">
            Manage registered community members, inspect full user details &amp; activity history, instantly award glowing Top Fan badges, and dispatch automated background Gmail alerts.
          </p>
        </div>

        {/* Reload button */}
        <button
          type="button"
          onClick={loadUsers}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900/90 hover:bg-slate-850 text-slate-200 border border-slate-700/80 shadow-md transition-all cursor-pointer self-start sm:self-auto hover:border-orange-500/50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-orange-400' : ''}`} />
          <span>Sync Database</span>
        </button>
      </div>

      {/* Glassmorphic KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div
          onClick={() => setSelectedFilter('all')}
          className={`p-4 rounded-2xl bg-slate-950/40 backdrop-blur-xl border transition-all cursor-pointer ${
            selectedFilter === 'all'
              ? 'border-orange-500/80 shadow-[0_0_20px_rgba(249,115,22,0.25)] ring-1 ring-orange-500/40'
              : 'border-slate-800 hover:border-slate-700 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Users
            </span>
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <span className="text-2xl font-black text-white mt-1 block">{totalUsers}</span>
          <span className="text-[10px] text-slate-500 font-medium">All accounts</span>
        </div>

        <div
          onClick={() => setSelectedFilter('top_fans')}
          className={`p-4 rounded-2xl bg-slate-950/40 backdrop-blur-xl border transition-all cursor-pointer ${
            selectedFilter === 'top_fans'
              ? 'border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] ring-1 ring-amber-400/40'
              : 'border-slate-800 hover:border-amber-500/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
              Active Top Fans
            </span>
            <span className="text-amber-400">⭐</span>
          </div>
          <span className="text-2xl font-black text-amber-400 mt-1 block">{topFansCount}</span>
          <span className="text-[10px] text-amber-400/70 font-medium">Live badge assigned</span>
        </div>

        <div
          onClick={() => setSelectedFilter('pending')}
          className={`p-4 rounded-2xl bg-slate-950/40 backdrop-blur-xl border transition-all cursor-pointer ${
            selectedFilter === 'pending'
              ? 'border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)] ring-1 ring-orange-500/40'
              : 'border-slate-800 hover:border-orange-500/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">
              Pending
            </span>
            <Clock className="w-4 h-4 text-orange-400" />
          </div>
          <span className="text-2xl font-black text-orange-400 mt-1 block">{pendingBadgesCount}</span>
          <span className="text-[10px] text-orange-400/70 font-medium">Awaiting acceptance</span>
        </div>

        <div
          onClick={() => setSelectedFilter('loyal')}
          className={`p-4 rounded-2xl bg-slate-950/40 backdrop-blur-xl border transition-all cursor-pointer ${
            selectedFilter === 'loyal'
              ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500/40'
              : 'border-slate-800 hover:border-emerald-500/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              Loyal (3+ Visits)
            </span>
            <span className="text-emerald-400">🔥</span>
          </div>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">{loyalUsersCount}</span>
          <span className="text-[10px] text-emerald-400/70 font-medium">Active retention</span>
        </div>

        <div
          onClick={() => setSelectedFilter('suspended')}
          className={`p-4 rounded-2xl bg-slate-950/40 backdrop-blur-xl border transition-all cursor-pointer ${
            selectedFilter === 'suspended'
              ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] ring-1 ring-red-500/40'
              : 'border-slate-800 hover:border-red-500/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
              Suspended
            </span>
            <span className="text-red-400">🛑</span>
          </div>
          <span className="text-2xl font-black text-red-400 mt-1 block">{suspendedCount}</span>
          <span className="text-[10px] text-red-400/70 font-medium">Restricted access</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-slate-950/40 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by name, email, or User ID..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all font-medium"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'top_fans', 'pending', 'loyal', 'suspended'] as const).map((filterKey) => (
            <button
              key={filterKey}
              type="button"
              onClick={() => setSelectedFilter(filterKey)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer capitalize ${
                selectedFilter === filterKey
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_0_12px_rgba(249,115,22,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {filterKey === 'all'
                ? `All (${totalUsers})`
                : filterKey === 'top_fans'
                ? `Top Fans (${topFansCount})`
                : filterKey === 'pending'
                ? `Pending (${pendingBadgesCount})`
                : filterKey === 'loyal'
                ? `Loyal (${loyalUsersCount})`
                : `Suspended (${suspendedCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Users List Container (Glassmorphic Table) */}
      <div className="rounded-3xl bg-slate-950/40 backdrop-blur-xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-orange-400" />
            <span className="text-xs sm:text-sm font-bold text-white">
              User Accounts Directory ({filteredUsers.length})
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            Click user name for full details modal &bull; Assign Top Fan &bull; Send automated Gmail alerts
          </span>
        </div>

        {isLoading ? (
          <div className="p-14 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2.5">
            <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
            <span>Loading user accounts securely from Firestore...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-14 text-center text-xs text-slate-400">
            {searchQuery
              ? `No users match "${searchQuery}". Try a different search query.`
              : 'No registered user accounts found for this filter.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredUsers.map((u) => {
              const visits = u.visitsCount || 1;
              const isLoyal = visits >= 3;
              const isThisAdmin = u.role === 'admin' || u.id === 'admin-topson' || u.id === currentUser?.id;
              const isSuspended = suspendedUserIds.includes(u.id);
              const isTopFan = !!u.isTopFan || !!u.fanBadge;

              return (
                <div
                  key={u.id}
                  className={`p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                    isSuspended ? 'bg-red-950/10 opacity-75' : 'hover:bg-slate-900/50'
                  }`}
                >
                  {/* Left: User Identity Info with Clickable Name */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center shrink-0 border border-slate-700 shadow-2xs relative overflow-hidden">
                      <img
                        src={u.avatarUrl || (isThisAdmin ? TOPSON_PROFILE_IMAGE : `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80`)}
                        alt={u.username}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover rounded-full"
                        onError={(e) => {
                          e.currentTarget.src = TOPSON_PROFILE_IMAGE;
                        }}
                      />
                      {isTopFan && (
                        <span
                          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] font-black shadow-2xs"
                          title="Top Fan"
                        >
                          ⭐
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* 4. FULLY INTERACTIVE USER NAME (Click launches User Details Modal) */}
                        <button
                          type="button"
                          onClick={() => setSelectedUserForDetails(u)}
                          className="text-sm font-bold text-white hover:text-orange-400 transition-colors flex items-center gap-1 cursor-pointer group text-left truncate"
                          title={`Click to view complete Firestore profile & activity breakdown for ${u.username}`}
                        >
                          <span className="group-hover:underline underline-offset-2">{u.username}</span>
                          <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-orange-400 opacity-60 group-hover:opacity-100 shrink-0" />
                        </button>

                        {/* Role Badge */}
                        {isThisAdmin ? (
                          <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-wide border border-orange-500/40">
                            Admin
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-semibold border border-slate-700">
                            Member
                          </span>
                        )}

                        {/* 3. PREMIUM TOP FAN BADGE COMPONENT */}
                        {isTopFan && (
                          <TopFanBadge size="xs" />
                        )}

                        {/* Top Fan Pending Acceptance */}
                        {u.fanBadgeOffered && !isTopFan && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                            <span>⏳</span> Offered
                          </span>
                        )}

                        {/* Account Status Badge */}
                        {isSuspended ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/40">
                            Suspended
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/40">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 truncate flex items-center gap-2 mt-1">
                        <span className="truncate">{u.email || 'No email registered'}</span>
                        <span>&bull;</span>
                        <span className="text-[11px] text-slate-500">{u.joinedDate || 'Recently joined'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Engagement Stats & Admin Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5 sm:gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/80">
                    {/* Visits Badge */}
                    <span
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                        isLoyal
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                          : 'bg-slate-900 text-slate-300 border border-slate-800'
                      }`}
                      title={`${visits} site visits recorded`}
                    >
                      <span>{isLoyal ? '🔥' : '👁️'}</span>
                      <span>
                        {visits} {visits === 1 ? 'visit' : 'visits'}
                      </span>
                    </span>

                    {/* Admin Actions (Disabled for admin self-account) */}
                    {!isThisAdmin ? (
                      <div className="flex items-center gap-2">
                        {/* 3. ASSIGN TOP FAN BADGE BUTTON & AUTOMATED GMAIL DISPATCH */}
                        {!isTopFan ? (
                          <button
                            type="button"
                            onClick={() => handleAwardFanBadge(u.id, u.username)}
                            className="h-8 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(245,158,11,0.35)] flex items-center gap-1.5 cursor-pointer active:scale-95"
                            title="Award official Top Fan badge and dispatch branded celebration email"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>Award Top Fan</span>
                          </button>
                        ) : (
                          <span className="h-8 px-2.5 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1 shadow-2xs">
                            <span>⭐ Top Fan Active</span>
                          </span>
                        )}

                        {/* 2. TOGGLE ACCOUNT STATUS (Active / Suspended) + BACKGROUND EMAIL */}
                        <button
                          type="button"
                          onClick={() => handleToggleAccountStatus(u.id, u.username)}
                          className={`h-8 px-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSuspended
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                              : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                          }`}
                          title={isSuspended ? 'Reactivate user account' : 'Suspend user account and send email alert'}
                        >
                          {isSuspended ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Activate</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-3.5 h-3.5 text-slate-400" />
                              <span>Suspend</span>
                            </>
                          )}
                        </button>

                        {/* 2. DELETE USER BUTTON + BACKGROUND EMAIL */}
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          className="h-8 px-2.5 rounded-xl text-red-400 hover:text-white bg-red-500/10 hover:bg-red-600 border border-red-500/30 hover:border-red-600 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                          title="Permanently delete user account and dispatch status update email"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 italic font-medium px-2">
                        Host Account
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. USER FULL DETAILS MODAL ACCORDION */}
      {selectedUserForDetails && (
        <UserDetailsModal
          user={selectedUserForDetails}
          isSuspended={suspendedUserIds.includes(selectedUserForDetails.id)}
          onClose={() => setSelectedUserForDetails(null)}
          onToggleStatus={(uid, uname) => handleToggleAccountStatus(uid, uname)}
          onAwardFanBadge={(uid, uname) => handleAwardFanBadge(uid, uname)}
          onDeleteUser={(uid, uname) => handleDeleteUser(uid, uname)}
        />
      )}
    </div>
  );
};
