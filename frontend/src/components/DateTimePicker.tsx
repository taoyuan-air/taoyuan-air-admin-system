import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  onClearErr?: () => void;
}

const baseInputStyle = {
  flex: 1,
  padding: '9px 8px',
  border: 'none',
  outline: 'none',
  fontSize: 13,
  color: '#374151',
  backgroundColor: 'transparent',
  minWidth: 0,
  width: '100%',
  boxSizing: 'border-box' as const,
};

const pad2 = (n: number) => String(n).padStart(2, '0');

const toLocalDatetimeValue = (date: Date, hour: number, minute: number) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(hour)}:${pad2(minute)}`;

const parseLocalDatetime = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
};

const formatDatetimeLabel = (value: string) => {
  const parsed = parseLocalDatetime(value);
  if (!parsed) return '';

  return `${parsed.year}/${pad2(parsed.month)}/${pad2(parsed.day)} ${pad2(parsed.hour)}:${pad2(parsed.minute)}`;
};

const buildCalendarDays = (monthDate: Date) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const start = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
};

export default function DateTimePicker({
  value,
  onChange,
  error,
  onClearErr,
}: DateTimePickerProps) {
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const parsed = parseLocalDatetime(value);
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(() => {
    const initial = parsed
      ? new Date(parsed.year, parsed.month - 1, 1)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    return initial;
  });

  const selectedDate = parsed ? new Date(parsed.year, parsed.month - 1, parsed.day) : null;
  const hour = parsed?.hour ?? now.getHours();
  const minute = parsed?.minute ?? 0;
  const days = buildCalendarDays(viewMonth);
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const selectedKey = selectedDate
    ? `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`
    : '';

  const commit = (date: Date, nextHour = hour, nextMinute = minute) => {
    onChange(toLocalDatetimeValue(date, nextHour, nextMinute));
    onClearErr?.();
  };

  const commitTime = (nextHour: number, nextMinute: number) => {
    commit(selectedDate ?? now, nextHour, nextMinute);
  };

  const shiftMonth = (amount: number) => {
    setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + amount, 1));
  };

  const toggleOpen = () => {
    if (!open) {
      const target = parsed
        ? new Date(parsed.year, parsed.month - 1, 1)
        : new Date(now.getFullYear(), now.getMonth(), 1);
      setViewMonth(target);
    }
    setOpen(prev => !prev);
    setFocused(true);
  };

  const setNow = () => {
    const current = new Date();
    setViewMonth(new Date(current.getFullYear(), current.getMonth(), 1));
    commit(current, current.getHours(), current.getMinutes());
  };

  const clearValue = () => {
    onChange('');
    onClearErr?.();
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={toggleOpen}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          border: `1px solid ${error ? '#e57373' : focused || open ? '#6abe74' : 'rgba(0,0,0,0.12)'}`,
          borderRadius: 8,
          backgroundColor: '#fff',
          boxShadow: focused || open ? '0 0 0 2px rgba(106,190,116,0.2)' : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          padding: '9px 10px',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <Calendar size={14} color="#6abe74" />
        <span
          style={{
            ...baseInputStyle,
            padding: 0,
            color: value ? '#374151' : '#aaa',
            fontWeight: value ? 600 : 400,
          }}
        >
          {formatDatetimeLabel(value) || '選擇日期與時間'}
        </span>
        {value && (
          <span
            role="button"
            tabIndex={0}
            aria-label="清除時間"
            onClick={event => {
              event.stopPropagation();
              clearValue();
            }}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                clearValue();
              }
            }}
            style={{
              width: 20,
              height: 20,
              borderRadius: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
              backgroundColor: 'rgba(0,0,0,0.04)',
              flexShrink: 0,
            }}
          >
            <X size={12} />
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            marginTop: 8,
            padding: 12,
            borderRadius: 14,
            backgroundColor: '#fff',
            border: '1px solid rgba(106,190,116,0.2)',
            boxShadow: '0 10px 28px rgba(0,0,0,0.12)',
            position: 'relative',
            zIndex: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
              {viewMonth.getFullYear()} 年 {viewMonth.getMonth() + 1} 月
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { icon: <ChevronLeft size={14} />, onClick: () => shiftMonth(-1), label: '上一個月' },
                { icon: <ChevronRight size={14} />, onClick: () => shiftMonth(1), label: '下一個月' },
              ].map(btn => (
                <button
                  key={btn.label}
                  type="button"
                  aria-label={btn.label}
                  onClick={btn.onClick}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: '1px solid rgba(0,0,0,0.08)',
                    backgroundColor: '#fff',
                    color: '#666',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  {btn.icon}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {['日', '一', '二', '三', '四', '五', '六'].map(day => (
              <div key={day} style={{ textAlign: 'center', fontSize: 11, color: '#999', fontWeight: 700, padding: '4px 0' }}>
                {day}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {days.map(date => {
              const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
              const isSelected = key === selectedKey;
              const isToday = key === todayKey;
              const muted = date.getMonth() !== viewMonth.getMonth();

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  className={`date-time-picker-day${isSelected ? ' is-selected' : ''}`}
                  onClick={() => commit(date)}
                  style={{
                    height: 30,
                    borderRadius: 8,
                    border: isToday && !isSelected ? '1px solid rgba(106,190,116,0.45)' : '1px solid transparent',
                    backgroundColor: isSelected ? '#6abe74' : isToday ? 'rgba(106,190,116,0.08)' : 'transparent',
                    color: isSelected ? '#fff' : muted ? '#aaa' : '#374151',
                    fontSize: 12,
                    fontWeight: isSelected || isToday ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: '1px solid rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#666', fontSize: 12, fontWeight: 600 }}>
              <Clock size={14} color="#6abe74" />
              時間
              <input
                type="number"
                min={0}
                max={23}
                value={pad2(hour)}
                onChange={event => commitTime(Math.min(23, Math.max(0, Number(event.target.value))), minute)}
                style={{
                  width: 48,
                  padding: '7px 8px',
                  borderRadius: 8,
                  border: '1px solid rgba(0,0,0,0.1)',
                  outline: 'none',
                  fontSize: 13,
                  color: '#374151',
                  fontWeight: 700,
                }}
              />
              <span style={{ color: '#aaa' }}>:</span>
              <input
                type="number"
                min={0}
                max={59}
                step={5}
                value={pad2(minute)}
                onChange={event => commitTime(hour, Math.min(59, Math.max(0, Number(event.target.value))))}
                style={{
                  width: 48,
                  padding: '7px 8px',
                  borderRadius: 8,
                  border: '1px solid rgba(0,0,0,0.1)',
                  outline: 'none',
                  fontSize: 13,
                  color: '#374151',
                  fontWeight: 700,
                }}
              />
            </div>
            <div
              style={{
                marginLeft: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={setNow}
                style={{
                  padding: 0,
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#4a9e55',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                設為現在
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 9,
                  border: 'none',
                  backgroundColor: '#6abe74',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .date-time-picker-day {
          transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }

        .date-time-picker-day:hover {
          background-color: rgba(106,190,116,0.1) !important;
          border-color: rgba(106,190,116,0.45) !important;
          color: #2d6a4f !important;
        }

        .date-time-picker-day.is-selected:hover {
          background-color: #6abe74 !important;
          color: #fff !important;
        }
      `}</style>
    </div>
  );
}
