import { useAuth } from '@/hooks/useAuth';

const MASTER_EMAIL = 'amoncrispimufrj@gmail.com';

export function useIsMaster(): boolean {
  const { user } = useAuth();
  return user?.email === MASTER_EMAIL;
}
