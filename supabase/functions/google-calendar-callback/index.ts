import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('Missing Google OAuth credentials');
      return new Response('Google OAuth not configured', { status: 500 });
    }

    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const stateParam = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return new Response(null, {
        status: 302,
        headers: { 'Location': '/?google_error=' + encodeURIComponent(error) }
      });
    }

    if (!code || !stateParam) {
      console.error('Missing code or state');
      return new Response('Missing authorization code or state', { status: 400 });
    }

    // Decode and validate state (signed envelope)
    let envelope;
    try {
      envelope = JSON.parse(atob(stateParam));
    } catch (e) {
      console.error('Invalid state format:', e);
      return new Response('Invalid state', { status: 400 });
    }

    const { data: stateData, sig } = envelope || {};
    if (!stateData || !sig) {
      console.error('State missing data or signature');
      return new Response('Invalid state', { status: 400 });
    }

    // Verify HMAC signature
    const secret = SUPABASE_SERVICE_ROLE_KEY;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sigBytes = Uint8Array.from(atob(sig), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      new TextEncoder().encode(JSON.stringify(stateData))
    );
    if (!valid) {
      console.error('Invalid state signature - possible tampering');
      return new Response(null, {
        status: 302,
        headers: { 'Location': '/?google_error=invalid_state' }
      });
    }

    const { userId, returnUrl, exp } = stateData;

    // Check expiration
    if (!exp || Date.now() > exp) {
      console.error('State expired');
      return new Response(null, {
        status: 302,
        headers: { 'Location': '/?google_error=state_expired' }
      });
    }

    if (!userId) {
      console.error('No user ID in state');
      return new Response('Invalid state: missing user ID', { status: 400 });
    }

    console.log('Processing callback for user:', userId);

    // Exchange code for tokens
    const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-callback`;
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.refresh_token) {
      console.error('Token exchange failed:', tokenData);
      return new Response(null, {
        status: 302,
        headers: { 'Location': '/?google_error=token_exchange_failed' }
      });
    }

    console.log('Token exchange successful, got refresh token');

    // Get user email from Google
    let googleEmail = null;
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
      });
      
      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        googleEmail = userInfo.email;
        console.log('Got Google email:', googleEmail);
      }
    } catch (e) {
      console.error('Error getting user info:', e);
    }

    // Save to database using service role (bypasses RLS for upsert)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error: upsertError } = await supabase
      .from('user_google_oauth')
      .upsert({
        user_id: userId,
        google_email: googleEmail,
        refresh_token: tokenData.refresh_token,
        scope: tokenData.scope || null,
        token_type: tokenData.token_type || 'Bearer',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Database error:', upsertError);
      return new Response(null, {
        status: 302,
        headers: { 'Location': '/?google_error=database_error' }
      });
    }

    console.log('OAuth tokens saved successfully');

    // Redirect back to the app - validate returnUrl against allowlist
    const ALLOWED_ORIGINS = [
      'https://finhub-connect-78.lovable.app',
      'https://id-preview--deeca564-47f8-41b0-9377-28804c48eb94.lovable.app',
    ];
    const FRONTEND_FALLBACK = 'https://finhub-connect-78.lovable.app';

    let successUrl = returnUrl || '/';

    // If returnUrl is just a path (starts with /), prefix with fallback frontend URL
    if (successUrl.startsWith('/')) {
      successUrl = FRONTEND_FALLBACK + successUrl;
    }

    // Enforce allowlist - reject any URL not on a known origin
    const isAllowed = ALLOWED_ORIGINS.some(origin => successUrl.startsWith(origin + '/') || successUrl === origin);
    if (!isAllowed) {
      console.warn('Rejected returnUrl not in allowlist:', successUrl);
      successUrl = FRONTEND_FALLBACK + '/';
    }

    // Add success parameter
    successUrl = successUrl + (successUrl.includes('?') ? '&' : '?') + 'google=connected';
    
    return new Response(null, {
      status: 302,
      headers: { 'Location': successUrl }
    });

  } catch (error) {
    console.error('Error in google-calendar-callback:', error);
    return new Response(null, {
      status: 302,
      headers: { 'Location': '/?google_error=internal_error' }
    });
  }
});
