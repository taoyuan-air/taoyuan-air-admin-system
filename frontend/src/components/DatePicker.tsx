import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isClearable?: boolean;
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

const pad2 = (n: number) => String(n).padStart(2, '0');

const toDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const parseDateInput = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

const formatDateLabel = (value: string) => {
  const date = parseDateInput(value);
  if (!date) return '';

  return `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`;
};

const buildCalendarDays = (monthDate: Date) => {
  const startOffset = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay();
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
};

export default function DatePicker({
  value,
  onChange,
  placeholder = '選擇日期',
  isClearable = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const selectedDate = parseDateInput(value);
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(() => {
    const initial = selectedDate ?? today;
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });
  const days = buildCalendarDays(viewMonth);
  const selectedKey = selectedDate ? toDateInputValue(selectedDate) : '';
  const todayKey = toDateInputValue(today);

  const toggleOpen = () => {
    if (!open) {
      const target = selectedDate ?? today;
      setViewMonth(new Date(target.getFullYear(), target.getMonth(), 1));
    }
    setOpen(prev => !prev);
    setFocused(true);
  };

  const selectDate = (date: Date) => {
    onChange(toDateInputValue(date));
    setOpen(false);
  };

  const shiftMonth = (amount: number) => {
    setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + amount, 1));
  };

  const setToday = () => {
    const current = new Date();
    setViewMonth(new Date(current.getFullYear(), current.getMonth(), 1));
    onChange(toDateInputValue(current));
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
          minHeight: 38,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          border: `1px solid ${focused || open ? '#6abe74' : 'rgba(0,0,0,0.12)'}`,
          borderRadius: 8,
          backgroundColor: '#fff',
          boxShadow: focused || open ? '0 0 0 2px rgba(106,190,116,0.2)' : 'none',
          color: '#374151',
          padding: '8px 10px',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        <Calendar size={15} color="#6abe74" />
        <span style={{ flex: 1, fontSize: 14, fontWeight: value ? 600 : 400, color: value ? '#374151' : '#aaa' }}>
          {formatDateLabel(value) || placeholder}
        </span>
        {isClearable && value && (
          <span
            role="button"
            tabIndex={0}
            aria-label="清除日期"
            onClick={event => {
              event.stopPropagation();
              onChange('');
              setOpen(false);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                onChange('');
                setOpen(false);
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
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            width: 300,
            padding: 16,
            borderRadius: 14,
            backgroundColor: '#fff',
            border: '1px solid rgba(106,190,116,0.2)',
            boxShadow: '0 14px 34px rgba(45,106,79,0.16)',
            zIndex: 30,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#374151' }}>
              {viewMonth.getFullYear()} 年 {viewMonth.getMonth() + 1} 月
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { icon: <ChevronLeft size={16} />, onClick: () => shiftMonth(-1), label: '上一個月' },
                { icon: <ChevronRight size={16} />, onClick: () => shiftMonth(1), label: '下一個月' },
              ].map(btn => (
                <button
                  key={btn.label}
                  type="button"
                  aria-label={btn.label}
                  onClick={btn.onClick}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    border: '1px solid rgba(0,0,0,0.08)',
                    backgroundColor: '#fff',
                    color: '#4b5563',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  {btn.icon}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', columnGap: 5, rowGap: 5 }}>
            {WEEKDAY_LABELS.map(day => (
              <div
                key={day}
                style={{
                  height: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {day}
              </div>
            ))}

            {days.map(date => {
              const key = toDateInputValue(date);
              const isSelected = key === selectedKey;
              const isToday = key === todayKey;
              const muted = date.getMonth() !== viewMonth.getMonth();

              return (
                <button
                  key={key}
                  type="button"
                  className={`date-picker-day${isSelected ? ' is-selected' : ''}`}
                  onClick={() => selectDate(date)}
                  style={{
                    height: 31,
                    borderRadius: 8,
                    border: isSelected || isToday ? '1px solid rgba(106,190,116,0.45)' : '1px solid transparent',
                    backgroundColor: isSelected ? 'rgba(106,190,116,0.12)' : 'transparent',
                    color: muted ? '#aaa' : '#374151',
                    fontSize: 13,
                    fontWeight: isSelected || isToday ? 800 : 500,
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
              paddingTop: 10,
              borderTop: '1px solid rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: 12,
            }}
          >
            <button
              type="button"
              onClick={setToday}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                color: '#4a9e55',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              設為今天
            </button>
          </div>
        </div>
      )}

      <style>{`
        .date-picker-day {
          transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }

        .date-picker-day:hover {
          background-color: rgba(106,190,116,0.1) !important;
          border-color: rgba(106,190,116,0.45) !important;
          color: #2d6a4f !important;
        }

        .date-picker-day.is-selected:hover {
          background-color: rgba(106,190,116,0.16) !important;
        }
      `}</style>
    </div>
  );
}
