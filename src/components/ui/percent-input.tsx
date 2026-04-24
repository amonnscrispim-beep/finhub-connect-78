import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface PercentInputProps {
  value: number | string;
  /** Called once on blur with the committed numeric value. */
  onChange: (value: number) => void;
  /** Optional alias kept for backwards compatibility. */
  onCommit?: (value: number) => void;
  className?: string;
  id?: string;
  disabled?: boolean;
  decimals?: number;
  /** show "%" suffix on the right edge inside the wrapper */
  showSuffix?: boolean;
}

/**
 * Numeric input WITHOUT native number spinners.
 * - Fully local state while focused — no re-render thrash from parent updates.
 * - Commits the parsed number ONLY on blur (or Enter), so live validation
 *   in the parent never interrupts typing or steals focus.
 */
export function PercentInput({
  value,
  onChange,
  onCommit,
  className,
  id,
  disabled,
  decimals = 2,
  showSuffix = true,
}: PercentInputProps) {
  const formatDisplay = useCallback(
    (n: number) => (Number.isFinite(n) ? n.toFixed(decimals).replace('.', ',') : ''),
    [decimals],
  );

  const [text, setText] = useState<string>(() => formatDisplay(Number(value) || 0));
  const focusedRef = useRef(false);

  // Sync from parent ONLY when the input is not being edited.
  useEffect(() => {
    if (focusedRef.current) return;
    setText(formatDisplay(Number(value) || 0));
  }, [value, formatDisplay]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Permit digits, comma, dot, minus — purely local, no parent update.
    const raw = e.target.value.replace(/[^\d.,-]/g, '');
    setText(raw);
  };

  const commit = () => {
    const normalized = text.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized) || 0;
    setText(formatDisplay(num));
    onChange(num);
    onCommit?.(num);
  };

  return (
    <div className="relative inline-flex items-center w-full">
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        value={text}
        onChange={handleChange}
        onFocus={() => { focusedRef.current = true; }}
        onBlur={() => { focusedRef.current = false; commit(); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        disabled={disabled}
        className={cn(showSuffix && 'pr-7', className)}
      />
      {showSuffix && (
        <span className="pointer-events-none absolute right-2 text-xs text-muted-foreground">%</span>
      )}
    </div>
  );
}
