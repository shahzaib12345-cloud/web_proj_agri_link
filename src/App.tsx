import { useState } from 'react';
import { Sprout } from 'lucide-react';
import { AuthProvider } from '@/context/AuthContext';
import { DataProvider, useData } from '@/context/DataContext';
import { ToastProvider } from '@/context/ToastContext';
import { I18nProvider, useI18n } from '@/i18n/I18nContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { ToastContainer } from '@/components/ToastContainer';
import { AuthModal } from '@/features/auth/AuthModal';
import { ListingDetailModal } from '@/features/market/ListingDetailModal';
import { OfferModal } from '@/features/market/OfferModal';
import { CreateListingModal } from '@/features/farmer/CreateListingModal';
import { AppRoutes } from '@/routes/AppRoutes';
import type { ProduceListing } from '@/types';

function AppContent() {
  const { t } = useI18n();
  const { marketPrices, status, reload } = useData();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);
  const [selectedListingDetail, setSelectedListingDetail] = useState<ProduceListing | null>(null);
  const [offerListing, setOfferListing] = useState<ProduceListing | null>(null);

  return (
    <div className="min-h-screen bg-[#f8faf9] text-emerald-950 flex flex-col font-sans">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:p-3 focus:bg-white focus:rounded-lg"
      >
        {t('a11y.skip_to_content')}
      </a>
      <Header onOpenAuth={() => setIsAuthOpen(true)} />

      <main
        id="main"
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12"
      >
        {status === 'error' && (
          <div
            role="alert"
            className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-sm flex items-center justify-between gap-3"
          >
            <span>{t('state.load_failed')}</span>
            <button
              type="button"
              onClick={reload}
              className="min-h-12 px-4 rounded-lg bg-rose-700 text-white font-bold text-xs"
            >
              {t('state.retry')}
            </button>
          </div>
        )}
        <AppRoutes
          actions={{
            onOpenListingDetail: setSelectedListingDetail,
            onOpenMakeOffer: setOfferListing,
            onOpenCreateListing: () => setIsCreateListingOpen(true),
          }}
        />
      </main>

      <footer className="border-t border-emerald-950/10 bg-white py-8 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-start">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-800 text-white flex items-center justify-center font-bold text-xs">
              <Sprout className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
            <span className="font-bold text-slate-800 font-display">{t('common.appName')}</span>
            <span aria-hidden="true">·</span>
            <span>{t('footer.network')}</span>
          </div>
          <span className="text-[11px]">{t('footer.coverage')}</span>
        </div>
      </footer>

      <BottomNav />

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <ListingDetailModal
        listing={selectedListingDetail}
        isOpen={!!selectedListingDetail}
        onClose={() => setSelectedListingDetail(null)}
        onMakeOffer={setOfferListing}
        marketPrices={marketPrices}
      />
      <OfferModal
        listing={offerListing}
        isOpen={!!offerListing}
        onClose={() => setOfferListing(null)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />
      <CreateListingModal
        isOpen={isCreateListingOpen}
        onClose={() => setIsCreateListingOpen(false)}
      />

      <ToastContainer />
    </div>
  );
}

function Boundary({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <ErrorBoundary title={t('state.crashed')} retryLabel={t('state.reload')}>
      {children}
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
            <Boundary>
              <AppContent />
            </Boundary>
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
    </I18nProvider>
  );
}
