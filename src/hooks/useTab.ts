import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const TAB_PATHS = {
  marketplace: '/',
  prices: '/prices',
  weather: '/weather',
  dashboard: '/dashboard',
  admin: '/admin',
} as const;

export type AppTab = keyof typeof TAB_PATHS;

/** Maps the router location to the nav "tab" concept used by Header/BottomNav. */
export function useTab() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const activeTab: AppTab =
    (Object.keys(TAB_PATHS) as AppTab[]).find(
      (k) => k !== 'marketplace' && pathname.startsWith(TAB_PATHS[k]),
    ) ?? 'marketplace';
  const setActiveTab = useCallback((tab: AppTab) => navigate(TAB_PATHS[tab]), [navigate]);
  return { activeTab, setActiveTab };
}
