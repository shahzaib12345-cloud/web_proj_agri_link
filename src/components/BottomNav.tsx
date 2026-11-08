import { Store, TrendingUp, CloudSun, UserCircle2, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useI18n } from '@/i18n/I18nContext';
import { useTab } from '@/hooks/useTab';
import type { AppTab } from '@/hooks/useTab';

export function BottomNav() {
  const { user } = useAuth();
  const { offers } = useData();
  const { t } = useI18n();
  const { activeTab, setActiveTab } = useTab();

  const pendingCount =
    user?.role === 'farmer'
      ? offers.filter((o) => o.status === 'pending').length
      : user?.role === 'buyer'
        ? offers.filter((o) => o.status === 'accepted' || o.status === 'countered').length
        : 0;

  const tabs: { id: AppTab; label: string; icon: ReactNode; badge?: number }[] = [
    {
      id: 'marketplace',
      label: t('common.navMarketplace'),
      icon: <Store className="w-5 h-5" aria-hidden="true" />,
    },
    {
      id: 'prices',
      label: t('common.navPrices'),
      icon: <TrendingUp className="w-5 h-5" aria-hidden="true" />,
    },
    {
      id: 'weather',
      label: t('common.navWeather'),
      icon: <CloudSun className="w-5 h-5" aria-hidden="true" />,
    },
  ];
  if (user?.role === 'farmer' || user?.role === 'buyer') {
    tabs.push({
      id: 'dashboard',
      label: user.role === 'farmer' ? t('common.navFarmerHub') : t('common.navBuyerHub'),
      icon: <UserCircle2 className="w-5 h-5" aria-hidden="true" />,
      badge: pendingCount,
    });
  }
  if (user?.role === 'admin') {
    tabs.push({
      id: 'admin',
      label: t('common.navAdmin'),
      icon: <ShieldAlert className="w-5 h-5" aria-hidden="true" />,
    });
  }

  return (
    <nav
      aria-label={t('a11y.main_nav')}
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-emerald-950/10 pb-safe"
    >
      <div className="flex items-stretch justify-around h-16">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 min-h-12 flex flex-col items-center justify-center py-1 transition-colors relative ${
                isActive ? 'text-emerald-800' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {tab.badge ? (
                  <span className="absolute -top-1 -end-2 px-1.5 bg-amber-600 text-white text-[10px] font-bold rounded-full">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span
                className={`text-[11px] tracking-tight mt-1 truncate max-w-[72px] ${isActive ? 'font-bold' : 'font-medium'}`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-6 h-0.5 bg-emerald-700 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
