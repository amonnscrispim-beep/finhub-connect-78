import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface GoogleOAuthStatus {
  isConnected: boolean;
  googleEmail: string | null;
  isLoading: boolean;
}

interface MeetingData {
  clientId?: string;
  clientName: string;
  clientEmail?: string;
  title: string;
  description?: string;
  startAt: Date;
  endAt: Date;
  timezone?: string;
}

interface CreateMeetingResult {
  success: boolean;
  meeting?: unknown;
  googleEventCreated?: boolean;
  error?: string;
  needsConnection?: boolean;
}

export function useGoogleCalendar() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<GoogleOAuthStatus>({
    isConnected: false,
    googleEmail: null,
    isLoading: true
  });

  // Check if user has connected Google Calendar
  const checkConnection = useCallback(async () => {
    if (!user) {
      setStatus({ isConnected: false, googleEmail: null, isLoading: false });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_google_oauth')
        .select('google_email')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking Google connection:', error);
        setStatus({ isConnected: false, googleEmail: null, isLoading: false });
        return;
      }

      setStatus({
        isConnected: !!data,
        googleEmail: data?.google_email || null,
        isLoading: false
      });
    } catch (error) {
      console.error('Error checking Google connection:', error);
      setStatus({ isConnected: false, googleEmail: null, isLoading: false });
    }
  }, [user]);

  const saveMeetingInCrm = useCallback(async (meeting: MeetingData): Promise<CreateMeetingResult> => {
    if (!user) {
      return { success: false, error: 'Não autenticado' };
    }

    const { data, error } = await supabase
      .from('crm_meetings')
      .insert({
        user_id: user.id,
        client_id: meeting.clientId || null,
        client_name: meeting.clientName,
        client_email: meeting.clientEmail || null,
        title: meeting.title,
        description: meeting.description || null,
        start_at: meeting.startAt.toISOString(),
        end_at: meeting.endAt.toISOString(),
        timezone: meeting.timezone || 'America/Sao_Paulo',
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving CRM meeting directly:', error);
      return { success: false, error: 'Erro ao salvar reunião no CRM' };
    }

    queryClient.invalidateQueries({ queryKey: ['crm_meetings'] });
    return { success: true, meeting: data, googleEventCreated: false };
  }, [user, queryClient]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Handle URL parameters for OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const googleStatus = urlParams.get('google');
    const googleError = urlParams.get('google_error');

    if (googleStatus === 'connected') {
      toast.success('Google Agenda conectada com sucesso!');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      checkConnection();
    } else if (googleError) {
      const errorMessages: Record<string, string> = {
        'access_denied': 'Acesso negado. Você precisa autorizar o acesso ao Google Agenda.',
        'state_expired': 'A sessão expirou. Por favor, tente novamente.',
        'token_exchange_failed': 'Falha na autenticação. Por favor, tente novamente.',
        'database_error': 'Erro ao salvar conexão. Por favor, tente novamente.',
        'internal_error': 'Erro interno. Por favor, tente novamente.'
      };
      toast.error(errorMessages[googleError] || `Erro: ${googleError}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [checkConnection]);

  // Start OAuth flow
  const connect = useCallback(async () => {
    if (!session?.access_token) {
      toast.error('Você precisa estar logado para conectar o Google Agenda.');
      return;
    }

    try {
      // Pass the full URL so callback can redirect properly
      const returnUrl = window.location.origin + window.location.pathname + window.location.search;
      
      const { data, error } = await supabase.functions.invoke('google-calendar-connect', {
        body: { returnUrl },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Error starting OAuth:', error);
        toast.error('Erro ao iniciar conexão com Google Agenda.');
        return;
      }

      if (data?.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Error connecting to Google:', error);
      toast.error('Erro ao conectar com Google Agenda.');
    }
  }, [session]);

  // Disconnect Google Calendar
  const disconnect = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_google_oauth')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error disconnecting Google:', error);
        toast.error('Erro ao desconectar Google Agenda.');
        return;
      }

      setStatus({ isConnected: false, googleEmail: null, isLoading: false });
      toast.success('Google Agenda desconectada.');
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Erro ao desconectar Google Agenda.');
    }
  }, [user]);

  // Create a meeting with Google Calendar integration
  const createMeeting = useCallback(async (meeting: MeetingData): Promise<CreateMeetingResult> => {
    if (!status.isConnected) {
      return saveMeetingInCrm(meeting);
    }

    if (!session?.access_token) {
      return saveMeetingInCrm(meeting);
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-calendar-event', {
        body: {
          clientId: meeting.clientId,
          clientName: meeting.clientName,
          clientEmail: meeting.clientEmail,
          title: meeting.title,
          description: meeting.description,
          startAt: meeting.startAt.toISOString(),
          endAt: meeting.endAt.toISOString(),
          timezone: meeting.timezone || 'America/Sao_Paulo'
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Error creating meeting:', error);
        return saveMeetingInCrm(meeting);
      }

      if (data?.code === 'GOOGLE_NOT_CONNECTED') {
        queryClient.invalidateQueries({ queryKey: ['crm_meetings'] });
        return {
          success: true,
          meeting: data.meeting,
          googleEventCreated: false
        };
      }

      if (data?.code === 'GOOGLE_TOKEN_INVALID') {
        toast.warning('Reunião salva, mas não foi possível criar evento no Google Agenda. Reconecte sua conta.');
        queryClient.invalidateQueries({ queryKey: ['crm_meetings'] });
        return { 
          success: true, 
          meeting: data.meeting,
          googleEventCreated: false 
        };
      }

      queryClient.invalidateQueries({ queryKey: ['crm_meetings'] });
      return { 
        success: true, 
        meeting: data.meeting,
        googleEventCreated: data.googleEventCreated 
      };
    } catch (error) {
      console.error('Error creating meeting:', error);
      return saveMeetingInCrm(meeting);
    }
  }, [session, queryClient, saveMeetingInCrm, status.isConnected]);

  return {
    ...status,
    connect,
    disconnect,
    createMeeting,
    refetch: checkConnection
  };
}
