'use client';

import { useState, useEffect, useCallback } from 'react';
import { showToast } from '@/components/ui/Toast';

interface InviteCode {
  id: string;
  code: string;
  label: string | null;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function InviteCodesTab() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Create form
  const [newCode, setNewCode] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newMaxUses, setNewMaxUses] = useState('1');
  const [newExpiry, setNewExpiry] = useState('');
  const [creating, setCreating] = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/invite-codes?per_page=100');
      if (res.ok) {
        const json = await res.json();
        setCodes(json.data ?? []);
        setTotal(json.total ?? 0);
      }
    } catch {
      showToast('Failed to load invite codes', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/admin/invite-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode,
          label: newLabel || undefined,
          max_uses: parseInt(newMaxUses, 10) || 1,
          expires_at: newExpiry ? new Date(newExpiry).toISOString() : undefined,
        }),
      });
      if (res.ok) {
        showToast('Invite code created', 'success');
        setNewCode('');
        setNewLabel('');
        setNewMaxUses('1');
        setNewExpiry('');
        fetchCodes();
      } else {
        const data = await res.json();
        showToast(data.error ?? 'Failed to create code', 'error');
      }
    } catch {
      showToast('Failed to create code', 'error');
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/invite-codes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });
      if (res.ok) {
        showToast(isActive ? 'Code deactivated' : 'Code activated', 'success');
        fetchCodes();
      } else {
        showToast('Action failed', 'error');
      }
    } catch {
      showToast('Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const activeCount = codes.filter((c) => c.is_active && c.current_uses < c.max_uses).length;
  const totalRedemptions = codes.reduce((sum, c) => sum + c.current_uses, 0);

  return (
    <div className="flex flex-col gap-6">
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)' }}>
        Invite Codes
      </h2>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4" style={{ maxWidth: 500 }}>
        <div style={{ padding: 12, borderRadius: 12, backgroundColor: 'var(--bg-surface)' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>Total Codes</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-primary)' }}>{total}</p>
        </div>
        <div style={{ padding: 12, borderRadius: 12, backgroundColor: 'var(--bg-surface)' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>Active</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--status-success)' }}>{activeCount}</p>
        </div>
        <div style={{ padding: 12, borderRadius: 12, backgroundColor: 'var(--bg-surface)' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>Redemptions</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--accent-primary)' }}>{totalRedemptions}</p>
        </div>
      </div>

      {/* Create form */}
      <form onSubmit={handleCreate} style={{ padding: 16, borderRadius: 12, backgroundColor: 'var(--bg-surface)' }}>
        <h3 style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
          Create New Code
        </h3>
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <label style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="e.g. BETA2026"
                required
                maxLength={20}
                style={{
                  width: 160,
                  height: 36,
                  padding: '0 10px',
                  borderRadius: 8,
                  border: '1px solid var(--bg-elevated)',
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                }}
              />
              <button
                type="button"
                onClick={() => setNewCode(generateCode())}
                style={{
                  height: 36,
                  padding: '0 10px',
                  borderRadius: 8,
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Random
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>Label</label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Press batch"
              maxLength={100}
              style={{
                width: 160,
                height: 36,
                padding: '0 10px',
                borderRadius: 8,
                border: '1px solid var(--bg-elevated)',
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
              }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>Max Uses</label>
            <input
              type="number"
              value={newMaxUses}
              onChange={(e) => setNewMaxUses(e.target.value)}
              min={1}
              max={10000}
              style={{
                width: 80,
                height: 36,
                padding: '0 10px',
                borderRadius: 8,
                border: '1px solid var(--bg-elevated)',
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
              }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>Expires (optional)</label>
            <input
              type="datetime-local"
              value={newExpiry}
              onChange={(e) => setNewExpiry(e.target.value)}
              style={{
                height: 36,
                padding: '0 10px',
                borderRadius: 8,
                border: '1px solid var(--bg-elevated)',
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
              }}
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={creating || !newCode.trim()}
              style={{
                height: 36,
                padding: '0 16px',
                borderRadius: 8,
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--bg-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: creating ? 'wait' : 'pointer',
                opacity: creating || !newCode.trim() ? 0.5 : 1,
              }}
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </form>

      {/* Codes list */}
      {loading ? (
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 14 }}>Loading...</p>
      ) : codes.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 14 }}>No invite codes yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {codes.map((code) => {
            const exhausted = code.current_uses >= code.max_uses;
            const expired = code.expires_at && new Date(code.expires_at) <= new Date();
            const status = !code.is_active ? 'Inactive' : expired ? 'Expired' : exhausted ? 'Exhausted' : 'Active';
            const statusColor = status === 'Active' ? 'var(--status-success)' : status === 'Inactive' ? 'var(--text-secondary)' : 'var(--status-error)';

            return (
              <div
                key={code.id}
                className="flex items-center gap-4"
                style={{
                  padding: '12px 16px',
                  borderRadius: 12,
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
                      {code.code}
                    </span>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: 6,
                        fontSize: 10,
                        fontWeight: 600,
                        fontFamily: 'var(--font-body)',
                        color: status === 'Active' ? '#121212' : '#FFFFFF',
                        backgroundColor: statusColor,
                        textTransform: 'uppercase',
                      }}
                    >
                      {status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3" style={{ marginTop: 4 }}>
                    {code.label && (
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
                        {code.label}
                      </span>
                    )}
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {code.current_uses}/{code.max_uses} used
                    </span>
                    {code.expires_at && (
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
                        Expires: {new Date(code.expires_at).toLocaleDateString()}
                      </span>
                    )}
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-secondary)' }}>
                      {new Date(code.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleActive(code.id, code.is_active)}
                  disabled={actionLoading === code.id}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    backgroundColor: code.is_active ? 'var(--status-error)' : 'var(--status-success)',
                    color: code.is_active ? '#FFFFFF' : '#121212',
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    fontWeight: 600,
                    border: 'none',
                    cursor: actionLoading === code.id ? 'wait' : 'pointer',
                    opacity: actionLoading === code.id ? 0.6 : 1,
                  }}
                >
                  {actionLoading === code.id ? '...' : code.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
