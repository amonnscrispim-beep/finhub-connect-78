const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchPrice(ticker: string, international: boolean): Promise<number | null> {
  const symbol = international ? ticker : `${ticker}:BVMF`;
  // International tickers default to NASDAQ; if it fails, try NYSE
  const exchanges = international ? [`${ticker}:NASDAQ`, `${ticker}:NYSE`] : [symbol];

  for (const sym of exchanges) {
    try {
      const url = `https://www.google.com/finance/quote/${sym}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      if (!res.ok) continue;
      const html = await res.text();

      // Try data-last-price first
      const dataMatch = html.match(/data-last-price="([\d.]+)"/);
      if (dataMatch) {
        const n = parseFloat(dataMatch[1]);
        if (!isNaN(n) && n > 0) return n;
      }

      // Fallback: YMlKec fxKbKc class — value like "R$ 68,50" or "$68.50"
      const classMatch = html.match(/class="YMlKec fxKbKc"[^>]*>([^<]+)</);
      if (classMatch) {
        const raw = classMatch[1].replace(/[^\d.,-]/g, '');
        // BR format uses comma as decimal
        const normalized = raw.includes(',') && !raw.includes('.')
          ? raw.replace(',', '.')
          : raw.replace(/\.(?=\d{3})/g, '').replace(',', '.');
        const n = parseFloat(normalized);
        if (!isNaN(n) && n > 0) return n;
      }
    } catch {
      // try next exchange
    }
  }
  return null;
}

Deno.serve(async (req) => {
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

    await Promise.all(
      tickers.map(async (item: { ticker: string; international?: boolean }) => {
        const t = String(item.ticker || '').trim().toUpperCase();
        if (!t) return;
        results[t] = await fetchPrice(t, !!item.international);
      })
    );

    return new Response(JSON.stringify({ prices: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
