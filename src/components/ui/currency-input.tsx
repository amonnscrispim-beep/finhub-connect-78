import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface CurrencyInputProps {
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

// ============================================================
// Brazilian currency mask (integer-cents model)
// User types digits → treated as cents → divided by 100
//   1     → R$ 0,01
//   100   → R$ 1,00
//   1000  → R$ 10,00
//   100000 → R$ 1.000,00
// ============================================================

const brFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format a number as "R$ 1.000,00" */
export const formatCurrencyBR = (value: number): string => {
  const safe = Number.isFinite(value) ? value : 0;
  return `R$ ${brFormatter.format(safe)}`;
};

/** Parse "R$ 1.000,00" or "1.000,00" or "1000.50" → number */
export const parseCurrencyBR = (value: string): number => {
  if (!value) return 0;
  const cleaned = value
    .replace(/R\$\s?/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Format number without R$ prefix — kept for backwards compatibility. */
export const formatNumberBR = (value: number): string => brFormatter.format(value || 0);

/** Convert a numeric value (e.g. 1234.5) to its "raw digits" representation in cents (e.g. "123450"). */
const numberToDigits = (value: number): string => {
  if (!value || !Number.isFinite(value) || value <= 0) return '';
  return Math.round(value * 100).toString();
};

/** Convert raw digit string (cents) back to number. */
const digitsToNumber = (digits: string): number => {
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
};

/** Format raw digits as "R$ 1.000,00". */
const formatDigits = (digits: string): string => {
  if (!digits) return '';
  return formatCurrencyBR(digitsToNumber(digits));
};

export function CurrencyInput({
  value,
  onChange,
  placeholder = 'R$ 0,00',
  className,
  id,
  disabled,
  onBlur,
  onFocus,
}: CurrencyInputProps) {
  // Source of truth while focused: raw digit string (cents).
  const [digits, setDigits] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync from external value when not focused (avoid fighting user input).
  useEffect(() => {
    if (isFocused) return;
    const numValue = typeof value === 'string' ? parseCurrencyBR(value) || parseFloat(value) || 0 : value || 0;
    setDigits(numberToDigits(numValue));
  }, [value, isFocused]);

  const display = isFocused
    ? digits
      ? formatDigits(digits)
      : ''
    : digits
      ? formatDigits(digits)
      : '';

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      // Select all so the next keystroke replaces the value.
      requestAnimationFrame(() => {
        e.target.select();
      });
      onFocus?.(e);
    },
    [onFocus],
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      const numValue = digitsToNumber(digits);
      // Persist as plain number string ("1234.5") so callers can parseFloat freely.
      onChange(numValue ? numValue.toString() : '0');
      onBlur?.(e);
    },
    [digits, onChange, onBlur],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Strip everything but digits — that's our source of truth.
      const onlyDigits = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
      setDigits(onlyDigits);
      // Surface the live numeric value to the parent (compatible with existing callers).
      const numValue = digitsToNumber(onlyDigits);
      onChange(numValue ? numValue.toString() : '0');
    },
    [onChange],
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Backspace removes the last digit cleanly even though the visible string is formatted.
    if (e.key === 'Backspace') {
      e.preventDefault();
      setDigits((prev) => {
        const next = prev.slice(0, -1);
        const numValue = digitsToNumber(next);
        onChange(numValue ? numValue.toString() : '0');
        return next;
      });
    }
  }, [onChange]);

  return (
    <Input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={cn('crm-input', className)}
      disabled={disabled}
    />
  );
}
