import { useState, useEffect, useCallback } from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface CurrencyInputProps {
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

// Format number to Brazilian currency display
export const formatCurrencyBR = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Parse Brazilian currency string back to number
export const parseCurrencyBR = (value: string): number => {
  if (!value) return 0;
  // Remove currency symbol, spaces, and thousands separators
  const cleaned = value
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// Format number for display (without currency symbol, just formatted)
export const formatNumberBR = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export function CurrencyInput({
  value,
  onChange,
  placeholder = 'R$ 0,00',
  className,
  id,
  disabled,
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Convert the numeric value to display format when not focused
  useEffect(() => {
    if (!isFocused) {
      const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value || 0;
      if (numValue > 0) {
        setDisplayValue(formatCurrencyBR(numValue));
      } else {
        setDisplayValue('');
      }
    }
  }, [value, isFocused]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // Show raw number on focus for easier editing
    const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value || 0;
    if (numValue > 0) {
      setDisplayValue(numValue.toString());
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Parse and format the value on blur
    const numValue = parseFloat(displayValue) || 0;
    onChange(numValue.toString());
    if (numValue > 0) {
      setDisplayValue(formatCurrencyBR(numValue));
    } else {
      setDisplayValue('');
    }
  }, [displayValue, onChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Allow only numbers and decimal point while typing
    const sanitized = inputValue.replace(/[^\d.,]/g, '');
    setDisplayValue(sanitized);
    
    // Also update the parent with the numeric value
    const numValue = parseFloat(sanitized.replace(',', '.')) || 0;
    onChange(numValue.toString());
  }, [onChange]);

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={cn('crm-input', className)}
      disabled={disabled}
    />
  );
}
