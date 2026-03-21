'use client';

import { useState, useEffect, useCallback } from 'react';
import { showToast } from '@/components/ui/Toast';
import type { ContactSubmission } from '@/types/database';

const STATUS_OPTIONS = ['all', 'new', 'in_progress', 'resolved', 'spam'] as const;

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  spam: 'Spam',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: 'var(--accent-primary)', text: '#121212' },
  in_progress: { bg: '#3B82F6', text: '#FFFFFF' },
  resolved: { bg: 'var(--status-success)', text: '#121212' },
  spam: { bg: 'var(--status-error)', text: '#FFFFFF' },
};

export function ContactTab() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const perPage = 20;

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        page: page.toString(),
        per_page: perPage.toString(),
      });
      const res = await fetch(`/api/admin/contact?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.data);
        setTotal(data.total);
      } else {
        showToast('Failed to load submissions', 'error');
      }
    } catch {
      showToast('Failed to load submissions', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleStatusChange = useCallback(
    async (id: string, newStatus: string) => {
      setActionLoading(`${id}-${newStatus}`);
      try {
        const res = await fetch(`/api/admin/contact/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        if (res.ok) {
          showToast(`Marked as ${STATUS_LABELS[newStatus]?.toLowerCase() ?? newStatus}`, 'success');
          fetchSubmissions();
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
    [fetchSubmissions]
  );

  const handleSaveNotes = useCallback(
    async (id: string) => {
      setActionLoading(`${id}-notes`);
      try {
        const res = await fetch(`/api/admin/contact/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ admin_notes: notesValue }),
        });
        if (res.ok) {
          showToast('Notes saved', 'success');
          setEditingNotesId(null);
          fetchSubmissions();
        } else {
          showToast('Failed to save notes', 'error');
        }
      } catch {
        showToast('Failed to save notes', 'error');
      } finally {
        setActionLoading(null);
      }
    },
    [notesValue, fetchSubmissions]
  );

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="flex flex-col gap-3">
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)' }}>
        Contact Submissions ({total})
      </h2>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { setStatusFilter(s); setPage(1); }}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: statusFilter === s ? 600 : 400,
              color: statusFilter === s ? 'var(--primary-foreground)' : 'var(--text-secondary)',
              backgroundColor: statusFilter === s ? 'var(--accent-primary)' : 'var(--bg-surface)',
              border: 'none',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {s === 'all' ? 'All' : STATUS_LABELS[s] ?? s}
          </button>
        ))}
      </div>

      {loading && (
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
          Loading...
        </p>
      )}

      {!loading && submissions.length === 0 && (
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
          No submissions found.
        </p>
      )}

      {submissions.map((item) => {
        const isExpanded = expandedId === item.id;
        const isEditingNotes = editingNotesId === item.id;
        const colors = STATUS_COLORS[item.status] ?? STATUS_COLORS.new;

        return (
          <div
            key={item.id}
            style={{
              padding: 16,
              borderRadius: 12,
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            {/* Header: status badge + email + date */}
            <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 8 }}>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: 'var(--font-body)',
                  color: colors.text,
                  backgroundColor: colors.bg,
                  textTransform: 'uppercase',
                }}
              >
                {STATUS_LABELS[item.status] ?? item.status}
              </span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                {item.email}
              </span>
              {item.name && (
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
                  ({item.name})
                </span>
              )}
            </div>

            {/* Subject */}
            {item.subject && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
                {item.subject}
              </p>
            )}

            {/* Message (truncated or full) */}
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                color: 'var(--text-secondary)',
                marginBottom: 8,
                whiteSpace: isExpanded ? 'pre-wrap' : 'nowrap',
                overflow: isExpanded ? 'visible' : 'hidden',
                textOverflow: isExpanded ? 'unset' : 'ellipsis',
                cursor: 'pointer',
              }}
              onClick={() => setExpandedId(isExpanded ? null : item.id)}
            >
              {item.message}
            </p>

            {/* Admin notes */}
            {isEditingNotes ? (
              <div className="flex flex-col gap-2" style={{ marginBottom: 8 }}>
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    resize: 'vertical',
                    outline: 'none',
                  }}
                  placeholder="Admin notes..."
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveNotes(item.id)}
                    disabled={actionLoading === `${item.id}-notes`}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 6,
                      backgroundColor: 'var(--status-success)',
                      color: 'var(--primary-foreground)',
                      fontFamily: 'var(--font-body)',
                      fontSize: 12,
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {actionLoading === `${item.id}-notes` ? '...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingNotesId(null)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 6,
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-body)',
                      fontSize: 12,
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : item.admin_notes ? (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  backgroundColor: 'var(--bg-elevated)',
                  marginBottom: 8,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setEditingNotesId(item.id);
                  setNotesValue(item.admin_notes ?? '');
                }}
              >
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>
                  Admin notes:
                </p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-primary)' }}>
                  {item.admin_notes}
                </p>
              </div>
            ) : null}

            {/* Footer: date + actions */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingNotesId(item.id);
                    setNotesValue(item.admin_notes ?? '');
                  }}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 11,
                    border: '1px solid var(--bg-elevated)',
                    cursor: 'pointer',
                  }}
                >
                  {item.admin_notes ? 'Edit notes' : 'Add notes'}
                </button>
              </div>
              <div className="flex gap-2">
                {item.status !== 'in_progress' && (
                  <ActionBtn
                    label="In Progress"
                    variant="neutral"
                    loading={actionLoading === `${item.id}-in_progress`}
                    onClick={() => handleStatusChange(item.id, 'in_progress')}
                  />
                )}
                {item.status !== 'resolved' && (
                  <ActionBtn
                    label="Resolved"
                    variant="success"
                    loading={actionLoading === `${item.id}-resolved`}
                    onClick={() => handleStatusChange(item.id, 'resolved')}
                  />
                )}
                {item.status !== 'spam' && (
                  <ActionBtn
                    label="Spam"
                    variant="danger"
                    loading={actionLoading === `${item.id}-spam`}
                    onClick={() => handleStatusChange(item.id, 'spam')}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between" style={{ marginTop: 8 }}>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              backgroundColor: 'var(--bg-surface)',
              color: page === 1 ? 'var(--text-secondary)' : 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              border: 'none',
              cursor: page === 1 ? 'default' : 'pointer',
              opacity: page === 1 ? 0.5 : 1,
            }}
          >
            Previous
          </button>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              backgroundColor: 'var(--bg-surface)',
              color: page === totalPages ? 'var(--text-secondary)' : 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              border: 'none',
              cursor: page === totalPages ? 'default' : 'pointer',
              opacity: page === totalPages ? 0.5 : 1,
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function ActionBtn({
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
