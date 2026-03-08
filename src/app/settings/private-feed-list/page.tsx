'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { UserPlus, Trash2, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAppStore } from '@/lib/store';
import { AppBar } from '@/components/layout/AppBar';

interface Member {
  id: string;
  member_id: string;
  status: 'pending' | 'accepted' | 'declined';
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export default function PrivateFeedListPage() {
  const t = useTranslations('privateFeed');
  const router = useRouter();
  const userPlan = useAppStore((s) => s.userPlan);

  const [members, setMembers] = useState<Member[]>([]);
  const [limit, setLimit] = useState(5);
  const [loading, setLoading] = useState(true);
  const [inviteUsername, setInviteUsername] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/private-feed-list');
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members ?? []);
        setLimit(data.limit ?? 5);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async () => {
    if (!inviteUsername.trim()) return;
    setInviting(true);
    setError('');
    try {
      // Look up user by username
      const lookupRes = await fetch(`/api/profile/lookup?username=${encodeURIComponent(inviteUsername.replace('@', ''))}`);
      if (!lookupRes.ok) {
        setError('User not found');
        setInviting(false);
        return;
      }
      const { id: memberId } = await lookupRes.json();

      const res = await fetch('/api/private-feed-list/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t('inviteFailed'));
        setInviting(false);
        return;
      }
      setShowInviteModal(false);
      setInviteUsername('');
      fetchMembers();
    } catch {
      setError(t('inviteFailed'));
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (entryId: string) => {
    try {
      await fetch(`/api/private-feed-list/${entryId}`, { method: 'DELETE' });
      setMembers((prev) => prev.filter((m) => m.id !== entryId));
    } catch {
      // Silently fail
    }
  };

  const activeCount = members.filter((m) => m.status === 'pending' || m.status === 'accepted').length;

  return (
    <div className="mx-auto pb-24" style={{ maxWidth: 960 }}>
      <AppBar
        title={t('title')}
        rightAction={
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            disabled={activeCount >= limit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              backgroundColor: activeCount >= limit ? 'var(--bg-elevated)' : 'var(--accent-primary)',
              color: activeCount >= limit ? 'var(--text-secondary)' : '#121212',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <UserPlus size={14} strokeWidth={1.5} />
            {t('invite')}
          </button>
        }
      />
      <div className="px-4 pt-4">

      {/* Member count */}
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          color: 'var(--text-secondary)',
          marginBottom: 16,
        }}
      >
        {t('memberCount', { count: activeCount, limit })}
      </p>

      {/* Members list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
        </div>
      ) : members.length === 0 ? (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--text-secondary)',
            textAlign: 'center',
            padding: '32px 0',
          }}
        >
          {t('noMembers')}
        </p>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
          {members.map((member, i) => (
            <div key={member.id}>
              {i > 0 && (
                <div style={{ height: 1, backgroundColor: 'var(--bg-elevated)', marginLeft: 52 }} />
              )}
              <div className="flex items-center gap-3 px-4 py-3">
                {member.profiles.avatar_url ? (
                  <Image
                    src={member.profiles.avatar_url}
                    alt={member.profiles.username}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div
                    className="rounded-full"
                    style={{ width: 32, height: 32, backgroundColor: 'var(--bg-elevated)' }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 14,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                    }}
                  >
                    @{member.profiles.username}
                  </p>
                  {member.status === 'pending' && (
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 11,
                        color: 'var(--accent-primary)',
                      }}
                    >
                      {t('pending')}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(member.id)}
                  className="flex items-center justify-center"
                  style={{ width: 32, height: 32, color: 'var(--text-secondary)' }}
                  aria-label={`Remove ${member.profiles.username}`}
                >
                  <Trash2 size={16} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite modal */}
      {showInviteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowInviteModal(false)}
        >
          <div
            className="mx-4 w-full rounded-3xl p-6"
            style={{ maxWidth: 400, backgroundColor: 'var(--bg-surface)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 20,
                color: 'var(--text-primary)',
                marginBottom: 16,
              }}
            >
              {t('inviteByUsername')}
            </h2>
            <input
              type="text"
              value={inviteUsername}
              onChange={(e) => setInviteUsername(e.target.value)}
              placeholder={t('usernamePlaceholder')}
              className="w-full px-4 py-3 rounded-2xl outline-none mb-3"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                border: '1px solid transparent',
              }}
            />
            {error && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--status-error)', marginBottom: 8 }}>
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={handleInvite}
              disabled={inviting || !inviteUsername.trim()}
              className="w-full py-3 rounded-2xl flex items-center justify-center gap-2"
              style={{
                backgroundColor: !inviteUsername.trim() ? 'var(--bg-elevated)' : 'var(--accent-primary)',
                color: !inviteUsername.trim() ? 'var(--text-secondary)' : '#121212',
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              {inviting && <Loader2 size={16} className="animate-spin" />}
              {t('sendInvite')}
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
