import { useId, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { BuyerOffer } from '@/types';
import {
  Plus,
  Tractor,
  CheckCircle2,
  Trash2,
  MapPin,
  Star,
  Check,
  Volume2,
  Phone,
  MessageSquare,
} from 'lucide-react';
import { formatNumber, formatDate } from '@/utils/format';
import { inRange, LIMITS, telHref } from '@/utils/validators';
import { Modal } from '@/components/Modal';
import { CloseButton } from '@/components/CloseButton';
import { SafeImage } from '@/components/SafeImage';
import { EmptyState } from '@/components/EmptyState';
import { useData } from '@/context/DataContext';
import { useI18n } from '@/i18n/I18nContext';
import { useSpeech } from '@/hooks/useSpeech';

interface FarmerDashboardProps {
  onOpenCreateListing: () => void;
}

export const FarmerDashboard: React.FC<FarmerDashboardProps> = ({ onOpenCreateListing }) => {
  const { user } = useAuth();
  const { t, tDyn, language } = useI18n();
  const uid = useId();
  const { readAloud } = useSpeech();
  const { myListings, offers, deleteListing, updateOfferStatus } = useData();

  const [activeTab, setActiveTab] = useState<'listings' | 'offers' | 'history'>('listings');
  const [counterModalOffer, setCounterModalOffer] = useState<BuyerOffer | null>(null);
  const [counterPrice, setCounterPrice] = useState<number>(0);
  const [counterNote, setCounterNote] = useState('');

  // TODO(api): GET /listings/mine and GET /offers are already scoped to the caller by the server.
  const myOffers = offers.filter((o) => o.farmerId === user?.id);
  const completedDeals = myOffers.filter((o) => o.status === 'completed');

  const pendingOffers = myOffers.filter((o) => o.status === 'pending');

  const totalActiveVolume = myListings
    .filter((l) => l.status === 'active')
    .reduce((acc, curr) => acc + curr.quantity, 0);

  const completedRevenue = completedDeals.reduce((acc, curr) => acc + curr.totalPrice, 0);

  const handleReadFarmerStatus = () => {
    const text = t('farmer.farmer_hub_farmer_you_have', {
      name: user?.name ?? '',
      length: myListings.length,
      length2: pendingOffers.length,
    });
    readAloud(text);
  };

  const handleOpenCounter = (offer: BuyerOffer) => {
    setCounterModalOffer(offer);
    setCounterPrice(offer.listingPricePerUnit);
    setCounterNote(
      t('farmer.i_can_meet_you_halfway', {
        listingPricePerUnit: formatNumber(offer.listingPricePerUnit),
        unit: offer.unit,
      }),
    );
  };

  const handleSendCounter = async () => {
    if (!counterModalOffer) return;
    if (!inRange(counterPrice, LIMITS.price.min, LIMITS.price.max)) return;
    await updateOfferStatus(counterModalOffer.id, 'countered', {
      counterPrice,
      counterNote: counterNote.trim().slice(0, LIMITS.textLong),
    });
    setCounterModalOffer(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Profile Summary Bar */}
      <div className="bg-white rounded-2xl border border-emerald-950/10 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-sm">
              <Tractor className="w-7 h-7 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-display text-emerald-950">{user?.name}</h1>
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {t('common.verifiedFarmer')}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 mt-1">
                <span>
                  {t('farmer.phone')} <strong className="text-slate-800">{user?.phone}</strong>
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {user?.location.district}
                </span>
                <span>·</span>
                <span>
                  {t('farmer.farm_size')}{' '}
                  <strong className="text-slate-800">
                    {user?.farmSizeAcres ?? '—'} {t('farmer.acres')}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReadFarmerStatus}
              className="px-3 min-h-12 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold text-xs rounded-xl flex items-center gap-1"
            >
              <Volume2 className="w-4 h-4 text-emerald-700" />
              <span>{t('common.listenVoice')}</span>
            </button>

            <button
              onClick={onOpenCreateListing}
              className="inline-flex items-center justify-center gap-2 px-4 min-h-12 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-colors shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{t('common.postProduceBtn')}</span>
            </button>
          </div>
        </div>

        {/* Crops Grown strip */}
        {user?.cropsGrown && user.cropsGrown.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-bold">{t('farmer.registered_crops')}</span>
            {user.cropsGrown.map((crop) => (
              <span
                key={crop}
                className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg font-semibold text-xs"
              >
                {crop}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-emerald-950/10 shadow-xs">
          <span className="text-xs text-slate-500 font-bold block">
            {t('farmer.active_produce_listed')}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-display text-emerald-950 tabular-nums">
              {myListings.filter((l) => l.status === 'active').length}
            </span>
            <span className="text-xs text-slate-500">{t('farmer.batches')}</span>
          </div>
          <span className="text-[11px] text-emerald-700 mt-1 block">
            {formatNumber(totalActiveVolume)} {t('farmer.units_available')}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-950/10 shadow-xs">
          <span className="text-xs text-slate-500 font-bold block">
            {t('farmer.pending_buyer_offers')}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-display text-amber-700 tabular-nums">
              {pendingOffers.length}
            </span>
            <span className="text-xs text-slate-500">{t('farmer.requests')}</span>
          </div>
          <span className="text-[11px] text-amber-700 mt-1 block font-bold">
            {t('farmer.requires_your_review')}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-950/10 shadow-xs">
          <span className="text-xs text-slate-500 font-bold block">
            {t('farmer.deals_completed')}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-display text-emerald-950 tabular-nums">
              {completedDeals.length}
            </span>
            <span className="text-xs text-slate-500">{t('admin.transactions')}</span>
          </div>
          <span className="text-[11px] text-emerald-700 mt-1 block font-medium">
            {t('farmer.direct_payment_received')}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-950/10 shadow-xs">
          <span className="text-xs text-slate-500 font-bold block">
            {t('farmer.gross_sales_value')}
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xs font-bold text-slate-500">{t('common.currencyPrefix')}</span>
            <span className="text-2xl font-bold font-display text-emerald-950 tabular-nums">
              {formatNumber(completedRevenue)}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {t('farmer.zero_middleman_deductions')}
          </span>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('listings')}
          aria-pressed={activeTab === 'listings'}
          className={`px-4 min-h-12 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'listings'
              ? 'bg-white text-emerald-950 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {t('farmer.my_listings', { length: myListings.length })}
        </button>

        <button
          onClick={() => setActiveTab('offers')}
          aria-pressed={activeTab === 'offers'}
          className={`px-4 min-h-12 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'offers'
              ? 'bg-white text-emerald-950 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>{t('farmer.incoming_offers')}</span>
          {pendingOffers.length > 0 && (
            <span className="px-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
              {pendingOffers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          aria-pressed={activeTab === 'history'}
          className={`px-4 min-h-12 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'history'
              ? 'bg-white text-emerald-950 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {t('farmer.sales_history', { length: completedDeals.length })}
        </button>
      </div>

      {/* Tab 1: My Produce Listings */}
      {activeTab === 'listings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              {t('farmer.your_active_crops_for_sale')}
            </h2>
            <button
              onClick={onOpenCreateListing}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 min-h-12 px-2"
            >
              <Plus className="w-3.5 h-3.5" /> {t('common.postProduceBtn')}
            </button>
          </div>

          {myListings.length === 0 ? (
            <EmptyState
              title={t('farmer.no_produce_listed_yet')}
              action={
                <button
                  onClick={onOpenCreateListing}
                  className="px-4 min-h-12 bg-emerald-700 text-white text-xs font-bold rounded-xl"
                >
                  {t('common.postProduceBtn')}
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myListings.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-emerald-950/10 p-4 shadow-xs flex flex-col justify-between"
                >
                  <div className="flex items-start gap-3.5">
                    <SafeImage
                      src={item.imageUrl}
                      alt={item.cropName}
                      className="w-20 h-20 rounded-xl object-cover shrink-0 border border-slate-100"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-700 uppercase">
                          {item.variety}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.status === 'active'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : item.status === 'pending_offer'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.status === 'active'
                            ? t('farmer.active')
                            : item.status === 'pending_offer'
                              ? t('farmer.in_negotiation')
                              : tDyn('listing.status', item.status)}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 truncate mt-0.5">
                        {item.cropName}
                      </h3>

                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <span>
                          {t('common.availableStock')}:{' '}
                          <strong className="text-slate-800 tabular-nums">{item.quantity}</strong>{' '}
                          {item.unit}
                        </span>
                        <span>·</span>
                        <span className="tabular-nums font-bold text-emerald-800">
                          {t('common.currencyPrefix')} {formatNumber(item.pricePerUnit)} /{' '}
                          {item.unit}
                        </span>
                      </p>

                      <p className="text-[11px] text-slate-500 mt-1">
                        {t('common.harvestDate')}: {formatDate(item.harvestDate, language)} ·{' '}
                        {t('common.minOrder')}: {item.minOrderQuantity}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">
                      {formatDate(item.createdAt, language)}
                    </span>
                    <button
                      onClick={() => deleteListing(item.id)}
                      className="text-slate-500 hover:text-rose-700 transition-colors min-w-12 min-h-12 flex items-center justify-center"
                      aria-label={t('farmer.remove_listing')}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Incoming Offers */}
      {activeTab === 'offers' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900">{t('farmer.buyer_offers_inquiries')}</h2>

          {myOffers.length === 0 ? (
            <EmptyState title={t('farmer.no_offers_received_yet')} />
          ) : (
            <div className="space-y-3">
              {myOffers.map((offer) => {
                const isPending = offer.status === 'pending';
                const isAccepted = offer.status === 'accepted';
                const isCountered = offer.status === 'countered';

                return (
                  <div
                    key={offer.id}
                    className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs transition-all ${
                      isPending ? 'border-amber-300 ring-1 ring-amber-100' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{offer.buyerName}</h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              isPending
                                ? 'bg-amber-100 text-amber-900'
                                : isAccepted
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : isCountered
                                    ? 'bg-sky-100 text-sky-900'
                                    : 'bg-slate-100 text-slate-900'
                            }`}
                          >
                            {tDyn('offer.status', offer.status)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500 mt-1">
                          <span>{offer.cropName}</span>
                          <span>·</span>
                          <span>{formatDate(offer.createdAt, language)}</span>
                        </div>
                      </div>

                      {/* Offer Price summary */}
                      <div className="text-start sm:text-end bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">
                          {t('farmer.offered_deal_value')}
                        </span>
                        <div className="text-base font-bold text-emerald-900 tabular-nums">
                          {t('common.currencyPrefix')} {formatNumber(offer.totalPrice)}
                        </div>
                        <div className="text-xs text-slate-600">
                          {formatNumber(offer.quantity)} {offer.unit} @ {t('common.currencyPrefix')}{' '}
                          {formatNumber(offer.offeredPricePerUnit)}
                        </div>
                      </div>
                    </div>

                    {offer.message && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 flex items-start gap-2">
                        <MessageSquare
                          className="w-4 h-4 text-slate-400 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <span className="italic leading-relaxed">
                          &ldquo;{offer.message}&rdquo;
                        </span>
                      </div>
                    )}

                    {offer.counterPricePerUnit && (
                      <div className="mt-2 p-2.5 bg-sky-50 rounded-xl border border-sky-200 text-xs text-sky-950">
                        <strong>{t('farmer.your_counter')}</strong> {t('common.currencyPrefix')}{' '}
                        {formatNumber(offer.counterPricePerUnit)} / {offer.unit}
                        {offer.counterNote && (
                          <p className="mt-0.5 italic text-sky-800">{offer.counterNote}</p>
                        )}
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      {/* Buyer phone is only sent by the server once the offer is accepted/completed. */}
                      {offer.buyerPhone && (isAccepted || offer.status === 'completed') ? (
                        <a
                          href={telHref(offer.buyerPhone)}
                          className="px-3 min-h-12 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{t('farmer.call_buyer')}</span>
                          <bdi dir="ltr" className="tabular-nums">
                            {offer.buyerPhone}
                          </bdi>
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-600">
                          {t('farmer.phone_after_accept')}
                        </span>
                      )}

                      <div className="flex items-center gap-2">
                        {isPending && (
                          <>
                            <button
                              onClick={() => updateOfferStatus(offer.id, 'rejected')}
                              className="px-3 min-h-12 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                            >
                              {t('common.declineOffer')}
                            </button>
                            <button
                              onClick={() => handleOpenCounter(offer)}
                              className="px-3 min-h-12 text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors"
                            >
                              {t('common.counterOffer')}
                            </button>
                            <button
                              onClick={() => updateOfferStatus(offer.id, 'accepted')}
                              className="px-4 min-h-12 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-xs"
                            >
                              {t('common.acceptOffer')}
                            </button>
                          </>
                        )}

                        {isAccepted && (
                          <button
                            onClick={() => updateOfferStatus(offer.id, 'completed')}
                            className="px-4 min-h-12 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{t('common.markCompleted')}</span>
                          </button>
                        )}

                        {offer.status === 'completed' && (
                          <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> {t('common.dealFinalized')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Sales History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900">
            {t('farmer.completed_produce_sales_history')}
          </h2>

          {completedDeals.length === 0 ? (
            <EmptyState title={t('farmer.no_completed_deals_yet')} />
          ) : (
            <div className="space-y-3">
              {completedDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{deal.cropName}</span>
                      <span className="text-slate-500 block">
                        {t('farmer.sold_to', { buyerName: deal.buyerName })}
                      </span>
                    </div>
                    <div className="text-end">
                      <span className="text-sm font-bold text-emerald-900 tabular-nums">
                        {t('common.currencyPrefix')} {formatNumber(deal.totalPrice)}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {formatNumber(deal.quantity)} {deal.unit} @ {t('common.currencyPrefix')}{' '}
                        {formatNumber(deal.offeredPricePerUnit)}
                      </span>
                    </div>
                  </div>

                  {deal.ratingGiven && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs">
                      <div className="flex items-center gap-1 text-amber-700 font-bold mb-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>
                          {t('farmer.buyer_rating_5_stars', { ratingGiven: deal.ratingGiven })}
                        </span>
                      </div>
                      {deal.reviewComment && (
                        <p className="text-slate-700 italic">&ldquo;{deal.reviewComment}&rdquo;</p>
                      )}
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                    <span>{deal.completedAt ? formatDate(deal.completedAt, language) : ''}</span>
                    <span className="text-emerald-700 font-bold">
                      {t('farmer.direct_payment_received_2')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Counter Offer Modal */}
      {counterModalOffer && (
        <Modal
          onClose={() => setCounterModalOffer(null)}
          label={t('farmer.counter_offer_to', { buyerName: counterModalOffer.buyerName })}
        >
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-base font-bold text-slate-900 font-display">
              {t('farmer.counter_offer_to', { buyerName: counterModalOffer.buyerName })}
            </h3>
            <CloseButton onClick={() => setCounterModalOffer(null)} />
          </div>
          <p className="text-xs text-slate-600 mb-4">
            {t('farmer.buyer_proposed_pkr', {
              offeredPricePerUnit: formatNumber(counterModalOffer.offeredPricePerUnit),
              unit: counterModalOffer.unit,
              currencyPrefix: t('common.currencyPrefix'),
            })}
          </p>

          <div className="space-y-3">
            <div>
              <label
                htmlFor={`${uid}-cprice`}
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                {t('farmer.your_counter_rate', { unit: counterModalOffer.unit })}
              </label>
              <input
                id={`${uid}-cprice`}
                type="number"
                inputMode="numeric"
                min={LIMITS.price.min}
                max={LIMITS.price.max}
                value={counterPrice}
                onChange={(e) => setCounterPrice(Math.round(Number(e.target.value)) || 0)}
                className="w-full px-3 min-h-12 text-sm border border-slate-300 rounded-xl outline-none font-bold tabular-nums focus:border-emerald-600"
              />
            </div>

            <div>
              <label
                htmlFor={`${uid}-cnote`}
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                {t('farmer.note_to_buyer')}
              </label>
              <textarea
                id={`${uid}-cnote`}
                rows={2}
                maxLength={LIMITS.textLong}
                value={counterNote}
                onChange={(e) => setCounterNote(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-xl outline-none focus:border-emerald-600"
              />
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-900 flex justify-between font-bold">
              <span>{t('farmer.revised_deal_total')}</span>
              {/* Display only: the server recomputes the total. */}
              <span className="tabular-nums">
                {t('common.currencyPrefix')}{' '}
                {formatNumber(counterPrice * counterModalOffer.quantity)}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              onClick={() => setCounterModalOffer(null)}
              className="px-3 min-h-12 text-xs font-medium text-slate-700 hover:text-slate-900"
            >
              {t('buyer.cancel')}
            </button>
            <button
              onClick={handleSendCounter}
              disabled={!inRange(counterPrice, LIMITS.price.min, LIMITS.price.max)}
              className="px-4 min-h-12 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl disabled:opacity-50"
            >
              {t('common.counterOffer')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
