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
  /** Show "R$" prefix inside the input. Defaults to true. */
  showPrefix?: boolean;
  onBlur?: () => void;
}

// Format number to Brazilian currency display (with R$ prefix)
export const formatCurrencyBR = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Format number for display (without currency symbol)
export const formatNumberBR = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Parse Brazilian currency string back to number
export const parseCurrencyBR = (value: string): number => {
  if (!value) return 0;
  const cleaned = value
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Build a real-time BRL mask from raw user input.
 * Strategy: extract only digits, treat the last 2 as cents, and format the rest with thousand separators.
 * Examples while typing:
 *   "1"        -> "R$ 0,01"
 *   "100"      -> "R$ 1,00"
 *   "1000000"  -> "R$ 10.000,00"
 *   ""         -> ""
 */
function maskBRL(raw: string): { display: string; numeric: number } {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return { display: '', numeric: 0 };
  const numeric = parseInt(digits, 10) / 100;
  const display = formatCurrencyBR(numeric);
  return { display, numeric };
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = 'R$ 0,00',
  className,
  id,
  disabled,
  showPrefix = true,
  onBlur,
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const lastEmittedRef = useRef<string>('');

  // Sync display when external value changes (and we didn't just emit it)
  useEffect(() => {
    const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value || 0;
    const expectedDisplay = numValue > 0 ? formatCurrencyBR(numValue) : '';
    // Avoid clobbering the user's in-progress typing if external value matches what we last emitted
    if (lastEmittedRef.current && parseCurrencyBR(lastEmittedRef.current) === numValue) {
      return;
    }
    setDisplayValue(expectedDisplay);
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { display, numeric } = maskBRL(e.target.value);
      setDisplayValue(display);
      lastEmittedRef.current = display;
      onChange(numeric.toString());
    },
    [onChange],
  );

  const handleBlurInternal = useCallback(() => {
    onBlur?.();
  }, [onBlur]);

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlurInternal}
      placeholder={showPrefix ? placeholder : placeholder.replace(/R\$\s?/, '')}
      className={cn('crm-input', className)}
      disabled={disabled}
    />
  );
}
