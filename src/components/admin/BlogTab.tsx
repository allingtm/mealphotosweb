'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { showToast } from '@/components/ui/Toast';
import { ConfirmDialog } from './ConfirmDialog';
import { generateSlug } from '@/lib/utils';
import { useTheme } from '@/components/providers/ThemeProvider';
import type { BlogPost, BlogTag } from '@/types/database';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

// Shared input styles
const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 36,
  padding: '0 10px',
  borderRadius: 8,
  border: '1px solid var(--bg-elevated)',
  backgroundColor: 'var(--bg-elevated)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)',
  fontSize: 13,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontFamily: 'var(--font-body)',
  color: 'var(--text-secondary)',
};

const btnPrimary: React.CSSProperties = {
  height: 36,
  padding: '0 16px',
  borderRadius: 8,
  backgroundColor: 'var(--accent-primary)',
  color: 'var(--bg-primary)',
  fontFamily: 'var(--font-body)',
  fontSize: 13,
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  height: 36,
  padding: '0 16px',
  borderRadius: 8,
  backgroundColor: 'var(--bg-elevated)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)',
  fontSize: 13,
  border: 'none',
  cursor: 'pointer',
};

interface PostWithTags extends BlogPost {
  tags: BlogTag[];
  author?: { display_name: string | null; username: string };
}

export function BlogTab() {
  const { theme } = useTheme();
  const [resolvedColorMode, setResolvedColorMode] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setResolvedColorMode(isDark ? 'dark' : 'light');
    } else {
      setResolvedColorMode(theme);
    }
  }, [theme]);

  const [posts, setPosts] = useState<PostWithTags[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'true' | 'false'>('all');
  const perPage = 20;

  // Edit state
  const [editing, setEditing] = useState<PostWithTags | null>(null);
  const [creating, setCreating] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlugValue] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [ogImageId, setOgImageId] = useState<string | null>(null);
  const [ogImageUrl, setOgImageUrl] = useState<string | null>(null);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [published, setPublished] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Tag creation
  const [newTagName, setNewTagName] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<PostWithTags | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/blog?page=${page}&per_page=${perPage}&published=${filter}`);
      if (res.ok) {
        const json = await res.json();
        setPosts(json.data ?? []);
        setTotal(json.total ?? 0);
      }
    } catch {
      showToast('Failed to load blog posts', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/blog/tags');
      if (res.ok) {
        const json = await res.json();
        setTags(json.data ?? []);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);
  useEffect(() => { fetchTags(); }, [fetchTags]);

  const resetForm = () => {
    setTitle('');
    setSlugValue('');
    setSlugManual(false);
    setContent('');
    setExcerpt('');
    setOgImageId(null);
    setOgImageUrl(null);
    setMetaTitle('');
    setMetaDescription('');
    setPublished(false);
    setFeatured(false);
    setSelectedTagIds([]);
  };

  const openCreate = () => {
    resetForm();
    setEditing(null);
    setCreating(true);
  };

  const openEdit = async (post: PostWithTags) => {
    // Fetch full post with content
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`);
      if (!res.ok) { showToast('Failed to load post', 'error'); return; }
      const json = await res.json();
      const full = json.data as PostWithTags;

      setTitle(full.title);
      setSlugValue(full.slug);
      setSlugManual(true);
      setContent(full.content);
      setExcerpt(full.excerpt ?? '');
      setOgImageId(full.og_image_id);
      setOgImageUrl(full.og_image_url);
      setMetaTitle(full.meta_title ?? '');
      setMetaDescription(full.meta_description ?? '');
      setPublished(full.published);
      setFeatured(full.featured);
      setSelectedTagIds((full.tags ?? []).map(t => t.id));
      setEditing(full);
      setCreating(true);
    } catch {
      showToast('Failed to load post', 'error');
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      showToast('Title and content are required', 'error');
      return;
    }

    setSaving(true);
    try {
      const body = {
        title,
        slug: slug || undefined,
        content,
        excerpt: excerpt || null,
        og_image_id: ogImageId,
        og_image_url: ogImageUrl,
        meta_title: metaTitle || null,
        meta_description: metaDescription || null,
        published,
        featured,
        tag_ids: selectedTagIds,
      };

      const res = editing
        ? await fetch(`/api/admin/blog/${editing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch('/api/admin/blog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

      if (res.ok) {
        showToast(editing ? 'Post updated' : 'Post created', 'success');
        setCreating(false);
        resetForm();
        setEditing(null);
        fetchPosts();
      } else {
        const data = await res.json();
        showToast(data.error ?? 'Failed to save', 'error');
      }
    } catch {
      showToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/blog/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Post deleted', 'success');
        setDeleteTarget(null);
        fetchPosts();
      } else {
        showToast('Failed to delete', 'error');
      }
    } catch {
      showToast('Failed to delete', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload-image', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setOgImageId(data.imageId);
        setOgImageUrl(data.url);
        showToast('Image uploaded', 'success');
      } else {
        const data = await res.json();
        showToast(data.error ?? 'Upload failed', 'error');
      }
    } catch {
      showToast('Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setCreatingTag(true);
    try {
      const res = await fetch('/api/admin/blog/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        setTags(prev => [...prev, json.data].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedTagIds(prev => [...prev, json.data.id]);
        setNewTagName('');
        showToast('Tag created', 'success');
      } else {
        const data = await res.json();
        showToast(data.error ?? 'Failed to create tag', 'error');
      }
    } catch {
      showToast('Failed to create tag', 'error');
    } finally {
      setCreatingTag(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      const res = await fetch(`/api/admin/blog/tags/${tagId}`, { method: 'DELETE' });
      if (res.ok) {
        setTags(prev => prev.filter(t => t.id !== tagId));
        setSelectedTagIds(prev => prev.filter(id => id !== tagId));
        showToast('Tag deleted', 'success');
      }
    } catch {
      showToast('Failed to delete tag', 'error');
    }
  };

  const totalPages = Math.ceil(total / perPage);

  // --- Form view ---
  if (creating) {
    return (
      <div className="flex flex-col gap-4" style={{ paddingBottom: 80 }}>
        <button
          type="button"
          onClick={() => { setCreating(false); resetForm(); setEditing(null); }}
          style={{ ...btnSecondary, width: 'fit-content' }}
        >
          &larr; Back to list
        </button>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)' }}>
          {editing ? 'Edit Post' : 'New Post'}
        </h2>

        {/* Title */}
        <div className="flex flex-col gap-1">
          <label style={labelStyle}>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugManual) setSlugValue(generateSlug(e.target.value));
            }}
            placeholder="Blog post title"
            maxLength={200}
            style={inputStyle}
          />
        </div>

        {/* Slug */}
        <div className="flex flex-col gap-1">
          <label style={labelStyle}>Slug</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => { setSlugValue(e.target.value); setSlugManual(true); }}
            placeholder="auto-generated-from-title"
            maxLength={100}
            style={inputStyle}
          />
        </div>

        {/* Markdown editor */}
        <div className="flex flex-col gap-1">
          <label style={labelStyle}>Content</label>
          <div data-color-mode={resolvedColorMode}>
            <MDEditor
              value={content}
              onChange={(val) => setContent(val ?? '')}
              height={400}
            />
          </div>
        </div>

        {/* Excerpt */}
        <div className="flex flex-col gap-1">
          <label style={labelStyle}>Excerpt</label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Short summary for listing cards"
            maxLength={500}
            rows={3}
            style={{ ...inputStyle, height: 'auto', padding: '8px 10px' }}
          />
        </div>

        {/* OG Image */}
        <div className="flex flex-col gap-1">
          <label style={labelStyle}>OG Image</label>
          <div className="flex items-center gap-3">
            <label
              style={{
                ...btnSecondary,
                display: 'inline-flex',
                alignItems: 'center',
                opacity: uploading ? 0.5 : 1,
                cursor: uploading ? 'wait' : 'pointer',
              }}
            >
              {uploading ? 'Uploading...' : 'Upload Image'}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
            </label>
            {ogImageUrl && (
              <div className="flex items-center gap-2">
                <img
                  src={ogImageUrl}
                  alt="OG preview"
                  style={{ width: 80, height: 45, objectFit: 'cover', borderRadius: 6 }}
                />
                <button
                  type="button"
                  onClick={() => { setOgImageId(null); setOgImageUrl(null); }}
                  style={{ ...btnSecondary, padding: '0 8px', height: 28, fontSize: 11, color: 'var(--status-error)' }}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-col gap-2">
          <label style={labelStyle}>Tags</label>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => {
              const selected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    setSelectedTagIds(prev =>
                      selected ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                    );
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontFamily: 'var(--font-body)',
                    fontWeight: selected ? 600 : 400,
                    border: selected ? '1px solid var(--accent-primary)' : '1px solid var(--bg-elevated)',
                    backgroundColor: selected ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                    color: selected ? 'var(--bg-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="New tag name"
              maxLength={50}
              style={{ ...inputStyle, width: 160 }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateTag(); } }}
            />
            <button
              type="button"
              onClick={handleCreateTag}
              disabled={creatingTag || !newTagName.trim()}
              style={{ ...btnSecondary, opacity: creatingTag || !newTagName.trim() ? 0.5 : 1 }}
            >
              {creatingTag ? '...' : '+ Add'}
            </button>
          </div>
        </div>

        {/* SEO */}
        <div className="flex flex-col gap-1" style={{ marginTop: 8 }}>
          <label style={{ ...labelStyle, fontWeight: 600, fontSize: 13 }}>SEO</label>
        </div>
        <div className="flex flex-col gap-1">
          <label style={labelStyle}>Meta Title</label>
          <input
            type="text"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            placeholder="Override page title for search engines (max 120)"
            maxLength={120}
            style={inputStyle}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label style={labelStyle}>Meta Description</label>
          <textarea
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            placeholder="Override description for search engines (max 320)"
            maxLength={320}
            rows={2}
            style={{ ...inputStyle, height: 'auto', padding: '8px 10px' }}
          />
        </div>

        {/* Toggles */}
        <div className="flex gap-6 items-center" style={{ marginTop: 8 }}>
          <label className="flex items-center gap-2" style={{ ...labelStyle, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              style={{ accentColor: 'var(--accent-primary)' }}
            />
            Published
          </label>
          <label className="flex items-center gap-2" style={{ ...labelStyle, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              style={{ accentColor: 'var(--accent-primary)' }}
            />
            Featured
          </label>
        </div>

        {/* Save buttons */}
        <div className="flex gap-3" style={{ marginTop: 8 }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{ ...btnPrimary, opacity: saving ? 0.5 : 1, cursor: saving ? 'wait' : 'pointer' }}
          >
            {saving ? 'Saving...' : editing ? 'Update Post' : published ? 'Publish' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={() => { setCreating(false); resetForm(); setEditing(null); }}
            style={btnSecondary}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // --- List view ---
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)' }}>
          Blog Posts
        </h2>
        <button type="button" onClick={openCreate} style={btnPrimary}>
          + New Post
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'true', 'false'] as const).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => { setFilter(f); setPage(1); }}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontFamily: 'var(--font-body)',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: filter === f ? 'var(--accent-primary)' : 'var(--bg-elevated)',
              color: filter === f ? 'var(--bg-primary)' : 'var(--text-secondary)',
              fontWeight: filter === f ? 600 : 400,
            }}
          >
            {f === 'all' ? 'All' : f === 'true' ? 'Published' : 'Drafts'}
          </button>
        ))}
      </div>

      {/* Tag management */}
      <div style={{ padding: 12, borderRadius: 12, backgroundColor: 'var(--bg-surface)' }}>
        <p style={{ ...labelStyle, fontWeight: 600, marginBottom: 8 }}>Tags</p>
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <span
              key={tag.id}
              className="flex items-center gap-1"
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: 12,
                fontFamily: 'var(--font-body)',
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
              }}
            >
              {tag.name}
              <button
                type="button"
                onClick={() => handleDeleteTag(tag.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--status-error)',
                  cursor: 'pointer',
                  fontSize: 14,
                  lineHeight: 1,
                  padding: 0,
                  marginLeft: 2,
                }}
              >
                &times;
              </button>
            </span>
          ))}
          {tags.length === 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
              No tags yet
            </span>
          )}
        </div>
      </div>

      {/* Posts list */}
      {loading ? (
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 14 }}>Loading...</p>
      ) : posts.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 14 }}>No blog posts yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {posts.map(post => (
            <div
              key={post.id}
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {post.featured && (
                      <span style={{
                        padding: '2px 6px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                        fontFamily: 'var(--font-body)', backgroundColor: 'var(--accent-primary)',
                        color: 'var(--bg-primary)', textTransform: 'uppercase',
                      }}>
                        Featured
                      </span>
                    )}
                    <span style={{
                      padding: '2px 6px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                      fontFamily: 'var(--font-body)', textTransform: 'uppercase',
                      backgroundColor: post.published ? 'var(--status-success)' : 'var(--bg-elevated)',
                      color: post.published ? '#121212' : 'var(--text-secondary)',
                    }}>
                      {post.published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
                    {post.title}
                  </p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    /blog/{post.slug}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 4 }}>
                    {(post.tags ?? []).map(tag => (
                      <span
                        key={tag.id}
                        style={{
                          padding: '2px 6px', borderRadius: 4, fontSize: 10,
                          fontFamily: 'var(--font-body)', backgroundColor: 'var(--bg-elevated)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-secondary)' }}>
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(post)}
                    style={{ ...btnSecondary, height: 30, fontSize: 12, padding: '0 10px' }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(post)}
                    style={{
                      ...btnSecondary, height: 30, fontSize: 12, padding: '0 10px',
                      color: 'var(--status-error)',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ ...btnSecondary, opacity: page === 1 ? 0.3 : 1 }}
          >
            &larr; Prev
          </button>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ ...btnSecondary, opacity: page === totalPages ? 0.3 : 1 }}
          >
            Next &rarr;
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Blog Post"
        message={deleteTarget ? `Are you sure you want to delete "${deleteTarget.title}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
