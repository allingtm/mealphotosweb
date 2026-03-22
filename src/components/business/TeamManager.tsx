'use client';

import { useEffect, useState } from 'react';
import { UserPlus, X, Shield, Camera, BookOpen, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface TeamMember {
  id: string;
  business_id: string;
  user_id: string;
  role: 'owner' | 'member';
  permissions: {
    can_post_dishes: boolean;
    can_manage_menu: boolean;
  };
  created_at: string;
  email: string | null;
  profile: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface TeamInvite {
  id: string;
  email: string;
  status: string;
  expires_at: string;
  created_at: string;
}

interface TeamLimits {
  max: number;
  current: number;
}

export function TeamManager() {
  const teamRole = useAppStore((s) => s.teamRole);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [limits, setLimits] = useState<TeamLimits>({ max: 2, current: 0 });
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Only owners can manage the team
  if (teamRole !== 'owner') return null;

  async function fetchTeam() {
    try {
      const res = await fetch('/api/businesses/team');
      const data = await res.json();
      setMembers(data.members ?? []);
      setInvites(data.invites ?? []);
      setLimits(data.limits ?? { max: 2, current: 0 });
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    fetchTeam();
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setInviting(true);

    try {
      const res = await fetch('/api/businesses/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to send invite');
        return;
      }
      setSuccess(`Invite sent to ${inviteEmail}`);
      setInviteEmail('');
      fetchTeam();
    } catch {
      setError('Failed to send invite');
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/businesses/team/${memberId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to remove member');
        return;
      }
      fetchTeam();
    } catch {
      setError('Failed to remove member');
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/businesses/team/invite/${inviteId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to revoke invite');
        return;
      }
      fetchTeam();
    } catch {
      setError('Failed to revoke invite');
    }
  }

  async function handleTogglePermission(
    memberId: string,
    currentPermissions: TeamMember['permissions'],
    key: 'can_post_dishes' | 'can_manage_menu'
  ) {
    setError(null);
    const updated = { ...currentPermissions, [key]: !currentPermissions[key] };
    try {
      const res = await fetch(`/api/businesses/team/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: updated }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to update permissions');
        return;
      }
      fetchTeam();
    } catch {
      setError('Failed to update permissions');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            color: 'var(--text-primary)',
            marginBottom: 4,
          }}
        >
          Team Members
        </h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
          {limits.current}/{limits.max} team members
        </p>
      </div>

      {/* Error / Success messages */}
      {error && (
        <div
          className="rounded-2xl px-4 py-3"
          style={{ backgroundColor: 'rgba(212, 85, 58, 0.1)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--status-error)' }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="rounded-2xl px-4 py-3"
          style={{ backgroundColor: 'rgba(76, 175, 80, 0.1)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--status-success)' }}
        >
          {success}
        </div>
      )}

      {/* Current members */}
      <div className="flex flex-col gap-3">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{ backgroundColor: 'var(--bg-surface)' }}
          >
            {/* Avatar */}
            <div
              className="flex items-center justify-center rounded-full shrink-0"
              style={{
                width: 40,
                height: 40,
                backgroundColor: 'var(--bg-elevated)',
                overflow: 'hidden',
              }}
            >
              {member.profile?.avatar_url ? (
                <img
                  src={member.profile.avatar_url}
                  alt=""
                  style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: '50%' }}
                />
              ) : (
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--text-secondary)' }}>
                  {(member.profile?.display_name ?? member.email ?? '?')[0]?.toUpperCase()}
                </span>
              )}
            </div>

            {/* Name + role */}
            <div className="flex-1 min-w-0">
              <p
                className="truncate"
                style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}
              >
                {member.profile?.display_name ?? member.profile?.username ?? member.email ?? 'Unknown'}
              </p>
              <div className="flex items-center gap-2">
                {member.role === 'owner' ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                    style={{ backgroundColor: 'rgba(232, 168, 56, 0.15)', fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--accent-primary)' }}
                  >
                    <Shield size={10} strokeWidth={1.5} /> Owner
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                    style={{ backgroundColor: 'var(--bg-elevated)', fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-secondary)' }}
                  >
                    Member
                  </span>
                )}
              </div>
            </div>

            {/* Permission toggles (members only) */}
            {member.role === 'member' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTogglePermission(member.id, member.permissions, 'can_post_dishes')}
                  title={member.permissions.can_post_dishes ? 'Can post dishes (click to revoke)' : 'Cannot post dishes (click to grant)'}
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 32,
                    height: 32,
                    backgroundColor: member.permissions.can_post_dishes ? 'rgba(232, 168, 56, 0.15)' : 'var(--bg-elevated)',
                    color: member.permissions.can_post_dishes ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Camera size={16} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => handleTogglePermission(member.id, member.permissions, 'can_manage_menu')}
                  title={member.permissions.can_manage_menu ? 'Can manage menu (click to revoke)' : 'Cannot manage menu (click to grant)'}
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 32,
                    height: 32,
                    backgroundColor: member.permissions.can_manage_menu ? 'rgba(232, 168, 56, 0.15)' : 'var(--bg-elevated)',
                    color: member.permissions.can_manage_menu ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <BookOpen size={16} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveMember(member.id)}
                  title="Remove team member"
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 32,
                    height: 32,
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--status-error)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <X size={16} strokeWidth={1.5} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Permission legend */}
      <div className="flex items-center gap-4" style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
        <span className="inline-flex items-center gap-1"><Camera size={12} strokeWidth={1.5} /> Post dishes</span>
        <span className="inline-flex items-center gap-1"><BookOpen size={12} strokeWidth={1.5} /> Manage menu</span>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Pending Invites
          </h3>
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between rounded-2xl px-4 py-3"
              style={{ backgroundColor: 'var(--bg-surface)' }}
            >
              <div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-primary)' }}>
                  {invite.email}
                </p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  Expires {new Date(invite.expires_at).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRevokeInvite(invite.id)}
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--status-error)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Invite form */}
      {limits.current < limits.max && (
        <form onSubmit={handleInvite} className="flex gap-2">
          <input
            type="email"
            placeholder="Email address"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            className="flex-1 rounded-2xl px-4 py-3"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--bg-elevated)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={inviting || !inviteEmail}
            className="flex items-center gap-2 rounded-2xl px-4 py-3"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--primary-foreground)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 600,
              border: 'none',
              cursor: inviting ? 'not-allowed' : 'pointer',
              opacity: inviting ? 0.6 : 1,
            }}
          >
            {inviting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <UserPlus size={16} strokeWidth={1.5} />
            )}
            Invite
          </button>
        </form>
      )}

      {limits.current >= limits.max && (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
          You&apos;ve reached your team member limit ({limits.max}). Upgrade your plan for more.
        </p>
      )}
    </div>
  );
}
