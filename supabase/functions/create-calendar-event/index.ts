import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MeetingRequest {
  clientId?: string;
  clientName: string;
  clientEmail?: string;
  title: string;
  description?: string;
  startAt: string; // ISO string
  endAt: string;   // ISO string
  timezone?: string;
}

async function getAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<string | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token'
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Failed to refresh access token:', data);
      return null;
    }

    return data.access_token;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return null;
  }
}

async function createGoogleCalendarEvent(
  accessToken: string,
  event: {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    attendees?: { email: string }[];
  }
): Promise<{ id: string } | null> {
  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Failed to create Google Calendar event:', data);
      return null;
    }

    console.log('Google Calendar event created:', data.id);
    return { id: data.id };
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log('Creating meeting for user:', userId);

    // Parse request body
    const body: MeetingRequest = await req.json();
    
    if (!body.clientName || !body.title || !body.startAt || !body.endAt) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: clientName, title, startAt, endAt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const timezone = body.timezone || 'America/Sao_Paulo';

    // Save meeting to database first. Google Calendar is optional and must not block persistence.
    const { data: meetingData, error: meetingError } = await supabase
      .from('crm_meetings')
      .insert({
        user_id: userId,
        client_id: body.clientId || null,
        client_name: body.clientName,
        client_email: body.clientEmail || null,
        title: body.title,
        description: body.description || null,
        start_at: body.startAt,
        end_at: body.endAt,
        timezone
      })
      .select()
      .single();

    if (meetingError) {
      console.error('Error saving meeting:', meetingError);
      return new Response(
        JSON.stringify({ error: 'Failed to save meeting' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Meeting saved to database:', meetingData.id);

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.warn('Google OAuth not configured; meeting saved without Google event');
      return new Response(
        JSON.stringify({ meeting: meetingData, googleEventCreated: false }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role to read the OAuth tokens (bypass RLS for read)
    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if user has connected Google Calendar
    const { data: oauthData, error: oauthError } = await adminSupabase
      .from('user_google_oauth')
      .select('refresh_token, google_email')
      .eq('user_id', userId)
      .single();

    if (oauthError || !oauthData) {
      console.log('User has not connected Google Calendar');
      return new Response(
        JSON.stringify({ 
          error: 'Google Calendar not connected',
          code: 'GOOGLE_NOT_CONNECTED',
          message: 'Você precisa conectar sua conta do Google Agenda antes de agendar reuniões.'
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save meeting to database first
    const { data: meetingData, error: meetingError } = await supabase
      .from('crm_meetings')
      .insert({
        user_id: userId,
        client_id: body.clientId || null,
        client_name: body.clientName,
        client_email: body.clientEmail || null,
        title: body.title,
        description: body.description || null,
        start_at: body.startAt,
        end_at: body.endAt,
        timezone
      })
      .select()
      .single();

    if (meetingError) {
      console.error('Error saving meeting:', meetingError);
      return new Response(
        JSON.stringify({ error: 'Failed to save meeting' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Meeting saved to database:', meetingData.id);

    // Get fresh access token
    const accessToken = await getAccessToken(oauthData.refresh_token, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

    if (!accessToken) {
      // Token refresh failed - likely invalid_grant
      console.error('Failed to get access token - user may need to reconnect');
      return new Response(
        JSON.stringify({ 
          meeting: meetingData,
          warning: 'Meeting saved but failed to create Google Calendar event. Please reconnect your Google account.',
          code: 'GOOGLE_TOKEN_INVALID'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Google Calendar event
    const calendarEvent = {
      summary: body.title,
      description: body.description || `Reunião com ${body.clientName}`,
      start: {
        dateTime: body.startAt,
        timeZone: timezone
      },
      end: {
        dateTime: body.endAt,
        timeZone: timezone
      },
      attendees: body.clientEmail ? [{ email: body.clientEmail }] : undefined
    };

    const googleEvent = await createGoogleCalendarEvent(accessToken, calendarEvent);

    if (googleEvent) {
      // Update meeting with Google event ID
      await supabase
        .from('crm_meetings')
        .update({ google_event_id: googleEvent.id })
        .eq('id', meetingData.id);

      console.log('Google Calendar event linked:', googleEvent.id);
    } else {
      console.warn('Failed to create Google Calendar event, but meeting was saved');
    }

    return new Response(
      JSON.stringify({ 
        meeting: { ...meetingData, google_event_id: googleEvent?.id },
        googleEventCreated: !!googleEvent
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-calendar-event:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
