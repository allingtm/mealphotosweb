'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { showToast } from '@/components/ui/Toast';
import { MembersTab } from './MembersTab';

interface ModerationItem {
  id: string;
  meal_id: string;
  status: string;
  moderation_labels: Record<string, unknown>;
  cloud_vision_checked: boolean;
  created_at: string;
  meals: {
    title: string;
    photo_url: string;
    user_id: string;
    profiles: { username: string; moderation_tier: string } | null;
  } | null;
}

interface ReportItem {
  id: string;
  reason: string;
  priority: string;
  detail: string | null;
  status: string;
  created_at: string;
  reported_meal_id: string | null;
  reported_user_id: string | null;
  reported_comment_id: string | null;
  comments: {
    text: string;
    user_id: string;
    profiles: { username: string } | null;
  } | null;
}

interface DisputeItem {
  id: string;
  meal_id: string;
  venue_mapbox_id: string;
  reason: string;
  detail: string | null;
  status: string;
  created_at: string;
  meals: {
    title: string;
    photo_url: string;
    venue_name: string | null;
  } | null;
  restaurant_username: string | null;
  dispute_stats: {
    total: number;
    upheld: number;
    dismissed: number;
  } | null;
}

interface AdminTabsProps {
  initialTab: string;
  moderationQueue: ModerationItem[];
  reports: ReportItem[];
  disputes: DisputeItem[];
  counts: {
    moderation: number;
    reports: number;
    disputes: number;
    urgentReports: number;
    members: number;
  };
}

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'members', label: 'Members' },
  { key: 'moderation', label: 'Moderation' },
  { key: 'reports', label: 'Reports' },
  { key: 'disputes', label: 'Disputes' },
] as const;

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'var(--status-error)',
  high: 'var(--accent-primary)',
  standard: 'var(--text-secondary)',
};

const REASON_LABELS: Record<string, string> = {
  not_food: 'Not food',
  inappropriate: 'Inappropriate',
  spam: 'Spam',
  harassment: 'Harassment',
  other: 'Other',
  stolen_photo: 'Stolen photo',
  wrong_venue: 'Wrong venue',
  food_safety: 'Food safety',
  privacy: 'Privacy',
  copyright: 'Copyright',
  not_served_here: 'Not served here',
  wrong_location: 'Wrong location',
  fake_photo: 'Fake photo',
};

export function AdminTabs({
  initialTab,
  moderationQueue,
  reports,
  disputes,
  counts,
}: AdminTabsProps) {
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const router = useRouter();

  const handleDemoteUser = useCallback(
    async (userId: string) => {
      setActionLoading(`${userId}-demote`);
      try {
        const res = await fetch(`/api/admin/members/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ moderation_tier: 'flagged' }),
        });
        if (res.ok) {
          showToast('User demoted to flagged', 'success');
          router.refresh();
        } else {
          const data = await res.json();
          showToast(data.error ?? 'Demotion failed', 'error');
        }
      } catch {
        showToast('Demotion failed', 'error');
      } finally {
        setActionLoading(null);
      }
    },
    [router]
  );

  const handleAction = useCallback(
    async (endpoint: string, id: string, action: string, adminNotes?: string) => {
      setActionLoading(`${id}-${action}`);
      try {
        const res = await fetch(`/api/admin/${endpoint}/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, admin_notes: adminNotes }),
        });
        if (res.ok) {
          showToast(`${action} successful`, 'success');
          router.refresh();
        } else {
          const data = await res.json();
          showToast(data.error ?? 'Action failed', 'error');
        }
      } catch {
        showToast('Action failed', 'error');
      } finally {
        setActionLoading(null);
      }
    },
    [router]
  );

  return (
    <div>
      {/* Tab bar */}
      <div
        className="flex gap-1"
        style={{
          padding: '8px 16px',
          borderBottom: '1px solid var(--bg-elevated)',
          overflowX: 'auto',
        }}
      >
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: activeTab === key ? 600 : 400,
              color: activeTab === key ? '#121212' : 'var(--text-secondary)',
              backgroundColor: activeTab === key ? 'var(--accent-primary)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {/* Overview tab */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-4">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)' }}>
              Dashboard
            </h2>
            <div className="grid grid-cols-2 gap-4" style={{ maxWidth: 600 }}>
              <StatCard label="Pending Moderation" value={counts.moderation} />
              <StatCard label="Pending Reports" value={counts.reports} />
              <StatCard label="Urgent Reports" value={counts.urgentReports} color="var(--status-error)" />
              <StatCard label="Pending Disputes" value={counts.disputes} />
              <StatCard label="Total Members" value={counts.members} />
            </div>
          </div>
        )}

        {/* Members tab */}
        {activeTab === 'members' && <MembersTab />}

        {/* Moderation tab */}
        {activeTab === 'moderation' && (
          <div className="flex flex-col gap-3">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)' }}>
              Moderation Queue ({moderationQueue.length})
            </h2>
            {moderationQueue.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                No items pending review.
              </p>
            )}
            {moderationQueue.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                <div className="flex items-center gap-4">
                  {item.meals?.photo_url && (
                    <Image
                      src={item.meals.photo_url}
                      alt={item.meals.title ?? 'Meal'}
                      width={64}
                      height={64}
                      className="rounded-lg object-cover"
                      style={{ width: 64, height: 64 }}
                    />
                  )}
                  <div className="flex-1">
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {item.meals?.title ?? 'Unknown meal'}
                    </p>
                    <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
                      <TierBadge tier={item.meals?.profiles?.moderation_tier} />
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-secondary)' }}>
                        CV: {item.cloud_vision_checked ? 'Checked' : 'Skipped'}
                      </span>
                    </div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {item.meals?.profiles?.username ? `@${item.meals.profiles.username}` : ''} · {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <ActionButton
                        label="Approve"
                        variant="success"
                        loading={actionLoading === `${item.id}-approve`}
                        onClick={() => handleAction('moderation', item.id, 'approve')}
                      />
                      <ActionButton
                        label="Reject"
                        variant="danger"
                        loading={actionLoading === `${item.id}-reject`}
                        onClick={() => handleAction('moderation', item.id, 'reject')}
                      />
                    </div>
                    {item.meals?.user_id && (
                      <ActionButton
                        label="Demote to Flagged"
                        variant="danger"
                        loading={actionLoading === `${item.meals.user_id}-demote`}
                        onClick={() => handleDemoteUser(item.meals!.user_id)}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reports tab */}
        {activeTab === 'reports' && (
          <div className="flex flex-col gap-3">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)' }}>
              Reports ({reports.length})
            </h2>
            {reports.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                No pending reports.
              </p>
            )}
            {reports.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: 'var(--font-body)',
                      color: '#121212',
                      backgroundColor: PRIORITY_COLORS[item.priority] ?? 'var(--text-secondary)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.priority}
                  </span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {REASON_LABELS[item.reason] ?? item.reason}
                  </span>
                </div>
                {item.reported_comment_id && item.comments && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      backgroundColor: 'var(--bg-elevated)',
                      marginBottom: 8,
                    }}
                  >
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>
                      @{item.comments.profiles?.username ?? 'unknown'}:
                    </p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-primary)' }}>
                      {item.comments.text}
                    </p>
                  </div>
                )}
                {item.detail && (
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    {item.detail}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {new Date(item.created_at).toLocaleDateString()}
                    {item.reported_comment_id ? ' · Comment report' : item.reported_meal_id ? ' · Meal report' : ' · User report'}
                  </span>
                  <div className="flex gap-2">
                    <ActionButton
                      label="Action"
                      variant="success"
                      loading={actionLoading === `${item.id}-action`}
                      onClick={() => handleAction('reports', item.id, 'action')}
                    />
                    <ActionButton
                      label="Dismiss"
                      variant="neutral"
                      loading={actionLoading === `${item.id}-dismiss`}
                      onClick={() => handleAction('reports', item.id, 'dismiss')}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Disputes tab */}
        {activeTab === 'disputes' && (
          <div className="flex flex-col gap-3">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)' }}>
              Venue Disputes ({disputes.length})
            </h2>
            {disputes.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                No pending disputes.
              </p>
            )}
            {disputes.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                <div className="flex items-center gap-3" style={{ marginBottom: 8 }}>
                  {item.meals?.photo_url && (
                    <Image
                      src={item.meals.photo_url}
                      alt={item.meals.title ?? 'Meal'}
                      width={48}
                      height={48}
                      className="rounded-lg object-cover"
                      style={{ width: 48, height: 48 }}
                    />
                  )}
                  <div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {item.meals?.title ?? 'Unknown meal'}
                    </p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--accent-primary)' }}>
                      {item.meals?.venue_name ?? item.venue_mapbox_id}
                    </p>
                  </div>
                </div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Reason: {REASON_LABELS[item.reason] ?? item.reason}
                </p>
                {item.detail && (
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    {item.detail}
                  </p>
                )}
                {item.restaurant_username && (
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    By: @{item.restaurant_username}
                  </p>
                )}
                {item.dispute_stats && (
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    History: {item.dispute_stats.total} disputes
                    ({item.dispute_stats.upheld} upheld, {item.dispute_stats.dismissed} dismissed)
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex gap-2">
                    <ActionButton
                      label="Uphold"
                      variant="danger"
                      loading={actionLoading === `${item.id}-uphold`}
                      onClick={() => handleAction('disputes', item.id, 'uphold')}
                    />
                    <ActionButton
                      label="Dismiss"
                      variant="neutral"
                      loading={actionLoading === `${item.id}-dismiss`}
                      onClick={() => handleAction('disputes', item.id, 'dismiss')}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
        {label}
      </p>
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          color: color ?? 'var(--text-primary)',
        }}
      >
        {value}
      </p>
    </div>
  );
}

const TIER_STYLES: Record<string, { bg: string; text: string }> = {
  new: { bg: 'var(--accent-primary)', text: '#121212' },
  trusted: { bg: 'var(--status-success)', text: '#121212' },
  flagged: { bg: 'var(--status-error)', text: '#FFFFFF' },
};

function TierBadge({ tier }: { tier?: string }) {
  const t = tier ?? 'new';
  const style = TIER_STYLES[t] ?? TIER_STYLES.new;
  return (
    <span
      style={{
        padding: '2px 6px',
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 600,
        fontFamily: 'var(--font-body)',
        color: style.text,
        backgroundColor: style.bg,
        textTransform: 'uppercase',
      }}
    >
      {t}
    </span>
  );
}

function ActionButton({
  label,
  variant,
  loading,
  onClick,
}: {
  label: string;
  variant: 'success' | 'danger' | 'neutral';
  loading: boolean;
  onClick: () => void;
}) {
  const colors = {
    success: { bg: 'var(--status-success)', text: '#121212' },
    danger: { bg: 'var(--status-error)', text: '#FFFFFF' },
    neutral: { bg: 'var(--bg-elevated)', text: 'var(--text-primary)' },
  };
  const c = colors[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        padding: '6px 12px',
        borderRadius: 8,
        backgroundColor: c.bg,
        color: c.text,
        fontFamily: 'var(--font-body)',
        fontSize: 12,
        fontWeight: 600,
        border: 'none',
        cursor: loading ? 'wait' : 'pointer',
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? '...' : label}
    </button>
  );
}
