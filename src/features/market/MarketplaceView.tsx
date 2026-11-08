import { useState, useMemo } from 'react';
import type { ProduceListing } from '@/types';
import { useAuth } from '@/context/AuthContext';
import {
  Search,
  Heart,
  MapPin,
  Calendar,
  CheckCircle2,
  TrendingDown,
  PlusCircle,
  ShoppingBag,
  Volume2,
  ArrowRight,
} from 'lucide-react';
import { formatNumber, formatDate } from '@/utils/format';
import { SafeImage } from '@/components/SafeImage';
import { CardGridSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useData } from '@/context/DataContext';
import { useI18n } from '@/i18n/I18nContext';
import { useSpeech } from '@/hooks/useSpeech';
import { useTab } from '@/hooks/useTab';

interface MarketplaceViewProps {
  onOpenListingDetail: (listing: ProduceListing) => void;
  onOpenMakeOffer: (listing: ProduceListing) => void;
  onOpenCreateListing: () => void;
}

type CategoryFilter = 'all' | ProduceListing['category'];
const CATEGORIES: CategoryFilter[] = [
  'all',
  'Cereals & Grains',
  'Vegetables',
  'Tubers & Roots',
  'Legumes',
  'Fruits',
];
const DISTRICTS = ['Multan', 'Okara', 'Faisalabad', 'Lahore', 'Sahiwal', 'Sargodha'] as const;

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  onOpenListingDetail,
  onOpenMakeOffer,
  onOpenCreateListing,
}) => {
  const { user } = useAuth();
  const { t, tDyn, language } = useI18n();
  const { readAloud } = useSpeech();
  const { setActiveTab } = useTab();
  const { status, listings, marketPrices, favorites, toggleFavorite } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high'>('newest');

  const filteredListings = useMemo(() => {
    return listings
      .filter((item) => {
        if (item.status === 'sold' || !item.isModerated) return false;
        if (showFavoritesOnly && !favorites.includes(item.id)) return false;

        if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;

        if (
          selectedDistrict !== 'All' &&
          !item.farmerLocation.district.includes(selectedDistrict)
        ) {
          return false;
        }

        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchCrop = item.cropName.toLowerCase().includes(term);
          const matchVariety = item.variety.toLowerCase().includes(term);
          const matchFarmer = item.farmerName.toLowerCase().includes(term);
          const matchLocation = `${item.farmerLocation.tehsil} ${item.farmerLocation.district}`
            .toLowerCase()
            .includes(term);
          if (!matchCrop && !matchVariety && !matchFarmer && !matchLocation) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_low') return a.pricePerUnit - b.pricePerUnit;
        if (sortBy === 'price_high') return b.pricePerUnit - a.pricePerUnit;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [
    listings,
    searchTerm,
    selectedCategory,
    selectedDistrict,
    showFavoritesOnly,
    sortBy,
    favorites,
  ]);

  // Audio helper for specific listing card
  const handleReadListing = (item: ProduceListing) => {
    const text = t('market.by_farmer_in_price_is', {
      cropName: item.cropName,
      farmerName: item.farmerName,
      county: item.farmerLocation.district,
      pricePerUnit: formatNumber(item.pricePerUnit),
      unit: item.unit,
      quantity: formatNumber(item.quantity),
    });
    readAloud(text);
  };

  return (
    <div className="space-y-6">
      {/* Editorial Hero Announcement */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-950 text-white p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
            <span>{t('common.heroBadge')}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-white leading-relaxed">
            {t('common.heroTitle')}
          </h1>

          <p className="text-sm text-emerald-100/90 leading-relaxed">{t('common.heroDesc')}</p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {user?.role === 'farmer' ? (
              <button
                onClick={onOpenCreateListing}
                className="inline-flex items-center gap-2 px-5 min-h-12 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs sm:text-sm rounded-xl transition-colors shadow-sm"
              >
                <PlusCircle className="w-5 h-5" aria-hidden="true" />
                <span>{t('common.postProduceBtn')}</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('prices')}
                className="inline-flex items-center gap-2 px-4 min-h-12 bg-emerald-700/80 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm rounded-xl border border-emerald-600 transition-colors"
              >
                {t('common.checkMandiRatesBtn')}
              </button>
            )}

            <button
              onClick={() => setActiveTab('weather')}
              className="min-h-12 inline-flex items-center gap-1 text-xs sm:text-sm text-emerald-200 hover:text-white underline underline-offset-4 font-medium"
            >
              {t('common.viewWeatherBtn')}
              <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Decorative backdrop */}
        <div
          className="absolute end-0 bottom-0 top-0 w-1/3 opacity-15 pointer-events-none hidden md:block"
          aria-hidden="true"
        >
          <SafeImage
            src="/images/hero-farm.webp"
            alt=""
            decorative
            eager
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-emerald-950/10 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute start-3 top-4" aria-hidden="true" />
            <input
              type="search"
              aria-label={t('common.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('common.searchPlaceholder')}
              className="w-full ps-9 pe-3 min-h-12 text-sm border border-slate-200 rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
            />
          </div>

          {/* District Filter (Pakistani Agricultural Belt) */}
          <div className="flex items-center gap-2">
            <select
              value={selectedDistrict}
              aria-label={t('market.all_districts')}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="px-3 min-h-12 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 outline-none focus:border-emerald-600"
            >
              <option value="All">{t('market.all_districts')}</option>
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {tDyn('market', d.toLowerCase())}
                </option>
              ))}
            </select>

            {/* Sort Selector */}
            <select
              value={sortBy}
              aria-label={t('common.latestHarvest')}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 min-h-12 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 outline-none focus:border-emerald-600"
            >
              <option value="newest">{t('common.latestHarvest')}</option>
              <option value="price_low">{t('common.priceLowHigh')}</option>
              <option value="price_high">{t('common.priceHighLow')}</option>
            </select>

            {/* Favorites Toggle */}
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              aria-pressed={showFavoritesOnly}
              aria-label={t('common.savedOnly')}
              className={`min-h-12 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                showFavoritesOnly
                  ? 'border-rose-400 bg-rose-50 text-rose-700'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 ${showFavoritesOnly ? 'fill-rose-500 text-rose-500' : ''}`}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">{t('common.savedOnly')}</span>
            </button>
          </div>
        </div>

        {/* Category Segmented Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                aria-pressed={isActive}
                className={`px-3 min-h-12 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                {cat === 'all' ? t('market.all_crops') : tDyn('category', cat)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Listings Grid */}
      <div>
        <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
          <span>
            {t('market.showing_verified_produce_listings', { length: filteredListings.length })}
          </span>
          <span className="font-semibold text-emerald-800">
            {selectedCategory === 'all'
              ? t('market.all_crops')
              : tDyn('category', selectedCategory)}{' '}
            ·{' '}
            {selectedDistrict === 'All'
              ? t('market.all_areas')
              : tDyn('market', selectedDistrict.toLowerCase())}
          </span>
        </div>

        {status === 'loading' ? (
          <CardGridSkeleton />
        ) : filteredListings.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="w-6 h-6" aria-hidden="true" />}
            title={t('market.no_produce_listings_found')}
            hint={t('market.no_active_listings_match_your')}
            action={
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                  setSelectedDistrict('All');
                  setShowFavoritesOnly(false);
                }}
                className="px-4 min-h-12 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                {t('market.reset_all_filters')}
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredListings.map((item) => {
              const isFav = favorites.includes(item.id);

              const benchmark = marketPrices.find((p) =>
                item.cropName.toLowerCase().includes(p.cropName.toLowerCase().split(' ')[0]),
              );
              const isBelowMarket = benchmark && item.pricePerUnit < benchmark.wholesalePrice;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-emerald-950/10 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col group"
                >
                  {/* Photo area */}
                  <div className="relative h-48 bg-slate-100 overflow-hidden">
                    <SafeImage
                      src={item.imageUrl}
                      alt={item.cropName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Variety badge */}
                    <div className="absolute top-2.5 start-2.5 flex items-center gap-1.5">
                      <span className="bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-bold text-emerald-950 shadow-xs border border-emerald-950/10">
                        {item.variety}
                      </span>
                    </div>

                    {/* Audio read-aloud button directly on card for low literacy */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReadListing(item);
                      }}
                      className="absolute top-2.5 end-14 w-12 h-12 rounded-full bg-amber-500 text-emerald-950 flex items-center justify-center shadow-sm hover:bg-amber-400 transition-colors"
                      aria-label={t('common.listenVoice')}
                    >
                      <Volume2 className="w-4 h-4" aria-hidden="true" />
                    </button>

                    {/* Favorite heart */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(item.id);
                      }}
                      className="absolute top-2.5 end-2.5 w-12 h-12 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-slate-600 hover:text-rose-600 shadow-xs transition-colors"
                      aria-label={t('market.save_listing')}
                      aria-pressed={isFav}
                    >
                      <Heart
                        className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`}
                        aria-hidden="true"
                      />
                    </button>

                    {/* Price tag in PKR */}
                    <div className="absolute bottom-2.5 start-2.5 bg-emerald-900/90 text-white backdrop-blur-md px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold tabular-nums shadow-sm">
                      {t('common.currencyPrefix')} {formatNumber(item.pricePerUnit)} / {item.unit}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span className="font-semibold text-emerald-800">
                          {tDyn('category', item.category)}
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatDate(item.harvestDate, language)}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-800 transition-colors line-clamp-1">
                        <button
                          type="button"
                          onClick={() => onOpenListingDetail(item)}
                          className="text-start w-full"
                        >
                          {item.cropName}
                        </button>
                      </h3>

                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="space-y-2.5 pt-2 border-t border-slate-100">
                      {/* Farmer metadata */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold text-slate-900 truncate">
                            {item.farmerName}
                          </span>
                          <span title={t('common.verifiedFarmer')} className="inline-flex">
                            <CheckCircle2
                              className="w-3.5 h-3.5 text-emerald-600 shrink-0"
                              aria-label={t('common.verifiedFarmer')}
                            />
                          </span>
                        </div>
                        <span className="text-slate-500 flex items-center gap-1 text-[11px] shrink-0 font-medium">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {item.farmerLocation.district}
                        </span>
                      </div>

                      {/* Stock availability */}
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>
                          {t('common.availableStock')}:{' '}
                          <strong className="text-slate-900 tabular-nums font-bold">
                            {formatNumber(item.quantity)}
                          </strong>{' '}
                          {item.unit}
                        </span>
                        <span>
                          {t('common.minOrder')}:{' '}
                          <strong className="text-slate-900 tabular-nums">
                            {formatNumber(item.minOrderQuantity)}
                          </strong>
                        </span>
                      </div>

                      {/* Mandi benchmark price highlight */}
                      {isBelowMarket && benchmark && (
                        <div className="flex items-center gap-1 text-[11px] text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg">
                          <TrendingDown className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>
                            {t('common.belowMandiAvg')} ({t('common.currencyPrefix')}{' '}
                            {formatNumber(benchmark.wholesalePrice)})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Phone numbers are never shown on public listings; they are revealed to both parties after an offer is accepted. */}
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => onOpenListingDetail(item)}
                        className="flex-1 min-h-12 text-xs font-bold text-emerald-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-center"
                      >
                        {t('common.viewDetailsBtn')}
                      </button>

                      <button
                        onClick={() => onOpenMakeOffer(item)}
                        className="flex-1 min-h-12 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors text-center shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t('common.makeOfferBtn')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
