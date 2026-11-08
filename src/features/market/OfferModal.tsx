import { useId, useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import type { ProduceListing } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { Send, Calculator, Plus, Minus } from 'lucide-react';
import { formatNumber } from '@/utils/format';
import { inRange, LIMITS } from '@/utils/validators';
import { Modal } from '@/components/Modal';
import { CloseButton } from '@/components/CloseButton';
import { useData } from '@/context/DataContext';
import { useI18n } from '@/i18n/I18nContext';

interface OfferModalProps {
  listing: ProduceListing | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
}

export const OfferModal: React.FC<OfferModalProps> = ({ listing, isOpen, onClose, onOpenAuth }) => {
  const { user, isAuthenticated } = useAuth();
  const { t } = useI18n();
  const uid = useId();
  const { sendOffer } = useData();

  const [quantity, setQuantity] = useState<number>(listing?.minOrderQuantity || 10);
  const [offeredPrice, setOfferedPrice] = useState<number>(listing?.pricePerUnit || 100);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (listing) {
      setQuantity(listing.minOrderQuantity || 1);
      setOfferedPrice(listing.pricePerUnit);
      setMessage(
        t('market.hello_i_am_interested_in', {
          farmerName: listing.farmerName,
          cropName: listing.cropName,
        }),
      );
    }
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing]);

  if (!isOpen || !listing) return null;

  // Display only: the server recomputes the total from quantity x price.
  const totalPrice = quantity * offeredPrice;
  const isLowerThanListing = offeredPrice < listing.pricePerUnit;
  const discountPercent = isLowerThanListing
    ? Math.round(((listing.pricePerUnit - offeredPrice) / listing.pricePerUnit) * 100)
    : 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      onOpenAuth();
      return;
    }

    setError(null);
    if (!inRange(quantity, listing.minOrderQuantity, listing.quantity))
      return setError(t('market.err_quantity'));
    if (!inRange(offeredPrice, LIMITS.price.min, LIMITS.price.max))
      return setError(t('market.err_price'));

    setSubmitting(true);
    try {
      const ok = await sendOffer(
        {
          listingId: listing.id,
          quantity,
          offeredPricePerUnit: offeredPrice,
          message: message.trim().slice(0, LIMITS.textLong),
        },
        listing.cropName,
        listing.farmerName,
      );
      if (ok) onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} label={t('market.purchase_offer_inquiry')} className="max-w-lg" scroll>
      <div className="flex items-center justify-between pb-3 border-b border-emerald-950/10">
        <div>
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
            {t('market.purchase_offer_inquiry')}
          </span>
          <h2 className="text-base sm:text-lg font-bold text-emerald-950 font-display">
            {listing.cropName}
          </h2>
        </div>
        <CloseButton onClick={onClose} />
      </div>

      {error && (
        <div
          role="alert"
          className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
        {/* Produce snippet */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
          <div>
            <p className="font-bold text-slate-800">{listing.variety}</p>
            <p className="text-slate-500">
              {t('buyer.farmer')}
              {listing.farmerName} · {listing.farmerLocation.district}
            </p>
          </div>
          <div className="text-end">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">
              {t('market.listing_rate')}
            </span>
            <span className="text-sm font-bold text-slate-900 tabular-nums">
              {t('common.currencyPrefix')} {formatNumber(listing.pricePerUnit)}
            </span>
            <span className="text-[10px] text-slate-500"> / {listing.unit}</span>
          </div>
        </div>

        {/* Steppers for Quantity and Offered Rate */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <label htmlFor={`${uid}-q`} className="block text-xs font-bold text-slate-700 mb-1">
              {t('market.quantity_required', { unit: listing.unit })}
            </label>
            <div className="flex items-center gap-1.5 mt-1">
              <button
                type="button"
                aria-label={t('a11y.decrease')}
                onClick={() => setQuantity(Math.max(listing.minOrderQuantity, quantity - 5))}
                className="w-12 h-12 shrink-0 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700"
              >
                <Minus className="w-4 h-4" aria-hidden="true" />
              </button>
              <input
                id={`${uid}-q`}
                type="number"
                inputMode="numeric"
                min={listing.minOrderQuantity}
                max={listing.quantity}
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    Math.min(
                      listing.quantity,
                      Math.max(1, Math.round(Number(e.target.value)) || 1),
                    ),
                  )
                }
                className="flex-1 min-h-12 px-2 text-center text-sm font-bold border border-slate-300 rounded-lg outline-none tabular-nums bg-white"
              />
              <button
                type="button"
                aria-label={t('a11y.increase')}
                onClick={() => setQuantity(Math.min(listing.quantity, quantity + 5))}
                className="w-12 h-12 shrink-0 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {t('market.available_min', {
                quantity: listing.quantity,
                minOrderQuantity: listing.minOrderQuantity,
              })}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <label htmlFor={`${uid}-p`} className="block text-xs font-bold text-slate-700 mb-1">
              {t('market.your_offered_rate', { unit: listing.unit })}
            </label>
            <div className="flex items-center gap-1.5 mt-1">
              <button
                type="button"
                aria-label={t('a11y.decrease')}
                onClick={() => setOfferedPrice(Math.max(LIMITS.price.min, offeredPrice - 50))}
                className="w-12 h-12 shrink-0 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700"
              >
                <Minus className="w-4 h-4" aria-hidden="true" />
              </button>
              <input
                id={`${uid}-p`}
                type="number"
                inputMode="numeric"
                min={LIMITS.price.min}
                max={LIMITS.price.max}
                value={offeredPrice}
                onChange={(e) =>
                  setOfferedPrice(
                    Math.min(
                      LIMITS.price.max,
                      Math.max(1, Math.round(Number(e.target.value)) || 1),
                    ),
                  )
                }
                className="flex-1 min-h-12 px-2 text-center text-sm font-bold border border-emerald-600 rounded-lg outline-none tabular-nums text-emerald-950 bg-white"
              />
              <button
                type="button"
                aria-label={t('a11y.increase')}
                onClick={() => setOfferedPrice(Math.min(LIMITS.price.max, offeredPrice + 50))}
                className="w-12 h-12 shrink-0 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            {isLowerThanListing && (
              <span className="text-[10px] text-amber-700 mt-1 block font-bold">
                {t('market.below_listing_rate', { discountPercent })}
              </span>
            )}
          </div>
        </div>

        {/* Deal Value Calculation */}
        <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-900 text-xs">
            <Calculator className="w-4 h-4 text-emerald-700" />
            <span className="font-bold">{t('market.total_proposed_deal_value')}</span>
          </div>
          <div className="text-end">
            <span className="text-base font-bold text-emerald-950 tabular-nums">
              {t('common.currencyPrefix')} {formatNumber(totalPrice)}
            </span>
            <span className="text-[10px] text-emerald-700 block">
              {formatNumber(quantity)} {listing.unit}
            </span>
          </div>
        </div>

        <div>
          <label htmlFor={`${uid}-m`} className="block text-xs font-semibold text-slate-700 mb-1">
            {t('market.message_to_farmer')}
          </label>
          <textarea
            id={`${uid}-m`}
            rows={2}
            maxLength={LIMITS.textLong}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2.5 text-xs text-slate-800 border border-slate-300 rounded-xl outline-none leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 min-h-12 text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors"
          >
            {t('buyer.cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 min-h-12 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {submitting ? t('market.sending_offer') : t('market.send_offer_to_farmer')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
