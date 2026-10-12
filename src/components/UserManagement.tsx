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
} from 'lucide-react';
import { User } from '../types';
import { fetchUsersListFromDb, deleteUserFromDb, awardFanBadgeInDb } from '../services/firebase';

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
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'top_fans' | 'pending' | 'loyal'>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'delete' | 'info' } | null>(null);
  
  // Track accounts that have been deactivated / suspended locally in localStorage
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
    }, 4500);
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const list = await fetchUsersListFromDb();
      setUsersList(list);
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

  // Toggle user account status (Active <-> Suspended)
  const handleToggleAccountStatus = (userId: string, username: string) => {
    const isSuspended = suspendedUserIds.includes(userId);
    let nextSuspended: string[];
    if (isSuspended) {
      nextSuspended = suspendedUserIds.filter((id) => id !== userId);
      showToast(`Account for "${username}" was re-activated successfully.`, 'success');
    } else {
      nextSuspended = [...suspendedUserIds, userId];
      showToast(`Account for "${username}" was suspended. User can no longer post or chat.`, 'info');
    }
    setSuspendedUserIds(nextSuspended);
    localStorage.setItem('topson_suspended_users', JSON.stringify(nextSuspended));
  };

  // Permanently delete user
  const handleDeleteUser = async (userId: string, username: string) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete user "${username}"? All associated account data will be removed.`
      )
    ) {
      return;
    }

    try {
      await deleteUserFromDb(userId);
      setUsersList((prev) => prev.filter((u) => u.id !== userId));
      if (onUserCountChange) {
        onUserCountChange(Math.max(0, usersList.length - 1));
      }
      showToast(`User account "${username}" was permanently deleted.`, 'delete');
    } catch (err) {
      console.error('Failed to delete user:', err);
      showToast(`Could not delete user "${username}". Please try again.`, 'delete');
    }
  };

  // Manually assign Top Fan badge
  const handleAwardFanBadge = async (userId: string, username: string) => {
    try {
      await awardFanBadgeInDb(userId);
      setUsersList((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, fanBadgeOffered: true, fanBadge: false } : u
        )
      );
      showToast(
        `Official Top Fan Badge awarded to "${username}"! A prompt banner is now sent to them to accept it.`,
        'success'
      );
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
        return !!u.fanBadge;
      }
      if (selectedFilter === 'pending') {
        return !!u.fanBadgeOffered && !u.fanBadge;
      }
      if (selectedFilter === 'loyal') {
        return (u.visitsCount || 1) >= 3;
      }

      return true;
    });
  }, [usersList, searchQuery, selectedFilter]);

  const totalUsers = usersList.length;
  const topFansCount = usersList.filter((u) => u.fanBadge).length;
  const pendingBadgesCount = usersList.filter((u) => u.fanBadgeOffered && !u.fanBadge).length;
  const loyalUsersCount = usersList.filter((u) => (u.visitsCount || 1) >= 3).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-bold shadow-lg animate-in slide-in-from-top-2 duration-200 ${
            toast.type === 'delete'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : toast.type === 'info'
              ? 'bg-neutral-900 text-white border border-neutral-700'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border border-amber-400'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base">
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

      {/* Header & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
              User Management &amp; Fan Badges
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-orange-100 text-orange-700 border border-orange-200">
              Admin Exclusive
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1">
            List registered accounts, track viewer visit loyalty, toggle account active/suspended status, and manually assign official Top Fan badges.
          </p>
        </div>

        {/* Reload button */}
        <button
          type="button"
          onClick={loadUsers}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 shadow-2xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />
          <span>Refresh Users</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setSelectedFilter('all')}
          className={`p-4 rounded-2xl bg-white border transition-all cursor-pointer ${
            selectedFilter === 'all'
              ? 'border-neutral-900 ring-2 ring-neutral-900/10 shadow-sm'
              : 'border-neutral-200 hover:border-neutral-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
              Total Users
            </span>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>
          <span className="text-2xl font-black text-neutral-900 mt-1 block">{totalUsers}</span>
          <span className="text-[10px] text-neutral-400 font-medium">All registered accounts</span>
        </div>

        <div
          onClick={() => setSelectedFilter('top_fans')}
          className={`p-4 rounded-2xl bg-white border transition-all cursor-pointer ${
            selectedFilter === 'top_fans'
              ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
              : 'border-neutral-200 hover:border-neutral-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
              Active Top Fans
            </span>
            <span className="text-amber-500">⭐</span>
          </div>
          <span className="text-2xl font-black text-amber-600 mt-1 block">{topFansCount}</span>
          <span className="text-[10px] text-amber-600/80 font-medium">Badge displayed on profile</span>
        </div>

        <div
          onClick={() => setSelectedFilter('pending')}
          className={`p-4 rounded-2xl bg-white border transition-all cursor-pointer ${
            selectedFilter === 'pending'
              ? 'border-orange-500 ring-2 ring-orange-500/20 shadow-sm'
              : 'border-neutral-200 hover:border-neutral-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">
              Pending Badges
            </span>
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <span className="text-2xl font-black text-orange-600 mt-1 block">{pendingBadgesCount}</span>
          <span className="text-[10px] text-orange-600/80 font-medium">Offered, awaiting accept</span>
        </div>

        <div
          onClick={() => setSelectedFilter('loyal')}
          className={`p-4 rounded-2xl bg-white border transition-all cursor-pointer ${
            selectedFilter === 'loyal'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
              : 'border-neutral-200 hover:border-neutral-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              Loyal (3+ Visits)
            </span>
            <span className="text-emerald-500">🔥</span>
          </div>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">{loyalUsersCount}</span>
          <span className="text-[10px] text-emerald-600/80 font-medium">High site engagement</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-neutral-200 shadow-xs">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by name, email, or ID..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:bg-white transition-all font-medium"
          />
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedFilter === 'all'
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            All ({totalUsers})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('top_fans')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedFilter === 'top_fans'
                ? 'bg-amber-500 text-white'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            Top Fans ({topFansCount})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedFilter === 'pending'
                ? 'bg-orange-500 text-white'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            Pending ({pendingBadgesCount})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('loyal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedFilter === 'loyal'
                ? 'bg-emerald-600 text-white'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            Loyal ({loyalUsersCount})
          </button>
        </div>
      </div>

      {/* Users List Container */}
      <div className="rounded-3xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-orange-500" />
            <span className="text-xs sm:text-sm font-bold text-neutral-900">
              User Accounts Directory ({filteredUsers.length})
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 font-medium">
            Toggle account status &bull; Assign Top Fan &bull; Delete user
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-neutral-500 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-orange-500" />
            <span>Loading user accounts from database...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-500">
            {searchQuery
              ? `No users match "${searchQuery}". Try a different keyword.`
              : 'No registered user accounts found for this filter.'}
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filteredUsers.map((u) => {
              const visits = u.visitsCount || 1;
              const isLoyal = visits >= 3;
              const isThisAdmin = u.role === 'admin' || u.id === 'admin-topson' || u.id === currentUser?.id;
              const isSuspended = suspendedUserIds.includes(u.id);

              return (
                <div
                  key={u.id}
                  className={`p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                    isSuspended ? 'bg-neutral-100/70 opacity-80' : 'hover:bg-neutral-50/70'
                  }`}
                >
                  {/* Left: User Identity Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-neutral-900 text-white font-bold text-sm flex items-center justify-center shrink-0 border border-neutral-300 shadow-2xs relative">
                      {u.avatarUrl ? (
                        <img
                          src={u.avatarUrl}
                          alt={u.username}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <span>{u.username.slice(0, 1).toUpperCase()}</span>
                      )}
                      {u.fanBadge && (
                        <span
                          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-neutral-900 flex items-center justify-center text-[10px] shadow-2xs"
                          title="Top Fan"
                        >
                          ⭐
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-neutral-900 truncate">
                          {u.username}
                        </span>

                        {/* Role Badge */}
                        {isThisAdmin ? (
                          <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-black uppercase tracking-wide">
                            Admin
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-semibold">
                            Member
                          </span>
                        )}

                        {/* Top Fan Active Badge */}
                        {u.fanBadge && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-white text-[10px] font-black uppercase shadow-2xs">
                            <span>⭐</span> Top Fan
                          </span>
                        )}

                        {/* Top Fan Pending Acceptance */}
                        {u.fanBadgeOffered && !u.fanBadge && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300 text-[10px] font-bold">
                            <span>⏳</span> Offered
                          </span>
                        )}

                        {/* Account Status Badge */}
                        {isSuspended ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                            Suspended
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-neutral-500 truncate flex items-center gap-2 mt-1">
                        <span className="truncate">{u.email || 'No email registered'}</span>
                        <span>&bull;</span>
                        <span className="text-[11px] text-neutral-400">{u.joinedDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Engagement Stats & Admin Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5 sm:gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-neutral-100">
                    {/* Visits Badge */}
                    <span
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                        isLoyal
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : 'bg-neutral-100 text-neutral-700'
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
                        {/* Assign Top Fan Badge Button */}
                        {!u.fanBadge && !u.fanBadgeOffered ? (
                          <button
                            type="button"
                            onClick={() => handleAwardFanBadge(u.id, u.username)}
                            className="h-8 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                            title={
                              isLoyal
                                ? 'Frequent visitor! Award official Top Fan badge'
                                : 'Manually assign Top Fan badge'
                            }
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>Award Top Fan</span>
                          </button>
                        ) : u.fanBadgeOffered && !u.fanBadge ? (
                          <span className="h-8 px-2.5 rounded-xl bg-neutral-100 text-neutral-500 text-xs font-medium flex items-center gap-1">
                            <span>Pending Accept</span>
                          </span>
                        ) : (
                          <span className="h-8 px-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold flex items-center gap-1">
                            <span>⭐ Top Fan</span>
                          </span>
                        )}

                        {/* Toggle Account Status (Active / Suspended) */}
                        <button
                          type="button"
                          onClick={() => handleToggleAccountStatus(u.id, u.username)}
                          className={`h-8 px-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSuspended
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-neutral-200'
                          }`}
                          title={isSuspended ? 'Activate account' : 'Suspend account'}
                        >
                          {isSuspended ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Activate</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-3.5 h-3.5 text-neutral-500" />
                              <span>Suspend</span>
                            </>
                          )}
                        </button>

                        {/* Delete User Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          className="h-8 px-2.5 rounded-xl text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 hover:border-red-600 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                          title="Permanently delete user account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-400 italic font-medium px-2">
                        Admin Account
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
