import { Sprout, Volume2, VolumeX, Globe, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useI18n } from '@/i18n/I18nContext';
import { useSpeech } from '@/hooks/useSpeech';
import { useTab } from '@/hooks/useTab';
import type { AppTab } from '@/hooks/useTab';

export function Header({ onOpenAuth }: { onOpenAuth: () => void }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { offers } = useData();
  const { language, setLanguage, t } = useI18n();
  const { isSpeaking, readAloud, stopAudio, supported } = useSpeech();
  const { activeTab, setActiveTab } = useTab();

  const pendingOffersCount =
    user?.role === 'farmer'
      ? offers.filter((o) => o.status === 'pending').length
      : user?.role === 'buyer'
        ? offers.filter((o) => o.status === 'accepted' || o.status === 'countered').length
        : 0;

  const navItems: { id: AppTab; label: string; badge?: number }[] = [
    { id: 'marketplace', label: t('common.navMarketplace') },
    { id: 'prices', label: t('common.navPrices') },
    { id: 'weather', label: t('common.navWeather') },
  ];
  if (user?.role === 'farmer' || user?.role === 'buyer') {
    navItems.push({
      id: 'dashboard',
      label: user.role === 'farmer' ? t('common.navFarmerHub') : t('common.navBuyerHub'),
      badge: pendingOffersCount,
    });
  }
  if (user?.role === 'admin') navItems.push({ id: 'admin', label: t('common.navAdmin') });

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-950/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
        <button
          type="button"
          onClick={() => setActiveTab('marketplace')}
          className="flex items-center gap-2.5 text-start text-emerald-900 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-lg py-1 shrink-0 min-h-12"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-900/10 group-hover:bg-emerald-800 transition-colors">
            <Sprout className="w-5 h-5 text-emerald-100" aria-hidden="true" />
          </div>
          <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-emerald-950 whitespace-nowrap shrink-0">
            {t('common.appName')}
          </span>
        </button>

        <nav
          aria-label={t('a11y.main_nav')}
          className="hidden lg:flex items-center gap-6 text-sm font-medium text-emerald-900/70"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              aria-current={activeTab === item.id ? 'page' : undefined}
              className={`whitespace-nowrap shrink-0 transition-colors min-h-12 hover:text-emerald-950 ${
                activeTab === item.id
                  ? 'text-emerald-900 font-bold border-b-2 border-emerald-700'
                  : ''
              }`}
            >
              {item.label}
              {item.badge ? (
                <span className="mx-1.5 px-1.5 bg-amber-600 text-white text-[11px] font-bold rounded-full">
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {supported && (
            <button
              type="button"
              onClick={() => (isSpeaking ? stopAudio() : readAloud(t('speech.welcome')))}
              aria-label={isSpeaking ? t('common.stopVoice') : t('common.listenVoice')}
              className={`min-h-12 min-w-12 px-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                isSpeaking
                  ? 'bg-amber-100 border-amber-400 text-amber-900 animate-pulse'
                  : 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-900'
              }`}
            >
              {isSpeaking ? (
                <VolumeX className="w-4 h-4 text-amber-700" aria-hidden="true" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">
                {isSpeaking ? t('common.stopVoice') : t('common.listenVoice')}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setLanguage(language === 'ur' ? 'en' : 'ur')}
            aria-label={t('a11y.switch_language')}
            lang={language === 'ur' ? 'en' : 'ur'}
            className="min-h-12 min-w-12 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
            <span>{language === 'ur' ? 'English' : 'اردو'}</span>
          </button>

          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:flex items-center gap-1 px-2.5 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200/80 rounded-lg min-h-12">
                <span className="capitalize">{t(`role.${user.role}` as 'role.farmer')}</span>
                <span className="text-emerald-700 font-bold truncate max-w-[80px] sm:max-w-none">
                  {user.name.split(' ')[0]}
                </span>
              </span>
              <button
                type="button"
                onClick={() => void logout()}
                aria-label={t('common.signOut')}
                className="min-h-12 min-w-12 px-2 flex items-center justify-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors"
              >
                <LogOut className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
                <span className="hidden md:inline">{t('common.signOut')}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="min-h-12 px-3.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm shadow-emerald-900/10"
            >
              {t('common.signInPhone')}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
