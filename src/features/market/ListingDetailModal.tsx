import type { ProduceListing, MarketPrice } from '@/types';
import {
  MapPin,
  CheckCircle2,
  Star,
  ShoppingBag,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Volume2,
} from 'lucide-react';
import { formatNumber, formatDate } from '@/utils/format';
import { Modal } from '@/components/Modal';
import { CloseButton } from '@/components/CloseButton';
import { SafeImage } from '@/components/SafeImage';
import { useI18n } from '@/i18n/I18nContext';
import { useSpeech } from '@/hooks/useSpeech';

interface ListingDetailModalProps {
  listing: ProduceListing | null;
  isOpen: boolean;
  onClose: () => void;
  onMakeOffer: (listing: ProduceListing) => void;
  marketPrices: MarketPrice[];
}

export const ListingDetailModal: React.FC<ListingDetailModalProps> = ({
  listing,
  isOpen,
  onClose,
  onMakeOffer,
  marketPrices,
}) => {
  const { language, t, tDyn } = useI18n();
  const { readAloud } = useSpeech();

  if (!isOpen || !listing) return null;

  const comparable = marketPrices.find((p) =>
    listing.cropName.toLowerCase().includes(p.cropName.toLowerCase().split(' ')[0]),
  );

  const priceDiff = comparable ? listing.pricePerUnit - comparable.wholesalePrice : 0;

  const handleReadDetail = () => {
    const text = t('market.variety_farmer_phone_price_is', {
      cropName: listing.cropName,
      variety: listing.variety,
      farmerName: listing.farmerName,
      pricePerUnit: formatNumber(listing.pricePerUnit),
      unit: listing.unit,
      quantity: formatNumber(listing.quantity),
      county: listing.farmerLocation.district,
    });
    readAloud(text);
  };

  return (
    <Modal onClose={onClose} label={listing.cropName} className="max-w-xl" scroll>
      <div className="flex items-center justify-between pb-3 border-b border-emerald-950/10">
        <div>
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
            {tDyn('category', listing.category)}
          </span>
          <h2 className="text-lg font-bold text-emerald-950 font-display">{listing.cropName}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReadDetail}
            className="px-2.5 min-h-12 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold flex items-center gap-1"
            aria-label={t('common.listenVoice')}
          >
            <Volume2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
            <span className="hidden sm:inline">{t('common.listenVoice')}</span>
          </button>
          <CloseButton onClick={onClose} />
        </div>
      </div>

      <div className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pe-1">
        {/* Photo banner */}
        <div className="relative h-56 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
          <SafeImage
            src={listing.imageUrl}
            alt={listing.cropName}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 start-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-950 border border-emerald-950/10 flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>{listing.variety}</span>
          </div>
          <div className="absolute bottom-3 end-3 bg-emerald-900/90 text-white backdrop-blur-md px-3.5 py-1.5 rounded-xl text-sm font-bold tabular-nums shadow-md">
            {t('common.currencyPrefix')} {formatNumber(listing.pricePerUnit)} / {listing.unit}
          </div>
        </div>

        {/* Farmer Card */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">
              {listing.farmerName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-900">{listing.farmerName}</h3>
                <span className="flex items-center text-[10px] text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                  <CheckCircle2 className="w-3 h-3 me-0.5" aria-hidden="true" />{' '}
                  {t('common.verifiedFarmer')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span className="flex items-center gap-0.5 text-amber-600 font-semibold">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />{' '}
                  {listing.farmerRating ? formatNumber(listing.farmerRating) : '—'}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {listing.farmerLocation.district}
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-600">{t('market.phone_hidden_note')}</p>

        {/* Key Produce Metrics */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">
              {t('common.availableStock')}
            </span>
            <span className="text-base font-bold text-slate-900 tabular-nums">
              {formatNumber(listing.quantity)}
            </span>
            <span className="text-xs text-slate-500 block truncate">{listing.unit}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">
              {t('common.minOrder')}
            </span>
            <span className="text-base font-bold text-slate-900 tabular-nums">
              {formatNumber(listing.minOrderQuantity)}
            </span>
            <span className="text-xs text-slate-500 block truncate">{listing.unit}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">
              {t('common.harvestDate')}
            </span>
            <span className="text-xs font-bold text-slate-900 block mt-1">
              {formatDate(listing.harvestDate, language)}
            </span>
            <span className="text-[10px] text-emerald-700 font-medium block">
              {t('market.fresh_harvest')}
            </span>
          </div>
        </div>

        {/* Mandi Benchmark Price Comparison */}
        {comparable && (
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs">
            <div className="flex items-center justify-between font-bold text-emerald-950 mb-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                {t('market.mandi_price_comparison', { marketName: comparable.marketName })}
              </span>
              <span className="tabular-nums">
                {t('common.currencyPrefix')} {formatNumber(comparable.wholesalePrice)} /{' '}
                {comparable.unit}
              </span>
            </div>
            <p className="text-emerald-800 text-[11px] leading-relaxed">
              {priceDiff <= 0 ? (
                <span className="flex items-center gap-1 font-medium">
                  <TrendingDown className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  {t('market.this_farmer_is_offering_pkr', {
                    priceDiff: formatNumber(Math.abs(priceDiff)),
                  })}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-700">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  {t('market.premium_grade_produce_pkr_above', {
                    priceDiff: formatNumber(priceDiff),
                  })}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Description */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
            {t('market.crop_details_packaging')}
          </h4>
          <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
            {listing.description}
          </p>
        </div>

        {/* Action */}
        <div className="pt-2 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 min-h-12 text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors"
          >
            {t('market.back')}
          </button>
          <button
            onClick={() => {
              onClose();
              onMakeOffer(listing);
            }}
            className="px-6 min-h-12 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            <span>{t('common.makeOfferBtn')}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
