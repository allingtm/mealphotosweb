'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Invitation {
  id: string;
  owner_id: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export default function InvitationsPage() {
  const t = useTranslations('privateFeed');
  const router = useRouter();

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    try {
      const res = await fetch('/api/private-feed-list/invitations');
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.invitations ?? []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleRespond = async (invitationId: string, action: 'accept' | 'decline') => {
    setResponding(invitationId);
    try {
      await fetch(`/api/private-feed-list/${invitationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch {
      // Silently fail
    } finally {
      setResponding(null);
    }
  };

  return (
    <div className="mx-auto px-4 pb-24 pt-8 md:pt-12" style={{ maxWidth: 720 }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40, borderRadius: 'var(--radius-full)', color: 'var(--text-secondary)' }}
          aria-label="Go back"
        >
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            color: 'var(--accent-primary)',
            margin: 0,
          }}
        >
          {t('invitationsTitle')}
        </h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
        </div>
      ) : invitations.length === 0 ? (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--text-secondary)',
            textAlign: 'center',
            padding: '32px 0',
          }}
        >
          {t('noInvitations')}
        </p>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
          {invitations.map((inv, i) => (
            <div key={inv.id}>
              {i > 0 && (
                <div style={{ height: 1, backgroundColor: 'var(--bg-elevated)', marginLeft: 52 }} />
              )}
              <div className="flex items-center gap-3 px-4 py-3">
                {inv.profiles.avatar_url ? (
                  <Image
                    src={inv.profiles.avatar_url}
                    alt={inv.profiles.username}
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
                    @{inv.profiles.username}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleRespond(inv.id, 'accept')}
                    disabled={responding === inv.id}
                    className="px-3 py-1.5 rounded-full"
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: '#121212',
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {responding === inv.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      t('accept')
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespond(inv.id, 'decline')}
                    disabled={responding === inv.id}
                    className="px-3 py-1.5 rounded-full"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    {t('decline')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
