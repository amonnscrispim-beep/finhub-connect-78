import { useState, useEffect, useCallback } from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface PercentInputProps {
  value: number | string;
  onChange: (value: number) => void;
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
 * - Accepts comma or dot as decimal separator while typing.
 * - Emits a number through onChange (live) and onCommit (on blur).
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

  useEffect(() => {
    const num = Number(value) || 0;
    setText(formatDisplay(num));
  }, [value, formatDisplay]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    // Allow only digits, comma, dot, minus
    raw = raw.replace(/[^\d.,-]/g, '');
    setText(raw);
    const normalized = raw.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    if (!Number.isNaN(num)) onChange(num);
    else if (raw === '' || raw === '-') onChange(0);
  };

  const handleBlur = () => {
    const normalized = text.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized) || 0;
    setText(formatDisplay(num));
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
        onBlur={handleBlur}
        disabled={disabled}
        className={cn(showSuffix && 'pr-7', className)}
      />
      {showSuffix && (
        <span className="pointer-events-none absolute right-2 text-xs text-muted-foreground">%</span>
      )}
    </div>
  );
}
