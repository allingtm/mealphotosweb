'use client';

import { Minus, Plus } from 'lucide-react';

type Period = { open: string; close: string };
type OpeningHours = Record<string, Period[]> | null;

interface OpeningHoursEditorProps {
  value: OpeningHours;
  onChange: (hours: OpeningHours) => void;
  labelStyle?: React.CSSProperties;
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
  thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

const timeInputStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid var(--bg-elevated)',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)',
  fontSize: 14,
};

const iconBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  borderRadius: 8,
  border: '1px solid var(--bg-elevated)',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  flexShrink: 0,
};

/** Sort periods by open time and clamp overlaps so each period starts after the previous one ends. */
function normalise(periods: Period[]): Period[] {
  const sorted = [...periods].sort((a, b) => a.open.localeCompare(b.open));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].open < sorted[i - 1].close) {
      sorted[i] = { ...sorted[i], open: sorted[i - 1].close };
    }
    // If clamping made open >= close, push close 30 min after open
    if (sorted[i].open >= sorted[i].close) {
      const [h, m] = sorted[i].open.split(':').map(Number);
      const mins = Math.min(h * 60 + m + 30, 23 * 60 + 59);
      sorted[i] = { ...sorted[i], close: `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}` };
    }
  }
  // Also ensure each individual period has open < close
  return sorted.map((p) => {
    if (p.open >= p.close) {
      const [h, m] = p.open.split(':').map(Number);
      const mins = Math.min(h * 60 + m + 30, 23 * 60 + 59);
      return { ...p, close: `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}` };
    }
    return p;
  });
}

export default function OpeningHoursEditor({ value, onChange, labelStyle }: OpeningHoursEditorProps) {
  const updateDay = (day: string, periods: Period[] | null) => {
    const updated = { ...value };
    if (periods === null || periods.length === 0) {
      delete updated[day];
    } else {
      updated[day] = normalise(periods);
    }
    onChange(Object.keys(updated).length > 0 ? updated : null);
  };

  return (
    <div>
      {labelStyle && <span style={labelStyle}>Opening Hours</span>}
      <div className="flex flex-col gap-3 mt-1">
        {DAYS.map((day) => {
          const periods = value?.[day];
          const isClosed = !periods || periods.length === 0;
          return (
            <div key={day} className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <span style={{ width: 80, fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
                  {DAY_LABELS[day]}
                </span>
                <label className="flex items-center gap-1" style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={isClosed}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateDay(day, null);
                      } else {
                        updateDay(day, [{ open: '09:00', close: '17:00' }]);
                      }
                    }}
                  />
                  Closed
                </label>
              </div>
              {!isClosed && (
                <div className="flex flex-col gap-1" style={{ marginLeft: 80 + 12 }}>
                  {periods.map((period, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={period.open}
                        aria-label={`${DAY_LABELS[day]} period ${idx + 1} opening time`}
                        onChange={(e) => {
                          const updated = [...periods];
                          updated[idx] = { ...period, open: e.target.value };
                          updateDay(day, updated);
                        }}
                        style={timeInputStyle}
                      />
                      <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>–</span>
                      <input
                        type="time"
                        value={period.close}
                        aria-label={`${DAY_LABELS[day]} period ${idx + 1} closing time`}
                        onChange={(e) => {
                          const updated = [...periods];
                          updated[idx] = { ...period, close: e.target.value };
                          updateDay(day, updated);
                        }}
                        style={timeInputStyle}
                      />
                      {periods.length > 1 && (
                        <button
                          type="button"
                          aria-label={`Remove period ${idx + 1} for ${DAY_LABELS[day]}`}
                          onClick={() => {
                            const updated = periods.filter((_, i) => i !== idx);
                            updateDay(day, updated);
                          }}
                          style={iconBtnStyle}
                        >
                          <Minus size={14} strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  ))}
                  {(() => {
                    const lastClose = periods[periods.length - 1]?.close ?? '17:00';
                    const [h, m] = lastClose.split(':').map(Number);
                    const startMins = h * 60 + m + 60; // 1 hour gap
                    const canAdd = startMins + 60 <= 24 * 60; // need at least 1 hour for new period
                    const newOpen = `${String(Math.floor(startMins / 60)).padStart(2, '0')}:${String(startMins % 60).padStart(2, '0')}`;
                    const endMins = Math.min(startMins + 4 * 60, 23 * 60 + 59); // 4 hours or end of day
                    const newClose = `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;
                    return canAdd ? (
                      <button
                        type="button"
                        onClick={() => updateDay(day, [...periods, { open: newOpen, close: newClose }])}
                        className="flex items-center gap-1"
                        style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}
                      >
                        <Plus size={12} strokeWidth={1.5} />
                        Add period
                      </button>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
