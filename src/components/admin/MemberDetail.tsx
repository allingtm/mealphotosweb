'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Shield, Ban, Clock, Trash2, Edit3, Save, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { showToast } from '@/components/ui/Toast';
import { ConfirmDialog } from './ConfirmDialog';
// v3: CUISINE_OPTIONS removed — cuisines stored as free-text array on business_profiles
const CUISINE_OPTIONS = ['italian', 'asian', 'mexican', 'british', 'indian', 'middle_eastern', 'american', 'french', 'other'] as const;
const CUISINE_LABELS: Record<string, string> = {
  italian: 'Italian', asian: 'Asian', mexican: 'Mexican', british: 'British',
  indian: 'Indian', middle_eastern: 'Middle Eastern', american: 'American', french: 'French', other: 'Other',
};

interface MemberData {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  location_city: string | null;
  location_country: string | null;
  is_admin: boolean;
  is_business: boolean;
  banned_at: string | null;
  suspended_until: string | null;
  ban_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface DishData {
  id: string;
  title: string;
  photo_url: string;
  reaction_count: number;
  save_count: number;
  created_at: string;
}

interface MemberDetailProps {
  member: MemberData;
  stats: { dish_count: number };
  currentAdminId: string;
}

export function MemberDetail({ member: initialMember, stats, currentAdminId }: MemberDetailProps) {
  const router = useRouter();
  const [member, setMember] = useState(initialMember);
  const isSelf = member.id === currentAdminId;

  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState(member.display_name ?? '');
  const [bio, setBio] = useState(member.bio ?? '');
  const [saving, setSaving] = useState(false);

  // Ban/suspend state
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendUntil, setSuspendUntil] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Meals state
  const [meals, setMeals] = useState<DishData[]>([]);
  const [mealsTotal, setMealsTotal] = useState(0);
  const [mealsPage, setMealsPage] = useState(1);
  const [mealsLoading, setMealsLoading] = useState(true);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editMealTitle, setEditMealTitle] = useState('');
  const [editMealCuisine, setEditMealCuisine] = useState<string | null>(null);
  const [editMealTags, setEditMealTags] = useState('');
  const [mealSaving, setMealSaving] = useState(false);
  const [deleteMealId, setDeleteMealId] = useState<string | null>(null);
  const mealsPerPage = 12;

  const fetchMeals = useCallback(async (pageNum: number) => {
    setMealsLoading(true);
    try {
      const res = await fetch(`/api/admin/members/${member.id}/meals?page=${pageNum}&per_page=${mealsPerPage}`);
      if (res.ok) {
        const data = await res.json();
        setMeals(data.meals);
        setMealsTotal(data.total);
      }
    } catch {
      // silent
    } finally {
      setMealsLoading(false);
    }
  }, [member.id]);

  useEffect(() => {
    fetchMeals(mealsPage);
  }, [mealsPage, fetchMeals]);

  const mealsTotalPages = Math.max(1, Math.ceil(mealsTotal / mealsPerPage));

  // Profile save
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName || null,
          bio: bio || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMember({ ...member, ...data.member });
        setEditingProfile(false);
        showToast('Profile updated', 'success');
      } else {
        const data = await res.json();
        showToast(data.error ?? 'Update failed', 'error');
      }
    } catch {
      showToast('Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Toggle admin
  const handleToggleAdmin = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_admin: !member.is_admin }),
      });
      if (res.ok) {
        const data = await res.json();
        setMember({ ...member, ...data.member });
        showToast(`Admin ${member.is_admin ? 'revoked' : 'granted'}`, 'success');
      } else {
        const data = await res.json();
        showToast(data.error ?? 'Update failed', 'error');
      }
    } catch {
      showToast('Update failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Ban
  const handleBan = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          banned_at: new Date().toISOString(),
          ban_reason: banReason || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMember({ ...member, ...data.member });
        setBanDialogOpen(false);
        setBanReason('');
        showToast('Member banned', 'success');
      } else {
        const data = await res.json();
        showToast(data.error ?? 'Ban failed', 'error');
      }
    } catch {
      showToast('Ban failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Unban
  const handleUnban = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banned_at: null, ban_reason: null }),
      });
      if (res.ok) {
        const data = await res.json();
        setMember({ ...member, ...data.member });
        showToast('Member unbanned', 'success');
      } else {
        const data = await res.json();
        showToast(data.error ?? 'Unban failed', 'error');
      }
    } catch {
      showToast('Unban failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Suspend
  const handleSuspend = async () => {
    if (!suspendUntil) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suspended_until: new Date(suspendUntil).toISOString(),
          ban_reason: banReason || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMember({ ...member, ...data.member });
        setSuspendDialogOpen(false);
        setSuspendUntil('');
        setBanReason('');
        showToast('Member suspended', 'success');
      } else {
        const data = await res.json();
        showToast(data.error ?? 'Suspend failed', 'error');
      }
    } catch {
      showToast('Suspend failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Unsuspend
  const handleUnsuspend = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspended_until: null, ban_reason: null }),
      });
      if (res.ok) {
        const data = await res.json();
        setMember({ ...member, ...data.member });
        showToast('Suspension lifted', 'success');
      } else {
        const data = await res.json();
        showToast(data.error ?? 'Failed', 'error');
      }
    } catch {
      showToast('Failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete member
  const handleDeleteMember = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/members/${member.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Member deleted', 'success');
        router.push('/admin?tab=members');
      } else {
        const data = await res.json();
        showToast(data.error ?? 'Delete failed', 'error');
      }
    } catch {
      showToast('Delete failed', 'error');
    } finally {
      setActionLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  // Meal edit
  const startEditMeal = (meal: DishData) => {
    setEditingMealId(meal.id);
    setEditMealTitle(meal.title);
  };

  const handleSaveMeal = async () => {
    if (!editingMealId) return;
    setMealSaving(true);
    try {
      const res = await fetch(`/api/dishes/${editingMealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editMealTitle,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMeals((prev) => prev.map((m) => (m.id === editingMealId ? { ...m, ...data.meal } : m)));
        setEditingMealId(null);
        showToast('Meal updated', 'success');
      } else {
        const data = await res.json();
        showToast(data.error ?? 'Update failed', 'error');
      }
    } catch {
      showToast('Update failed', 'error');
    } finally {
      setMealSaving(false);
    }
  };

  // Delete meal
  const handleDeleteMeal = async () => {
    if (!deleteMealId) return;
    setMealSaving(true);
    try {
      const res = await fetch(`/api/dishes/${deleteMealId}`, { method: 'DELETE' });
      if (res.ok) {
        setMeals((prev) => prev.filter((m) => m.id !== deleteMealId));
        setMealsTotal((t) => t - 1);
        setDeleteMealId(null);
        showToast('Meal deleted', 'success');
      } else {
        const data = await res.json();
        showToast(data.error ?? 'Delete failed', 'error');
      }
    } catch {
      showToast('Delete failed', 'error');
    } finally {
      setMealSaving(false);
    }
  };

  const isBanned = !!member.banned_at;
  const isSuspended = member.suspended_until && new Date(member.suspended_until) > new Date();

  return (
    <>
      {/* Header */}
      <div style={{ padding: 16, borderBottom: '1px solid var(--bg-elevated)' }}>
        <Link
          href="/admin?tab=members"
          className="inline-flex items-center gap-2"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 14, textDecoration: 'none', marginBottom: 12, display: 'inline-flex' }}
        >
          <ArrowLeft size={16} /> Back to Members
        </Link>
        <div className="flex items-center gap-4">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              backgroundColor: 'var(--bg-elevated)',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {member.avatar_url ? (
              <img src={member.avatar_url} alt={member.username} style={{ width: 56, height: 56, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 600, color: 'var(--text-secondary)' }}>
                {member.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-primary)', margin: 0 }}>
              @{member.username}
            </h1>
            <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
              {isBanned && (
                <span className="inline-flex items-center gap-1" style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-body)', color: '#FFFFFF', backgroundColor: 'var(--status-error)' }}>
                  <Ban size={10} /> Banned
                </span>
              )}
              {isSuspended && (
                <span className="inline-flex items-center gap-1" style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-body)', color: 'var(--primary-foreground)', backgroundColor: 'var(--accent-primary)' }}>
                  <Clock size={10} /> Suspended until {new Date(member.suspended_until!).toLocaleDateString()}
                </span>
              )}
              {member.is_admin && (
                <span className="inline-flex items-center gap-1" style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-body)', color: 'var(--primary-foreground)', backgroundColor: 'var(--status-success)' }}>
                  <Shield size={10} /> Admin
                </span>
              )}
              {member.is_business && (
                <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-elevated)' }}>
                  Restaurant
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4" style={{ maxWidth: 300 }}>
          <div style={{ padding: 12, borderRadius: 12, backgroundColor: 'var(--bg-surface)' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-secondary)' }}>Dishes</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)' }}>{stats.dish_count}</p>
          </div>
          <div style={{ padding: 12, borderRadius: 12, backgroundColor: 'var(--bg-surface)' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-secondary)' }}>Joined</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginTop: 4 }}>{new Date(member.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Profile section */}
        <div style={{ padding: 16, borderRadius: 16, backgroundColor: 'var(--bg-surface)' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>Profile</h2>
            {!editingProfile && (
              <button
                type="button"
                onClick={() => setEditingProfile(true)}
                className="inline-flex items-center gap-1"
                style={{ padding: '4px 10px', borderRadius: 8, backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer' }}
              >
                <Edit3 size={12} /> Edit
              </button>
            )}
          </div>

          {editingProfile ? (
            <div className="flex flex-col gap-3">
              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={50}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-elevated)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={160}
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-elevated)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="inline-flex items-center gap-1"
                  style={{ padding: '6px 14px', borderRadius: 8, backgroundColor: 'var(--status-success)', color: 'var(--primary-foreground)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, border: 'none', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1 }}
                >
                  <Save size={14} /> {saving ? '...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingProfile(false); setDisplayName(member.display_name ?? ''); setBio(member.bio ?? ''); }}
                  style={{ padding: '6px 14px', borderRadius: 8, backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>Display Name</span>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-primary)', margin: '2px 0 0 0' }}>{member.display_name || '—'}</p>
              </div>
              <div>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>Bio</span>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-primary)', margin: '2px 0 0 0' }}>{member.bio || '—'}</p>
              </div>
              {(member.location_city || member.location_country) && (
                <div>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>Location</span>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-primary)', margin: '2px 0 0 0' }}>
                    {[member.location_city, member.location_country].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
              {member.ban_reason && (
                <div>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--status-error)' }}>Ban Reason</span>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-primary)', margin: '2px 0 0 0' }}>{member.ban_reason}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions section */}
        {!isSelf && (
          <div style={{ padding: 16, borderRadius: 16, backgroundColor: 'var(--bg-surface)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)', margin: '0 0 12px 0' }}>Actions</h2>
            <div className="flex flex-wrap gap-2">
              {/* Admin toggle */}
              <button
                type="button"
                onClick={handleToggleAdmin}
                disabled={actionLoading}
                className="inline-flex items-center gap-1"
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  backgroundColor: member.is_admin ? 'var(--bg-elevated)' : 'var(--status-success)',
                  color: member.is_admin ? 'var(--text-primary)' : '#121212',
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  cursor: actionLoading ? 'wait' : 'pointer',
                  opacity: actionLoading ? 0.6 : 1,
                }}
              >
                <Shield size={14} /> {member.is_admin ? 'Revoke Admin' : 'Grant Admin'}
              </button>

              {/* Ban/Unban */}
              {isBanned ? (
                <button
                  type="button"
                  onClick={handleUnban}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1"
                  style={{ padding: '8px 14px', borderRadius: 8, backgroundColor: 'var(--status-success)', color: 'var(--primary-foreground)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, border: 'none', cursor: actionLoading ? 'wait' : 'pointer', opacity: actionLoading ? 0.6 : 1 }}
                >
                  Unban
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setBanDialogOpen(true)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1"
                  style={{ padding: '8px 14px', borderRadius: 8, backgroundColor: 'var(--status-error)', color: '#FFFFFF', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, border: 'none', cursor: actionLoading ? 'wait' : 'pointer', opacity: actionLoading ? 0.6 : 1 }}
                >
                  <Ban size={14} /> Ban
                </button>
              )}

              {/* Suspend/Unsuspend */}
              {isSuspended ? (
                <button
                  type="button"
                  onClick={handleUnsuspend}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1"
                  style={{ padding: '8px 14px', borderRadius: 8, backgroundColor: 'var(--status-success)', color: 'var(--primary-foreground)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, border: 'none', cursor: actionLoading ? 'wait' : 'pointer', opacity: actionLoading ? 0.6 : 1 }}
                >
                  Unsuspend
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSuspendDialogOpen(true)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1"
                  style={{ padding: '8px 14px', borderRadius: 8, backgroundColor: 'var(--accent-primary)', color: 'var(--primary-foreground)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, border: 'none', cursor: actionLoading ? 'wait' : 'pointer', opacity: actionLoading ? 0.6 : 1 }}
                >
                  <Clock size={14} /> Suspend
                </button>
              )}

              {/* Delete */}
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-1"
                style={{ padding: '8px 14px', borderRadius: 8, backgroundColor: 'var(--status-error)', color: '#FFFFFF', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, border: 'none', cursor: actionLoading ? 'wait' : 'pointer', opacity: actionLoading ? 0.6 : 1 }}
              >
                <Trash2 size={14} /> Delete Member
              </button>
            </div>
          </div>
        )}

        {isSelf && (
          <div style={{ padding: 12, borderRadius: 12, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--accent-primary)' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--accent-primary)' }}>
              This is your own account. You cannot ban, suspend, demote, or delete yourself.
            </p>
          </div>
        )}

        {/* Meals section */}
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)', marginBottom: 12 }}>
            Meals ({mealsTotal})
          </h2>

          {mealsLoading ? (
            <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 14 }}>Loading meals...</p>
          ) : meals.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 14 }}>No meals.</p>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {meals.map((meal) => (
                <div
                  key={meal.id}
                  style={{ borderRadius: 12, backgroundColor: 'var(--bg-surface)', overflow: 'hidden' }}
                >
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3' }}>
                    <Image
                      src={meal.photo_url}
                      alt={meal.title}
                      fill
                      className="object-cover"
                      sizes="260px"
                    />
                  </div>

                  <div style={{ padding: 12 }}>
                    {editingMealId === meal.id ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          value={editMealTitle}
                          onChange={(e) => setEditMealTitle(e.target.value)}
                          placeholder="Title"
                          style={{ width: '100%', padding: '6px 10px', borderRadius: 8, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-elevated)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                        />
                        <select
                          value={editMealCuisine ?? ''}
                          onChange={(e) => setEditMealCuisine(e.target.value || null)}
                          style={{ width: '100%', padding: '6px 10px', borderRadius: 8, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-elevated)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none' }}
                        >
                          <option value="">No cuisine</option>
                          {CUISINE_OPTIONS.map((c) => (
                            <option key={c} value={c}>{CUISINE_LABELS[c]}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={editMealTags}
                          onChange={(e) => setEditMealTags(e.target.value)}
                          placeholder="Tags (comma separated)"
                          style={{ width: '100%', padding: '6px 10px', borderRadius: 8, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-elevated)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSaveMeal}
                            disabled={mealSaving}
                            className="inline-flex items-center gap-1"
                            style={{ padding: '4px 10px', borderRadius: 6, backgroundColor: 'var(--status-success)', color: 'var(--primary-foreground)', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, border: 'none', cursor: mealSaving ? 'wait' : 'pointer', opacity: mealSaving ? 0.6 : 1 }}
                          >
                            <Save size={12} /> {mealSaving ? '...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingMealId(null)}
                            style={{ padding: '4px 10px', borderRadius: 6, backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                          {meal.title}
                        </p>
                        <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
                            {meal.reaction_count} reactions · {meal.save_count} saves
                          </span>
                        </div>
                        <div className="flex gap-2" style={{ marginTop: 8 }}>
                          <button
                            type="button"
                            onClick={() => startEditMeal(meal)}
                            className="inline-flex items-center gap-1"
                            style={{ padding: '4px 10px', borderRadius: 6, backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer' }}
                          >
                            <Edit3 size={12} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteMealId(meal.id)}
                            className="inline-flex items-center gap-1"
                            style={{ padding: '4px 10px', borderRadius: 6, backgroundColor: 'var(--status-error)', color: '#FFFFFF', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer' }}
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Meals pagination */}
          {mealsTotalPages > 1 && (
            <div className="flex items-center justify-center gap-4" style={{ paddingTop: 16 }}>
              <button
                type="button"
                onClick={() => setMealsPage((p) => Math.max(1, p - 1))}
                disabled={mealsPage === 1}
                className="inline-flex items-center gap-1"
                style={{ padding: '6px 12px', borderRadius: 8, backgroundColor: 'var(--bg-surface)', color: mealsPage === 1 ? 'var(--text-secondary)' : 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 13, border: 'none', cursor: mealsPage === 1 ? 'default' : 'pointer', opacity: mealsPage === 1 ? 0.5 : 1 }}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
                Page {mealsPage} of {mealsTotalPages}
              </span>
              <button
                type="button"
                onClick={() => setMealsPage((p) => Math.min(mealsTotalPages, p + 1))}
                disabled={mealsPage === mealsTotalPages}
                className="inline-flex items-center gap-1"
                style={{ padding: '6px 12px', borderRadius: 8, backgroundColor: 'var(--bg-surface)', color: mealsPage === mealsTotalPages ? 'var(--text-secondary)' : 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 13, border: 'none', cursor: mealsPage === mealsTotalPages ? 'default' : 'pointer', opacity: mealsPage === mealsTotalPages ? 0.5 : 1 }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        open={banDialogOpen}
        title="Ban Member"
        message={`Are you sure you want to ban @${member.username}? They will not be able to access the platform.`}
        confirmLabel="Ban"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleBan}
        onCancel={() => { setBanDialogOpen(false); setBanReason(''); }}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Member"
        message={`This permanently deletes @${member.username} and all their data (meals, ratings, comments, etc.). This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDeleteMember}
        onCancel={() => setDeleteDialogOpen(false)}
      />

      <ConfirmDialog
        open={!!deleteMealId}
        title="Delete Meal"
        message="This permanently deletes this meal and all its ratings, comments, and recipe requests. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={mealSaving}
        onConfirm={handleDeleteMeal}
        onCancel={() => setDeleteMealId(null)}
      />

      {/* Suspend dialog — custom with date picker */}
      {suspendDialogOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setSuspendDialogOpen(false); setSuspendUntil(''); setBanReason(''); } }}
        >
          <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: 24, padding: 24, maxWidth: 400, width: '90%' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)', marginBottom: 8 }}>
              Suspend Member
            </h3>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Temporarily suspend @{member.username} until a specified date.
            </p>
            <div className="flex flex-col gap-3" style={{ marginBottom: 16 }}>
              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Suspend Until</label>
                <input
                  type="date"
                  value={suspendUntil}
                  onChange={(e) => setSuspendUntil(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-elevated)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Reason (optional)</label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="Reason for suspension..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-elevated)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setSuspendDialogOpen(false); setSuspendUntil(''); setBanReason(''); }}
                style={{ padding: '8px 16px', borderRadius: 8, backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSuspend}
                disabled={actionLoading || !suspendUntil}
                style={{ padding: '8px 16px', borderRadius: 8, backgroundColor: 'var(--accent-primary)', color: 'var(--primary-foreground)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, border: 'none', cursor: (actionLoading || !suspendUntil) ? 'not-allowed' : 'pointer', opacity: (actionLoading || !suspendUntil) ? 0.6 : 1 }}
              >
                {actionLoading ? '...' : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
