import { useId, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { BuyerOffer, ProduceListing } from '@/types';
import { Star, CheckCircle2, Phone, Heart } from 'lucide-react';
import { formatNumber, formatDate } from '@/utils/format';
import { telHref } from '@/utils/validators';
import { Modal } from '@/components/Modal';
import { CloseButton } from '@/components/CloseButton';
import { SafeImage } from '@/components/SafeImage';
import { EmptyState } from '@/components/EmptyState';
import { useData } from '@/context/DataContext';
import { useI18n } from '@/i18n/I18nContext';

interface BuyerOffersViewProps {
  onOpenMakeOffer: (listing: ProduceListing) => void;
}

export const BuyerOffersView: React.FC<BuyerOffersViewProps> = ({ onOpenMakeOffer }) => {
  const { user } = useAuth();
  const { language, t, tDyn } = useI18n();

  const { offers, listings, favorites, toggleFavorite, rateDeal, updateOfferStatus } = useData();
  const uid = useId();

  const [activeTab, setActiveTab] = useState<'offers' | 'favorites'>('offers');
  const [ratingOffer, setRatingOffer] = useState<BuyerOffer | null>(null);
  const [selectedRating, setSelectedRating] = useState(5);
  const [reviewComment, setReviewComment] = useState(
    t('buyer.excellent_produce_quality_honest_scale'),
  );

  // TODO(api): GET /offers is already scoped to the caller by the server; this filter is only a safety net.
  const myOffers = offers.filter((o) => o.buyerId === user?.id);
  const favoriteListings = listings.filter((l) => favorites.includes(l.id));

  const handleRateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingOffer) return;
    const comment = reviewComment.trim();
    if (comment.length === 0 || comment.length > 500) return;
    const ok = await rateDeal(ratingOffer.id, selectedRating, comment);
    if (ok) setRatingOffer(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-emerald-950/10 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-display text-emerald-950">{user?.name}</h1>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {t('common.verifiedBuyer')} (
                {user?.buyerType ? tDyn('auth.buyer_type', user.buyerType) : ''})
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {t('buyer.track_crop_purchase_offers_negotiate')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-bold">
              {t('buyer.active_deals')}
              <strong className="text-slate-900">
                {myOffers.filter((o) => o.status === 'pending' || o.status === 'accepted').length}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('offers')}
          aria-pressed={activeTab === 'offers'}
          className={`px-4 min-h-12 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'offers'
              ? 'bg-white text-emerald-950 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {t('buyer.my_offers', { length: myOffers.length })}
        </button>

        <button
          onClick={() => setActiveTab('favorites')}
          aria-pressed={activeTab === 'favorites'}
          className={`px-4 min-h-12 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'favorites'
              ? 'bg-white text-emerald-950 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" aria-hidden="true" />
          <span>{t('buyer.saved_crops', { length: favoriteListings.length })}</span>
        </button>
      </div>

      {activeTab === 'offers' ? (
        <div className="space-y-3">
          {myOffers.length === 0 ? (
            <EmptyState title={t('buyer.no_offers_sent_yet')} />
          ) : (
            myOffers.map((offer) => {
              const isPending = offer.status === 'pending';
              const isAccepted = offer.status === 'accepted';
              const isCountered = offer.status === 'countered';
              const isCompleted = offer.status === 'completed';

              return (
                <div
                  key={offer.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{offer.cropName}</h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            isPending
                              ? 'bg-amber-100 text-amber-900'
                              : isAccepted
                                ? 'bg-emerald-100 text-emerald-900'
                                : isCountered
                                  ? 'bg-sky-100 text-sky-900'
                                  : isCompleted
                                    ? 'bg-purple-100 text-purple-900'
                                    : 'bg-rose-100 text-rose-900'
                          }`}
                        >
                          {tDyn('offer.status', offer.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span>
                          {t('buyer.farmer')}
                          <strong className="text-slate-800">{offer.farmerName}</strong>
                        </span>
                        <span>·</span>
                        <span>{formatDate(offer.createdAt, language)}</span>
                      </div>
                    </div>

                    <div className="text-start sm:text-end bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        {t('buyer.total_deal_value')}
                      </span>
                      <span className="text-base font-bold text-emerald-950 tabular-nums">
                        {t('common.currencyPrefix')} {formatNumber(offer.totalPrice)}
                      </span>
                      <span className="text-xs text-slate-500 block">
                        {formatNumber(offer.quantity)} {offer.unit} @ {t('common.currencyPrefix')}{' '}
                        {formatNumber(offer.offeredPricePerUnit)}
                      </span>
                    </div>
                  </div>

                  {offer.message && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        {t('buyer.your_message')}
                      </span>
                      <p className="italic leading-relaxed">&ldquo;{offer.message}&rdquo;</p>
                    </div>
                  )}

                  {/* If Farmer Countered */}
                  {isCountered && offer.counterPricePerUnit && (
                    <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-xs text-sky-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <strong>{t('buyer.farmer_countered')}</strong> {t('common.currencyPrefix')}{' '}
                        {formatNumber(offer.counterPricePerUnit)} / {offer.unit}
                        {offer.counterNote && (
                          <p className="italic text-sky-800 mt-0.5">{offer.counterNote}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => updateOfferStatus(offer.id, 'accepted')}
                          className="px-3 min-h-12 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg"
                        >
                          {t('common.acceptOffer')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions / Rating status */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    {/* Phone is only sent by the server once the offer is accepted/completed. */}
                    {offer.farmerPhone && (isAccepted || isCompleted) ? (
                      <a
                        href={telHref(offer.farmerPhone)}
                        className="inline-flex items-center gap-1.5 px-3 min-h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t('common.callFarmer')}</span>
                        <bdi dir="ltr" className="tabular-nums">
                          {offer.farmerPhone}
                        </bdi>
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-600">
                        {t('buyer.phone_after_accept')}
                      </span>
                    )}

                    <div className="flex items-center gap-2">
                      {isCompleted && !offer.ratingGiven && (
                        <button
                          onClick={() => setRatingOffer(offer)}
                          className="inline-flex items-center gap-1.5 px-3.5 min-h-12 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold rounded-lg shadow-xs transition-colors"
                        >
                          <Star className="w-3.5 h-3.5 fill-emerald-950" />
                          <span>{t('common.rateFarmer')}</span>
                        </button>
                      )}

                      {isCompleted && offer.ratingGiven && (
                        <span className="flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            {t('buyer.rated_5_stars', { ratingGiven: offer.ratingGiven })}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Favorites Grid */
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900">{t('buyer.saved_farm_produce')}</h2>

          {favoriteListings.length === 0 ? (
            <EmptyState title={t('buyer.no_saved_listings')} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favoriteListings.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-4 shadow-xs flex flex-col justify-between"
                >
                  <div className="flex items-start gap-3">
                    <SafeImage
                      src={item.imageUrl}
                      alt={item.cropName}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-100"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase">
                        {item.variety}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 truncate">{item.cropName}</h4>
                      <p className="text-xs font-bold text-emerald-900 mt-1 tabular-nums">
                        {t('common.currencyPrefix')} {formatNumber(item.pricePerUnit)} / {item.unit}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {item.farmerName} · {item.farmerLocation.district}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => toggleFavorite(item.id)}
                      className="text-xs text-rose-700 hover:text-rose-900 font-bold min-h-12 px-2"
                    >
                      {t('buyer.remove')}
                    </button>
                    <button
                      onClick={() => onOpenMakeOffer(item)}
                      className="px-3 min-h-12 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition-colors"
                    >
                      {t('common.makeOfferBtn')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Farmer Rating Dialog */}
      {ratingOffer && (
        <Modal
          onClose={() => setRatingOffer(null)}
          label={t('buyer.rate_farmer', { farmerName: ratingOffer.farmerName })}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 font-display">
              {t('buyer.rate_farmer', { farmerName: ratingOffer.farmerName })}
            </h3>
            <CloseButton onClick={() => setRatingOffer(null)} />
          </div>

          <form onSubmit={handleRateSubmit} className="mt-4 space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              {t('buyer.your_review_helps_other_buyers')}
            </p>

            <fieldset>
              <legend className="block text-xs font-bold text-slate-700 mb-2">
                {t('buyer.rating_1_to_5_stars')}
              </legend>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    aria-label={t('a11y.stars', { n: star })}
                    aria-pressed={star === selectedRating}
                    onClick={() => setSelectedRating(star)}
                    className="min-w-12 min-h-12 flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-7 h-7 ${star <= selectedRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                      aria-hidden="true"
                    />
                  </button>
                ))}
                <span className="ms-2 text-sm font-bold text-slate-800 tabular-nums">
                  {selectedRating} / 5
                </span>
              </div>
            </fieldset>

            <div>
              <label
                htmlFor={`${uid}-review`}
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                {t('buyer.feedback_comments')}
              </label>
              <textarea
                id={`${uid}-review`}
                rows={3}
                required
                maxLength={500}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full p-2.5 text-xs text-slate-800 border border-slate-300 rounded-xl outline-none focus:border-emerald-600"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRatingOffer(null)}
                className="px-3 min-h-12 text-xs font-medium text-slate-700 hover:text-slate-900"
              >
                {t('buyer.cancel')}
              </button>
              <button
                type="submit"
                className="px-5 min-h-12 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl"
              >
                {t('buyer.submit_review')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
