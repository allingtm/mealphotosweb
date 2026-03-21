'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { NotificationPreferences } from '@/types/database';

const PREF_LABELS: Record<keyof NotificationPreferences, { label: string; description: string }> = {
  new_comment: { label: 'Comments', description: 'When someone comments on your dishes' },
  new_follower: { label: 'New followers', description: 'When someone follows you' },
  reaction_milestone: { label: 'Reaction milestones', description: 'When your dishes reach reaction milestones' },
  new_dish: { label: 'New dishes', description: 'When businesses you follow post new dishes' },
  dish_request_nearby: { label: 'Dish requests', description: 'When someone requests a dish in your area' },
  push_enabled: { label: 'Push notifications', description: 'Receive push notifications on this device' },
};

export default function NotificationPreferencesPage() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/notifications/preferences')
      .then((r) => r.json())
      .then((d) => setPrefs(d.preferences))
      .catch(() => {});
  }, []);

  async function togglePref(key: keyof NotificationPreferences) {
    if (!prefs) return;
    const newValue = !prefs[key];
    const previous = { ...prefs };
    setPrefs({ ...prefs, [key]: newValue });
    setSaving(key);

    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: newValue }),
      });
      if (!res.ok) setPrefs(previous);
    } catch {
      setPrefs(previous);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="flex flex-col md:overflow-y-auto md:flex-1 md:min-h-0">
      <div className="w-full px-4 pb-24" style={{ maxWidth: 960 }}>
        <div className="flex items-center gap-3 py-4">
          <button
            type="button"
            onClick={() => router.back()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            aria-label="Go back"
          >
            <ArrowLeft size={20} strokeWidth={1.5} style={{ color: 'var(--text-primary)' }} />
          </button>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 22,
            color: 'var(--text-primary)', margin: 0,
          }}>
            Notifications
          </h1>
        </div>

        {prefs && (
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
            {(Object.keys(PREF_LABELS) as (keyof NotificationPreferences)[]).map((key, i) => (
              <div key={key}>
                {i > 0 && <div style={{ height: 1, backgroundColor: 'var(--bg-elevated)', marginLeft: 16 }} />}
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-primary)' }}>
                      {PREF_LABELS[key].label}
                    </p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {PREF_LABELS[key].description}
                    </p>
                  </div>
                  <Switch
                    checked={prefs[key]}
                    onCheckedChange={() => togglePref(key)}
                    disabled={saving === key}
                    aria-label={PREF_LABELS[key].label}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
