'use client';

import { useState, useRef } from 'react';
import { Plus, Camera, Pencil, Trash2, Loader2, GripVertical, X } from 'lucide-react';
import posthog from 'posthog-js';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BackButton } from '@/components/ui/BackButton';
import { DietaryBadge } from '@/components/ui/DietaryBadge';
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

interface ExtractedSection {
  name: string;
  items: { name: string; description?: string | null; price_pence?: number | null; dietary_tags?: string[] }[];
}

interface MenuManagerProps {
  sections: MenuSection[];
}

const DIETARY_OPTIONS = ['V', 'VG', 'GF', 'DF'] as const;

export function MenuManager({ sections: initialSections }: MenuManagerProps) {
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [sections, setSections] = useState<MenuSection[]>(initialSections);
  const [scanning, setScanning] = useState(false);

  // Add section
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  // Edit section
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSectionName, setEditSectionName] = useState('');

  // Add item
  const [showAddItem, setShowAddItem] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ name: '', price: '', description: '', dietary_tags: [] as string[], available: true });

  // Edit item
  const [editingItem, setEditingItem] = useState<{ sectionId: string; item: MenuItem } | null>(null);
  const [editItem, setEditItem] = useState({ name: '', price: '', description: '', dietary_tags: [] as string[], available: true });

  // Scan review
  const [scanResults, setScanResults] = useState<ExtractedSection[] | null>(null);
  const [savingScan, setSavingScan] = useState(false);

  // --- Section CRUD ---
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
      } else showToast(data.error || 'Failed to add section', 'error');
    } catch { showToast('Failed to add section', 'error'); }
  };

  const handleUpdateSection = async () => {
    if (!editingSectionId || !editSectionName.trim()) return;
    try {
      const res = await fetch('/api/businesses/menu/sections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingSectionId, name: editSectionName.trim() }),
      });
      if (res.ok) {
        setSections((prev) => prev.map((s) => s.id === editingSectionId ? { ...s, name: editSectionName.trim() } : s));
        setEditingSectionId(null);
      } else showToast('Failed to update section', 'error');
    } catch { showToast('Failed to update section', 'error'); }
  };

  const handleDeleteSection = async (id: string) => {
    try {
      const res = await fetch(`/api/businesses/menu/sections?id=${id}`, { method: 'DELETE' });
      if (res.ok) setSections((prev) => prev.filter((s) => s.id !== id));
      else showToast('Failed to delete section', 'error');
    } catch { showToast('Failed to delete section', 'error'); }
  };

  // --- Item CRUD ---
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
        setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, menu_items: [...s.menu_items, data.item] } : s));
        setNewItem({ name: '', price: '', description: '', dietary_tags: [], available: true });
        setShowAddItem(null);
      } else showToast(data.error || 'Failed to add item', 'error');
    } catch { showToast('Failed to add item', 'error'); }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    const { sectionId, item } = editingItem;
    try {
      const res = await fetch('/api/businesses/menu/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          name: editItem.name.trim(),
          description: editItem.description.trim() || null,
          price_pence: editItem.price ? Math.round(parseFloat(editItem.price) * 100) : null,
          dietary_tags: editItem.dietary_tags,
          available: editItem.available,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSections((prev) => prev.map((s) => s.id === sectionId ? {
          ...s,
          menu_items: s.menu_items.map((i) => i.id === item.id ? updated.item : i),
        } : s));
        setEditingItem(null);
      } else showToast('Failed to update item', 'error');
    } catch { showToast('Failed to update item', 'error'); }
  };

  const handleDeleteItem = async (sectionId: string, itemId: string) => {
    try {
      const res = await fetch(`/api/businesses/menu/items?id=${itemId}`, { method: 'DELETE' });
      if (res.ok) setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, menu_items: s.menu_items.filter((i) => i.id !== itemId) } : s));
      else showToast('Failed to delete item', 'error');
    } catch { showToast('Failed to delete item', 'error'); }
  };

  const openEditItem = (sectionId: string, item: MenuItem) => {
    setEditingItem({ sectionId, item });
    setEditItem({
      name: item.name,
      price: item.price_pence != null ? (item.price_pence / 100).toFixed(2) : '',
      description: item.description ?? '',
      dietary_tags: [...item.dietary_tags],
      available: item.available,
    });
  };

  // --- DnD reorder ---
  const handleDragEndSections = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(sections, oldIndex, newIndex);
    setSections(reordered);
    reordered.forEach((section, i) => {
      fetch('/api/businesses/menu/sections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: section.id, sort_order: i }),
      });
    });
  };

  const handleDragEndItems = (sectionId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSections((prev) => prev.map((s) => {
      if (s.id !== sectionId) return s;
      const oldIndex = s.menu_items.findIndex((i) => i.id === active.id);
      const newIndex = s.menu_items.findIndex((i) => i.id === over.id);
      const reordered = arrayMove(s.menu_items, oldIndex, newIndex);
      reordered.forEach((item, i) => {
        fetch('/api/businesses/menu/items', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id, sort_order: i }),
        });
      });
      return { ...s, menu_items: reordered };
    }));
  };

  // --- AI Scan ---
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
      setScanResults(extracted.sections);
    } catch { showToast('Scan failed', 'error'); }
    finally { setScanning(false); if (scanInputRef.current) scanInputRef.current.value = ''; }
  };

  const updateScanSection = (si: number, name: string) => {
    setScanResults((prev) => prev?.map((s, i) => i === si ? { ...s, name } : s) ?? null);
  };

  const updateScanItem = (si: number, ii: number, field: string, value: string | number | null) => {
    setScanResults((prev) => prev?.map((s, i) => i === si ? {
      ...s,
      items: s.items.map((item, j) => j === ii ? { ...item, [field]: value } : item),
    } : s) ?? null);
  };

  const removeScanItem = (si: number, ii: number) => {
    setScanResults((prev) => prev?.map((s, i) => i === si ? { ...s, items: s.items.filter((_, j) => j !== ii) } : s).filter((s) => s.items.length > 0) ?? null);
  };

  const saveScanResults = async () => {
    if (!scanResults) return;
    setSavingScan(true);
    try {
      for (const section of scanResults) {
        const secRes = await fetch('/api/businesses/menu/sections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: section.name, sort_order: sections.length }),
        });
        const secData = await secRes.json();
        if (!secRes.ok) continue;
        const newItems: MenuItem[] = [];
        for (const item of section.items) {
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
      const totalItems = scanResults.reduce((sum, s) => sum + s.items.length, 0);
      posthog.capture('menu_scanned', { items_detected: totalItems });
      showToast(`Added ${totalItems} items from scan`, 'success');
      setScanResults(null);
    } catch { showToast('Failed to save scan results', 'error'); }
    finally { setSavingScan(false); }
  };

  // --- Tag toggle helpers ---
  const toggleNewItemTag = (tag: string) => {
    setNewItem((prev) => ({
      ...prev,
      dietary_tags: prev.dietary_tags.includes(tag) ? prev.dietary_tags.filter((t) => t !== tag) : [...prev.dietary_tags, tag],
    }));
  };

  const toggleEditItemTag = (tag: string) => {
    setEditItem((prev) => ({
      ...prev,
      dietary_tags: prev.dietary_tags.includes(tag) ? prev.dietary_tags.filter((t) => t !== tag) : [...prev.dietary_tags, tag],
    }));
  };

  return (
    <div className="flex flex-col md:overflow-y-auto md:flex-1 md:min-h-0">
      <div className="mx-auto w-full px-4 pb-24 max-w-xl md:max-w-none">
        {/* Header */}
        <div className="flex items-center gap-3 py-4">
          <BackButton />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)' }}>Manage Menu</h1>
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
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{scanning ? 'Scanning...' : 'Scan your menu'}</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>Take a photo and AI will digitise it</p>
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

        {/* Scan review */}
        {scanResults && (
          <div className="rounded-2xl p-4 mb-6" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--accent-primary)' }}>
            <h3 className="mb-3" style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
              Review scanned menu
            </h3>
            {scanResults.map((section, si) => (
              <div key={si} className="mb-4">
                <Input
                  value={section.name}
                  onChange={(e) => updateScanSection(si, e.target.value)}
                  className="mb-2 font-semibold"
                  placeholder="Section name"
                />
                {section.items.map((item, ii) => (
                  <div key={ii} className="flex items-center gap-2 py-1">
                    <input
                      value={item.name}
                      onChange={(e) => updateScanItem(si, ii, 'name', e.target.value)}
                      className="flex-1 bg-transparent border-b px-1 py-0.5"
                      style={{ borderColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none' }}
                    />
                    <input
                      value={item.price_pence ? (item.price_pence / 100).toFixed(2) : ''}
                      onChange={(e) => updateScanItem(si, ii, 'price_pence', e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null)}
                      placeholder="£"
                      className="w-16 bg-transparent border-b px-1 py-0.5 text-right"
                      style={{ borderColor: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none' }}
                    />
                    <button type="button" onClick={() => removeScanItem(si, ii)} className="p-0.5" style={{ color: 'var(--text-secondary)' }}>
                      <X size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            ))}
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setScanResults(null)}
                className="flex-1 rounded-xl py-2.5 font-semibold"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 14 }}
              >
                Discard
              </button>
              <button
                type="button"
                onClick={saveScanResults}
                disabled={savingScan}
                className="flex-1 rounded-xl py-2.5 font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', fontFamily: 'var(--font-body)', fontSize: 14 }}
              >
                {savingScan && <Loader2 size={16} className="animate-spin" />}
                Save to menu
              </button>
            </div>
          </div>
        )}

        {/* Current menu */}
        {sections.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Current Menu
            </h2>

            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEndSections}>
              <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                {sections.map((section) => (
                  <SortableSection key={section.id} id={section.id}>
                    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--bg-elevated)' }}>
                      {/* Section header */}
                      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--bg-elevated)' }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--text-primary)' }}>{section.name}</h3>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setShowAddItem(section.id)} className="p-1" style={{ color: 'var(--accent-primary)' }} aria-label="Add item">
                            <Plus size={18} strokeWidth={1.5} />
                          </button>
                          <button type="button" onClick={() => { setEditingSectionId(section.id); setEditSectionName(section.name); }} className="p-1" style={{ color: 'var(--text-secondary)' }} aria-label="Edit section">
                            <Pencil size={14} strokeWidth={1.5} />
                          </button>
                          <button type="button" onClick={() => handleDeleteSection(section.id)} className="p-1" style={{ color: 'var(--status-error)' }} aria-label="Delete section">
                            <Trash2 size={14} strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>

                      {/* Items with DnD */}
                      <DndContext collisionDetection={closestCenter} onDragEnd={(e) => handleDragEndItems(section.id, e)}>
                        <SortableContext items={section.menu_items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                          {section.menu_items.map((item) => (
                            <SortableItem key={item.id} id={item.id}>
                              <div className="flex items-start justify-between flex-1 min-w-0" style={{ opacity: item.available ? 1 : 0.5 }}>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{item.name}</span>
                                    {item.price_pence != null && (
                                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--accent-primary)' }}>{formatPrice(item.price_pence)}</span>
                                    )}
                                  </div>
                                  {item.dietary_tags.length > 0 && (
                                    <div className="flex gap-1 mt-0.5">
                                      {item.dietary_tags.map((tag) => <DietaryBadge key={tag} tag={tag} />)}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button type="button" onClick={() => openEditItem(section.id, item)} className="p-1" style={{ color: 'var(--text-secondary)' }} aria-label="Edit item">
                                    <Pencil size={12} strokeWidth={1.5} />
                                  </button>
                                  <button type="button" onClick={() => handleDeleteItem(section.id, item.id)} className="p-1" style={{ color: 'var(--text-secondary)' }} aria-label="Delete item">
                                    <Trash2 size={12} strokeWidth={1.5} />
                                  </button>
                                </div>
                              </div>
                            </SortableItem>
                          ))}
                        </SortableContext>
                      </DndContext>

                      {section.menu_items.length === 0 && (
                        <p className="px-4 py-3" style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>No items yet</p>
                      )}
                    </div>
                  </SortableSection>
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* Add Section Dialog */}
        <Dialog open={showAddSection} onOpenChange={setShowAddSection}>
          <DialogContent style={{ backgroundColor: 'var(--bg-surface)' }}>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)' }}>Add Section</DialogTitle>
            </DialogHeader>
            <Input value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} maxLength={50} placeholder="e.g. Starters, Mains, Desserts" autoFocus />
            <button type="button" onClick={handleAddSection} disabled={!newSectionName.trim()} className="w-full rounded-xl py-2.5 font-semibold transition-opacity disabled:opacity-40" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
              Add Section
            </button>
          </DialogContent>
        </Dialog>

        {/* Edit Section Dialog */}
        <Dialog open={!!editingSectionId} onOpenChange={(open) => { if (!open) setEditingSectionId(null); }}>
          <DialogContent style={{ backgroundColor: 'var(--bg-surface)' }}>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)' }}>Edit Section</DialogTitle>
            </DialogHeader>
            <Input value={editSectionName} onChange={(e) => setEditSectionName(e.target.value)} maxLength={50} autoFocus />
            <button type="button" onClick={handleUpdateSection} disabled={!editSectionName.trim()} className="w-full rounded-xl py-2.5 font-semibold transition-opacity disabled:opacity-40" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
              Save
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
                  <button key={tag} type="button" onClick={() => toggleNewItemTag(tag)} className="rounded-full px-3 py-1 text-sm font-medium transition-colors" style={{ backgroundColor: newItem.dietary_tags.includes(tag) ? 'var(--accent-primary)' : 'var(--bg-elevated)', color: newItem.dietary_tags.includes(tag) ? 'var(--bg-primary)' : 'var(--text-secondary)' }}>
                    {tag}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-primary)' }}>Available</span>
                <Switch checked={newItem.available} onCheckedChange={(checked) => setNewItem((p) => ({ ...p, available: checked }))} />
              </div>
              <button type="button" onClick={() => showAddItem && handleAddItem(showAddItem)} disabled={!newItem.name.trim()} className="w-full rounded-xl py-2.5 font-semibold transition-opacity disabled:opacity-40" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                Add Item
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Item Dialog */}
        <Dialog open={!!editingItem} onOpenChange={(open) => { if (!open) setEditingItem(null); }}>
          <DialogContent style={{ backgroundColor: 'var(--bg-surface)' }}>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)' }}>Edit Item</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <Input value={editItem.name} onChange={(e) => setEditItem((p) => ({ ...p, name: e.target.value }))} maxLength={100} placeholder="Item name" />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }}>£</span>
                <Input type="number" value={editItem.price} onChange={(e) => setEditItem((p) => ({ ...p, price: e.target.value }))} placeholder="Price" step="0.01" min="0" className="pl-7" />
              </div>
              <Textarea value={editItem.description} onChange={(e) => setEditItem((p) => ({ ...p, description: e.target.value }))} maxLength={200} placeholder="Description (optional)" rows={2} />
              <div className="flex gap-2">
                {DIETARY_OPTIONS.map((tag) => (
                  <button key={tag} type="button" onClick={() => toggleEditItemTag(tag)} className="rounded-full px-3 py-1 text-sm font-medium transition-colors" style={{ backgroundColor: editItem.dietary_tags.includes(tag) ? 'var(--accent-primary)' : 'var(--bg-elevated)', color: editItem.dietary_tags.includes(tag) ? 'var(--bg-primary)' : 'var(--text-secondary)' }}>
                    {tag}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-primary)' }}>Available</span>
                <Switch checked={editItem.available} onCheckedChange={(checked) => setEditItem((p) => ({ ...p, available: checked }))} />
              </div>
              <button type="button" onClick={handleUpdateItem} disabled={!editItem.name.trim()} className="w-full rounded-xl py-2.5 font-semibold transition-opacity disabled:opacity-40" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                Save Changes
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// --- Sortable wrappers ---

function SortableSection({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="flex items-start gap-1">
        <div {...listeners} className="pt-4 cursor-grab" style={{ color: 'var(--text-secondary)' }}>
          <GripVertical size={16} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} {...attributes} className="px-4 py-2.5" >
      <div className="flex items-center gap-2" style={{ borderBottom: '1px solid var(--bg-elevated)' }}>
        <div {...listeners} className="cursor-grab shrink-0" style={{ color: 'var(--text-secondary)' }}>
          <GripVertical size={14} strokeWidth={1.5} />
        </div>
        {children}
      </div>
    </div>
  );
}
