import { useAuth } from '@/hooks/useAuth';

const MASTER_EMAIL = 'amonncrispimufrj@gmail.com';

export function useIsMaster(): boolean {
  const { user } = useAuth();
  const result = user?.email === MASTER_EMAIL;
  console.log('[useIsMaster] email:', user?.email, 'isMaster:', result);
  return result;
}
