import { useAuth } from '@/hooks/useAuth';
import { isMaster } from '@/lib/permissions';

export function useIsMaster(): boolean {
  const { user } = useAuth();
  return isMaster(user?.email);
}
