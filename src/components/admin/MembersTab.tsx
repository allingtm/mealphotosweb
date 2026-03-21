'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight, Shield, Ban, Clock } from 'lucide-react';

interface MemberRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  is_restaurant: boolean;
  banned_at: string | null;
  suspended_until: string | null;
  created_at: string;
}

export function MembersTab() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const perPage = 20;

  const fetchMembers = useCallback(async (searchTerm: string, pageNum: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pageNum), per_page: String(perPage) });
      if (searchTerm) params.set('search', searchTerm);

      const res = await fetch(`/api/admin/members?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members);
        setTotal(data.total);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers(search, page);
  }, [page, fetchMembers, search]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchMembers(value, 1);
    }, 300);
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const getStatusBadge = (member: MemberRow) => {
    if (member.banned_at) {
      return (
        <span className="inline-flex items-center gap-1" style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-body)', color: '#FFFFFF', backgroundColor: 'var(--status-error)' }}>
          <Ban size={10} /> Banned
        </span>
      );
    }
    if (member.suspended_until && new Date(member.suspended_until) > new Date()) {
      return (
        <span className="inline-flex items-center gap-1" style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-body)', color: 'var(--primary-foreground)', backgroundColor: 'var(--accent-primary)' }}>
          <Clock size={10} /> Suspended
        </span>
      );
    }
    if (member.is_admin) {
      return (
        <span className="inline-flex items-center gap-1" style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-body)', color: 'var(--primary-foreground)', backgroundColor: 'var(--status-success)' }}>
          <Shield size={10} /> Admin
        </span>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)' }}>
        Members ({total})
      </h2>

      {/* Search */}
      <div
        className="flex items-center gap-2"
        style={{
          padding: '8px 12px',
          borderRadius: 12,
          backgroundColor: 'var(--bg-surface)',
          maxWidth: 400,
        }}
      >
        <Search size={18} style={{ color: 'var(--text-secondary)' }} />
        <input
          type="text"
          placeholder="Search by username or name..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
          }}
        />
      </div>

      {/* Members list */}
      {loading ? (
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
          Loading...
        </p>
      ) : members.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
          No members found.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((member) => (
            <Link
              key={member.id}
              href={`/admin/members/${member.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div
                className="flex items-center gap-3"
                style={{
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: 'var(--bg-surface)',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface)'; }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    backgroundColor: 'var(--bg-elevated)',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.username}
                      style={{ width: 40, height: 40, objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--font-body)',
                        fontSize: 16,
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {member.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <div className="flex items-center gap-2">
                    <p style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 14,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      @{member.username}
                    </p>
                    {getStatusBadge(member)}
                    {member.is_restaurant && (
                      <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-elevated)' }}>
                        Restaurant
                      </span>
                    )}
                  </div>
                  <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                  }}>
                    {member.display_name ?? '—'} · Joined {new Date(member.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4" style={{ paddingTop: 8 }}>
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
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <ChevronLeft size={14} /> Previous
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
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
