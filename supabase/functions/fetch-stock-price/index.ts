import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      tickers.map(async (item: { ticker: string; international: boolean }) => {
        try {
          const symbol = item.international ? item.ticker : `${item.ticker}.SA`;
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
          
          const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
          });
          
          if (!response.ok) {
            results[item.ticker] = null;
            return;
          }
          
          const data = await response.json();
          const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
          results[item.ticker] = price ?? null;
        } catch {
          results[item.ticker] = null;
        }
      })
    );

    return new Response(JSON.stringify({ prices: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
