import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';

interface DebouncedInputProps extends Omit<React.ComponentProps<'input'>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
}

export function DebouncedInput({ value, onChange, debounceMs = 400, ...props }: DebouncedInputProps) {
  const [local, setLocal] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Sync external value only if it differs from what we last sent
  const lastSentRef = useRef(value);
  useEffect(() => {
    if (value !== lastSentRef.current) {
      setLocal(value);
      lastSentRef.current = value;
    }
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setLocal(v);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      lastSentRef.current = v;
      onChangeRef.current(v);
    }, debounceMs);
  }, [debounceMs]);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  return <Input {...props} value={local} onChange={handleChange} />;
}
