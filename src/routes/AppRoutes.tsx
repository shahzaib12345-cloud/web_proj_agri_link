import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/Skeleton';
import { RequireRole } from './guards';
import type { ProduceListing } from '@/types';

const MarketplaceView = lazy(() =>
  import('@/features/market/MarketplaceView').then((m) => ({ default: m.MarketplaceView })),
);
const PriceBoardView = lazy(() =>
  import('@/features/market/PriceBoardView').then((m) => ({ default: m.PriceBoardView })),
);
const WeatherAdvicePage = lazy(() =>
  import('@/features/weather/WeatherAdvicePage').then((m) => ({ default: m.WeatherAdvicePage })),
);
const FarmerDashboard = lazy(() =>
  import('@/features/farmer/FarmerDashboard').then((m) => ({ default: m.FarmerDashboard })),
);
const BuyerOffersView = lazy(() =>
  import('@/features/buyer/BuyerOffersView').then((m) => ({ default: m.BuyerOffersView })),
);
const AdminPanel = lazy(() =>
  import('@/features/admin/AdminPanel').then((m) => ({ default: m.AdminPanel })),
);

export interface RouteActions {
  onOpenListingDetail: (listing: ProduceListing) => void;
  onOpenMakeOffer: (listing: ProduceListing) => void;
  onOpenCreateListing: () => void;
}

function Dashboard({ actions }: { actions: RouteActions }) {
  const { user } = useAuth();
  if (user?.role === 'farmer')
    return <FarmerDashboard onOpenCreateListing={actions.onOpenCreateListing} />;
  return <BuyerOffersView onOpenMakeOffer={actions.onOpenMakeOffer} />;
}

export function AppRoutes({ actions }: { actions: RouteActions }) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Routes>
        <Route path="/" element={<MarketplaceView {...actions} />} />
        <Route path="/prices" element={<PriceBoardView />} />
        <Route path="/weather" element={<WeatherAdvicePage />} />
        <Route
          path="/dashboard"
          element={
            <RequireRole roles={['farmer', 'buyer']}>
              <Dashboard actions={actions} />
            </RequireRole>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireRole roles={['admin']}>
              <AdminPanel />
            </RequireRole>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
