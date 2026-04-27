import { useAuth } from '@/hooks/useAuth';

const MASTER_EMAILS = ['amonncrispimufrj@gmail.com', 'amonnscrispim@gmail.com'];

export function useIsMaster(): boolean {
  const { user } = useAuth();
  const result = !!user?.email && MASTER_EMAILS.includes(user.email);
  console.log('[useIsMaster] email:', user?.email, 'isMaster:', result);
  return result;
}
