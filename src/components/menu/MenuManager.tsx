'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Camera, Pencil, Trash2, Loader2 } from 'lucide-react';
import posthog from 'posthog-js';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BackButton } from '@/components/ui/BackButton';
import { showToast } from '@/components/ui/Toast';
import { formatPrice } from '@/lib/utils';

interface MenuSection {
  id: string;
  name: string;
  sort_order: number;
  menu_items: MenuItem[];
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price_pence: number | null;
  dietary_tags: string[];
  photo_url: string | null;
  reaction_count: number;
  available: boolean;
}

interface MenuManagerProps {
  sections: MenuSection[];
}

const DIETARY_OPTIONS = ['V', 'VG', 'GF', 'DF'] as const;

export function MenuManager({ sections: initialSections }: MenuManagerProps) {
  const router = useRouter();
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [sections, setSections] = useState<MenuSection[]>(initialSections);
  const [scanning, setScanning] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [showAddItem, setShowAddItem] = useState<string | null>(null); // section ID
  const [newSectionName, setNewSectionName] = useState('');
  const [newItem, setNewItem] = useState({ name: '', price: '', description: '', dietary_tags: [] as string[], available: true });

  // Add section
  const handleAddSection = async () => {
    if (!newSectionName.trim()) return;
    try {
      const res = await fetch('/api/businesses/menu/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSectionName.trim(), sort_order: sections.length }),
      });
      const data = await res.json();
      if (res.ok) {
        setSections((prev) => [...prev, { ...data.section, menu_items: [] }]);
        setNewSectionName('');
        setShowAddSection(false);
      } else {
        showToast(data.error || 'Failed to add section', 'error');
      }
    } catch { showToast('Failed to add section', 'error'); }
  };

  // Delete section
  const handleDeleteSection = async (id: string) => {
    try {
      const res = await fetch(`/api/businesses/menu/sections?id=${id}`, { method: 'DELETE' });
      if (res.ok) setSections((prev) => prev.filter((s) => s.id !== id));
      else showToast('Failed to delete section', 'error');
    } catch { showToast('Failed to delete section', 'error'); }
  };

  // Add item
  const handleAddItem = async (sectionId: string) => {
    if (!newItem.name.trim()) return;
    try {
      const res = await fetch('/api/businesses/menu/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_id: sectionId,
          name: newItem.name.trim(),
          description: newItem.description.trim() || undefined,
          price_pence: newItem.price ? Math.round(parseFloat(newItem.price) * 100) : undefined,
          dietary_tags: newItem.dietary_tags,
          available: newItem.available,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSections((prev) => prev.map((s) =>
          s.id === sectionId ? { ...s, menu_items: [...s.menu_items, data.item] } : s
        ));
        setNewItem({ name: '', price: '', description: '', dietary_tags: [], available: true });
        setShowAddItem(null);
      } else {
        showToast(data.error || 'Failed to add item', 'error');
      }
    } catch { showToast('Failed to add item', 'error'); }
  };

  // Delete item
  const handleDeleteItem = async (sectionId: string, itemId: string) => {
    try {
      const res = await fetch(`/api/businesses/menu/items?id=${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        setSections((prev) => prev.map((s) =>
          s.id === sectionId ? { ...s, menu_items: s.menu_items.filter((i) => i.id !== itemId) } : s
        ));
      } else showToast('Failed to delete item', 'error');
    } catch { showToast('Failed to delete item', 'error'); }
  };

  // AI scan
  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showToast('Image must be under 10MB', 'error'); return; }

    setScanning(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/businesses/menu/scan', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) { showToast(data.error || 'Scan failed', 'error'); return; }

      const extracted = data.extracted;
      if (!extracted?.sections?.length) { showToast('No menu items detected', 'info'); return; }

      // Save all extracted sections and items
      for (const section of extracted.sections) {
        const secRes = await fetch('/api/businesses/menu/sections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: section.name, sort_order: sections.length }),
        });
        const secData = await secRes.json();
        if (!secRes.ok) continue;

        const newItems: MenuItem[] = [];
        for (const item of section.items ?? []) {
          const itemRes = await fetch('/api/businesses/menu/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              section_id: secData.section.id,
              name: item.name,
              description: item.description || undefined,
              price_pence: item.price_pence || undefined,
              dietary_tags: item.dietary_tags ?? [],
            }),
          });
          const itemData = await itemRes.json();
          if (itemRes.ok) newItems.push(itemData.item);
        }

        setSections((prev) => [...prev, { ...secData.section, menu_items: newItems }]);
      }

      const totalItems = extracted.sections.reduce((sum: number, s: { items?: unknown[] }) => sum + (s.items?.length ?? 0), 0);
      posthog.capture('menu_scanned', { items_detected: totalItems });
      showToast(`Added ${totalItems} items from scan`, 'success');
    } catch { showToast('Scan failed', 'error'); }
    finally { setScanning(false); if (scanInputRef.current) scanInputRef.current.value = ''; }
  };

  const toggleTag = (tag: string) => {
    setNewItem((prev) => ({
      ...prev,
      dietary_tags: prev.dietary_tags.includes(tag)
        ? prev.dietary_tags.filter((t) => t !== tag)
        : [...prev.dietary_tags, tag],
    }));
  };

  return (
    <div className="flex flex-col md:overflow-y-auto md:flex-1 md:min-h-0">
      <div className="mx-auto w-full px-4 pb-24" style={{ maxWidth: 600 }}>
        {/* Header */}
        <div className="flex items-center gap-3 py-4">
          <BackButton />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)' }}>
            Manage Menu
          </h1>
        </div>

        {/* Action cards */}
        <div className="flex flex-col gap-3 mb-6">
          <button
            type="button"
            onClick={() => scanInputRef.current?.click()}
            disabled={scanning}
            className="flex items-center gap-3 rounded-2xl p-4 text-left transition-colors"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--bg-elevated)' }}
          >
            {scanning ? <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent-primary)' }} /> : <Camera size={24} style={{ color: 'var(--accent-primary)' }} />}
            <div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                {scanning ? 'Scanning...' : 'Scan your menu'}
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
                Take a photo and AI will digitise it
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setShowAddSection(true)}
            className="flex items-center gap-3 rounded-2xl p-4 text-left transition-colors"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--bg-elevated)' }}
          >
            <Pencil size={24} style={{ color: 'var(--accent-primary)' }} />
            <div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Add manually</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>Create sections and items one by one</p>
            </div>
          </button>
        </div>

        <input ref={scanInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleScan} className="hidden" />

        {/* Current menu */}
        {sections.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Current Menu
            </h2>

            {sections.map((section) => (
              <div key={section.id} className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--bg-elevated)' }}>
                {/* Section header */}
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--bg-elevated)' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--text-primary)' }}>{section.name}</h3>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setShowAddItem(section.id)} className="p-1" style={{ color: 'var(--accent-primary)' }} aria-label="Add item">
                      <Plus size={18} strokeWidth={1.5} />
                    </button>
                    <button type="button" onClick={() => handleDeleteSection(section.id)} className="p-1" style={{ color: 'var(--status-error)' }} aria-label="Delete section">
                      <Trash2 size={16} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                {/* Items */}
                {section.menu_items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between px-4 py-2.5" style={{ borderBottom: '1px solid var(--bg-elevated)', opacity: item.available ? 1 : 0.5 }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{item.name}</span>
                        {item.price_pence != null && (
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--accent-primary)' }}>{formatPrice(item.price_pence)}</span>
                        )}
                      </div>
                      {item.dietary_tags.length > 0 && (
                        <div className="flex gap-1 mt-0.5">
                          {item.dietary_tags.map((tag) => (
                            <span key={tag} className="rounded-full px-1.5 py-0.5" style={{ fontSize: 10, fontWeight: 600, backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => handleDeleteItem(section.id, item.id)} className="p-1 shrink-0" style={{ color: 'var(--text-secondary)' }} aria-label="Delete item">
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                ))}

                {section.menu_items.length === 0 && (
                  <p className="px-4 py-3" style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
                    No items yet
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add Section Dialog */}
        <Dialog open={showAddSection} onOpenChange={setShowAddSection}>
          <DialogContent style={{ backgroundColor: 'var(--bg-surface)' }}>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)' }}>Add Section</DialogTitle>
            </DialogHeader>
            <Input
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              maxLength={50}
              placeholder="e.g. Starters, Mains, Desserts"
              autoFocus
            />
            <button
              type="button"
              onClick={handleAddSection}
              disabled={!newSectionName.trim()}
              className="w-full rounded-xl py-2.5 font-semibold transition-opacity disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', fontFamily: 'var(--font-body)', fontSize: 14 }}
            >
              Add Section
            </button>
          </DialogContent>
        </Dialog>

        {/* Add Item Dialog */}
        <Dialog open={!!showAddItem} onOpenChange={(open) => { if (!open) setShowAddItem(null); }}>
          <DialogContent style={{ backgroundColor: 'var(--bg-surface)' }}>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)' }}>Add Item</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <Input value={newItem.name} onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))} maxLength={100} placeholder="Item name" />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }}>£</span>
                <Input type="number" value={newItem.price} onChange={(e) => setNewItem((p) => ({ ...p, price: e.target.value }))} placeholder="Price" step="0.01" min="0" className="pl-7" />
              </div>
              <Textarea value={newItem.description} onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))} maxLength={200} placeholder="Description (optional)" rows={2} />
              <div className="flex gap-2">
                {DIETARY_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className="rounded-full px-3 py-1 text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: newItem.dietary_tags.includes(tag) ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                      color: newItem.dietary_tags.includes(tag) ? 'var(--bg-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-primary)' }}>Available</span>
                <Switch checked={newItem.available} onCheckedChange={(checked) => setNewItem((p) => ({ ...p, available: checked }))} />
              </div>
              <button
                type="button"
                onClick={() => showAddItem && handleAddItem(showAddItem)}
                disabled={!newItem.name.trim()}
                className="w-full rounded-xl py-2.5 font-semibold transition-opacity disabled:opacity-40"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', fontFamily: 'var(--font-body)', fontSize: 14 }}
              >
                Add Item
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
