import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface QuoteRequest {
  ticker: string;
  international?: boolean;
}

const REFRESH_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches current prices from Google Finance via edge function.
 * Returns a map of ticker (uppercased) -> price | null.
 * Auto-refreshes every 5 minutes.
 */
export function useGoogleFinanceQuotes(tickers: QuoteRequest[]) {
  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(false);
  const keyRef = useRef('');

  // Stable key based on ticker list to avoid refetch loops
  const key = tickers
    .map(t => `${t.ticker.toUpperCase()}:${t.international ? 'I' : 'B'}`)
    .sort()
    .join(',');

  useEffect(() => {
    if (!key) {
      setPrices({});
      return;
    }
    keyRef.current = key;

    let cancelled = false;

    const fetchPrices = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('fetch-google-finance', {
          body: { tickers },
        });
        if (cancelled || keyRef.current !== key) return;
        if (error) {
          console.error('[useGoogleFinanceQuotes]', error);
          return;
        }
        setPrices(data?.prices ?? {});
      } catch (e) {
        console.error('[useGoogleFinanceQuotes]', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPrices();
    const id = setInterval(fetchPrices, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { prices, loading };
}
