import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/Skeleton';
import type { UserRole } from '@/types';

/**
 * UX-only route guard. It hides screens the user should not see, but it is NOT security:
 * the Express API must authorize every request by the role inside the verified JWT.
 */
export function RequireRole({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Skeleton className="h-64" />;
  if (!user || !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
