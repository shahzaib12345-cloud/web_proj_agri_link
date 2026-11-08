import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { adminApi } from '@/api/admin';
import { articlesApi } from '@/api/articles';
import { listingsApi } from '@/api/listings';
import { offersApi } from '@/api/offers';
import { pricesApi } from '@/api/prices';
import { weatherApi } from '@/api/weather';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useI18n } from '@/i18n/I18nContext';
import type { MessageKey } from '@/i18n/I18nContext';
import type {
  AdminStats,
  Article,
  BuyerOffer,
  MarketPrice,
  NewListingInput,
  NewOfferInput,
  PriceAlert,
  ProduceListing,
  User,
  WeatherDay,
} from '@/types';

type LoadStatus = 'loading' | 'ready' | 'error';
type OfferStatusChange = 'accepted' | 'rejected' | 'countered' | 'completed';
const ACTION_FOR: Record<OfferStatusChange, 'accept' | 'reject' | 'counter' | 'complete'> = {
  accepted: 'accept',
  rejected: 'reject',
  countered: 'counter',
  completed: 'complete',
};

interface DataContextType {
  status: LoadStatus;
  reload: () => void;
  /** Public marketplace listings (approved only). */
  listings: ProduceListing[];
  /** The signed-in farmer's own listings. */
  myListings: ProduceListing[];
  /** Admin: every listing including unapproved. */
  adminListings: ProduceListing[];
  offers: BuyerOffer[];
  marketPrices: MarketPrice[];
  weather: WeatherDay[];
  articles: Article[];
  priceAlerts: PriceAlert[];
  allUsers: User[];
  stats: AdminStats | null;
  favorites: string[];
  toggleFavorite: (listingId: string) => Promise<void>;
  createListing: (data: NewListingInput) => Promise<boolean>;
  deleteListing: (id: string) => Promise<boolean>;
  sendOffer: (data: NewOfferInput, cropName: string, farmerName: string) => Promise<boolean>;
  updateOfferStatus: (
    offerId: string,
    status: OfferStatusChange,
    details?: { counterPrice?: number; counterNote?: string },
  ) => Promise<boolean>;
  rateDeal: (offerId: string, rating: number, comment: string) => Promise<boolean>;
  updateMarketPrice: (id: string, wholesale: number, retail: number) => Promise<boolean>;
  createPriceAlert: (
    cropName: string,
    targetPrice: number,
    condition: 'above' | 'below',
  ) => Promise<boolean>;
  deletePriceAlert: (id: string) => Promise<boolean>;
  createArticle: (data: Parameters<typeof articlesApi.create>[0]) => Promise<boolean>;
  toggleUserVerification: (userId: string) => Promise<void>;
  toggleListingModeration: (listingId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// TODO(api): the forecast district should come from the user's profile / a selector.
const DEFAULT_DISTRICT = 'Multan';

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t, errorMessage } = useI18n();

  const [status, setStatus] = useState<LoadStatus>('loading');
  const [reloadTick, setReloadTick] = useState(0);
  const [listings, setListings] = useState<ProduceListing[]>([]);
  const [myListings, setMyListings] = useState<ProduceListing[]>([]);
  const [adminListings, setAdminListings] = useState<ProduceListing[]>([]);
  const [offers, setOffers] = useState<BuyerOffer[]>([]);
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([]);
  const [weather, setWeather] = useState<WeatherDay[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  const reload = useCallback(() => setReloadTick((n) => n + 1), []);

  // Public data: loaded for everyone, including signed-out visitors.
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    Promise.all([
      listingsApi.list(),
      pricesApi.list(),
      weatherApi.forecast(DEFAULT_DISTRICT),
      articlesApi.list(),
    ])
      .then(([l, p, w, a]) => {
        if (cancelled) return;
        setListings(l);
        setMarketPrices(p);
        setWeather(w);
        setArticles(a);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  // Private data: depends on who is signed in. Signing out clears every private slice.
  const userId = user?.id;
  const role = user?.role;
  useEffect(() => {
    let cancelled = false;
    const clear = () => {
      setOffers([]);
      setPriceAlerts([]);
      setFavorites([]);
      setMyListings([]);
      setAdminListings([]);
      setAllUsers([]);
      setStats(null);
    };
    if (!userId || !role) {
      clear();
      return;
    }
    const safe = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);
    Promise.all([
      safe(offersApi.list(), [] as BuyerOffer[]),
      safe(pricesApi.alerts(), [] as PriceAlert[]),
      safe(listingsApi.favorites(), [] as string[]),
      role === 'farmer' ? safe(listingsApi.mine(), [] as ProduceListing[]) : Promise.resolve([]),
      role === 'admin' ? safe(adminApi.listings(), [] as ProduceListing[]) : Promise.resolve([]),
      role === 'admin' ? safe(adminApi.users(), [] as User[]) : Promise.resolve([]),
      role === 'admin' ? safe(adminApi.stats(), null) : Promise.resolve(null),
    ]).then(([o, al, fav, mine, adminL, users, st]) => {
      if (cancelled) return;
      setOffers(o);
      setPriceAlerts(al);
      setFavorites(fav);
      setMyListings(mine);
      setAdminListings(adminL);
      setAllUsers(users);
      setStats(st);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, role, reloadTick]);

  /** Runs an API call; shows a friendly toast on failure and an optional success toast. */
  const run = useCallback(
    async (fn: () => Promise<unknown>, success?: string): Promise<boolean> => {
      try {
        await fn();
        if (success) showToast(success, 'success');
        return true;
      } catch (err) {
        showToast(errorMessage(err), 'error');
        return false;
      }
    },
    [showToast, errorMessage],
  );

  const refreshListings = useCallback(async () => {
    setListings(await listingsApi.list());
    if (role === 'farmer') setMyListings(await listingsApi.mine());
    if (role === 'admin') setAdminListings(await adminApi.listings());
  }, [role]);

  const value = useMemo<DataContextType>(
    () => ({
      status,
      reload,
      listings,
      myListings,
      adminListings,
      offers,
      marketPrices,
      weather,
      articles,
      priceAlerts,
      allUsers,
      stats,
      favorites,

      toggleFavorite: async (listingId) => {
        if (!user) {
          showToast(t('toast.sign_in_required'), 'info');
          return;
        }
        const has = favorites.includes(listingId);
        setFavorites(has ? favorites.filter((id) => id !== listingId) : [...favorites, listingId]); // optimistic
        const ok = await run(() =>
          has ? listingsApi.removeFavorite(listingId) : listingsApi.addFavorite(listingId),
        );
        if (!ok) setFavorites(favorites);
      },

      createListing: (data) =>
        run(async () => {
          await listingsApi.create(data);
          await refreshListings();
        }, t('toast.listing_created')),

      deleteListing: (id) =>
        run(async () => {
          await (role === 'admin' ? adminApi.removeListing(id) : listingsApi.remove(id));
          await refreshListings();
        }, t('toast.listing_removed')),

      sendOffer: (data, cropName, farmerName) =>
        run(
          async () => {
            await offersApi.create(data);
            setOffers(await offersApi.list());
          },
          t('toast.offer_sent', { cropName, farmerName }),
        ),

      updateOfferStatus: (offerId, st, details) =>
        run(
          async () => {
            await offersApi.act(offerId, ACTION_FOR[st], {
              counterPricePerUnit: details?.counterPrice,
              counterNote: details?.counterNote,
            });
            setOffers(await offersApi.list());
            await refreshListings();
          },
          t(`toast.offer_${st}` as MessageKey),
        ),

      rateDeal: (offerId, rating, comment) =>
        run(
          async () => {
            await offersApi.rate(offerId, rating, comment);
            setOffers(await offersApi.list());
          },
          t('toast.rating_saved', { rating }),
        ),

      updateMarketPrice: (id, wholesale, retail) =>
        run(async () => {
          await pricesApi.update(id, wholesale, retail);
          setMarketPrices(await pricesApi.list());
        }, t('toast.price_updated')),

      createPriceAlert: (cropName, targetPrice, condition) =>
        run(async () => {
          await pricesApi.createAlert(cropName, targetPrice, condition);
          setPriceAlerts(await pricesApi.alerts());
        }, t('toast.alert_created')),

      deletePriceAlert: (id) =>
        run(async () => {
          await pricesApi.removeAlert(id);
          setPriceAlerts(await pricesApi.alerts());
        }, t('toast.alert_removed')),

      createArticle: (data) =>
        run(async () => {
          await articlesApi.create(data);
          setArticles(await articlesApi.list());
        }, t('toast.article_published')),

      toggleUserVerification: async (userId) => {
        const target = allUsers.find((u) => u.id === userId);
        if (!target) return;
        await run(async () => {
          await adminApi.setVerified(userId, !target.isVerified);
          setAllUsers(await adminApi.users());
          setStats(await adminApi.stats());
        }, t('toast.user_updated'));
      },

      toggleListingModeration: async (listingId) => {
        const target = adminListings.find((l) => l.id === listingId);
        if (!target) return;
        await run(async () => {
          await adminApi.setApproved(listingId, !target.isModerated);
          await refreshListings();
        }, t('toast.listing_moderated'));
      },
    }),
    [
      status,
      reload,
      listings,
      myListings,
      adminListings,
      offers,
      marketPrices,
      weather,
      articles,
      priceAlerts,
      allUsers,
      stats,
      favorites,
      user,
      role,
      run,
      refreshListings,
      showToast,
      t,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextType {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
