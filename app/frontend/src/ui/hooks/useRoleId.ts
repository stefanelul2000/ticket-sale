import { useAuth } from '../../state/useAuth';

export function useRoleId() {
  const { user } = useAuth();
  return user?.role?.id ?? user?.role_id ?? 0;
}
