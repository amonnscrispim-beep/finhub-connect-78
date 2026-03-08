import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tickers } = await req.json();
    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return new Response(JSON.stringify({ error: 'tickers array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: Record<string, number | null> = {};

    // Fetch in parallel, max 10 at a time
    const fetchQuote = async (ticker: string) => {
      try {
        // Determine if it's a Brazilian ticker (has digits) or international
        const isBR = /\d/.test(ticker) && !ticker.includes('.');
        const symbol = isBR ? `${ticker}.SA` : ticker;

        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });

        if (!res.ok) {
          results[ticker] = null;
          return;
        }

        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        const price = meta?.regularMarketPrice ?? null;
        results[ticker] = price ? Number(price) : null;
      } catch {
        results[ticker] = null;
      }
    };

    // Process in batches of 5
    for (let i = 0; i < tickers.length; i += 5) {
      const batch = tickers.slice(i, i + 5);
      await Promise.all(batch.map(fetchQuote));
    }

    return new Response(JSON.stringify({ quotes: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
