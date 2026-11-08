import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { ArticleCategory, MarketPrice } from '@/types';
import { ShieldCheck, Plus, Trash2 } from 'lucide-react';
import { formatNumber, formatDate } from '@/utils/format';
import { inRange, LIMITS } from '@/utils/validators';
import { useData } from '@/context/DataContext';
import { useI18n } from '@/i18n/I18nContext';
import { Modal } from '@/components/Modal';
import { CloseButton } from '@/components/CloseButton';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/context/ToastContext';

type AdminTab = 'overview' | 'users' | 'listings' | 'prices' | 'articles';
const ARTICLE_CATEGORIES: ArticleCategory[] = [
  'Planting Calendars',
  'Pest & Disease Control',
  'Soil Fertility',
  'Post-Harvest Storage',
];

const th = 'py-3 px-4 text-start';
const thEnd = 'py-3 px-4 text-end';
const field =
  'w-full px-3 min-h-12 text-sm border border-slate-300 rounded-xl outline-none focus:border-emerald-600 bg-white';
const smallBtn = 'px-3 min-h-12 rounded-lg font-semibold transition-colors';

// TODO(api): admin-only endpoints. The server must enforce the admin role; this screen is only hidden by a UX route guard.
export const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const { t, tDyn, language } = useI18n();
  const { showToast } = useToast();
  const uid = useId();
  const {
    allUsers,
    adminListings,
    marketPrices,
    articles,
    stats,
    toggleUserVerification,
    toggleListingModeration,
    updateMarketPrice,
    createArticle,
    deleteListing,
  } = useData();

  const [tab, setTab] = useState<AdminTab>('overview');

  const [showNewArticle, setShowNewArticle] = useState(false);
  const [artTitle, setArtTitle] = useState('');
  const [artCategory, setArtCategory] = useState<ArticleCategory>('Pest & Disease Control');
  const [artCropTag, setArtCropTag] = useState('');
  const [artSummary, setArtSummary] = useState('');
  const [artContent, setArtContent] = useState('');
  const [artRecs, setArtRecs] = useState('');
  const [artError, setArtError] = useState<string | null>(null);

  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editWholesale, setEditWholesale] = useState(0);
  const [editRetail, setEditRetail] = useState(0);

  const listings = adminListings;
  const pendingUsers = allUsers.filter((u) => !u.isVerified);

  const handlePublishArticle = async (e: FormEvent) => {
    e.preventDefault();
    setArtError(null);
    const content = artContent
      .split('\n\n')
      .map((p) => p.trim())
      .filter(Boolean);
    if (!artTitle.trim() || !artCropTag.trim() || !artSummary.trim() || content.length === 0) {
      setArtError(t('adm.err_article'));
      return;
    }
    // Plain text only: articles are rendered as text, never as HTML. The server sets the author.
    const ok = await createArticle({
      title: artTitle.trim(),
      category: artCategory,
      cropTag: artCropTag.trim(),
      summary: artSummary.trim(),
      content,
      keyRecommendations: artRecs
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean),
    });
    if (!ok) return;
    setShowNewArticle(false);
    setArtTitle('');
    setArtCropTag('');
    setArtSummary('');
    setArtContent('');
    setArtRecs('');
  };

  const handleStartPriceEdit = (p: MarketPrice) => {
    setEditingPriceId(p.id);
    setEditWholesale(p.wholesalePrice);
    setEditRetail(p.retailPrice);
  };

  const handleSavePrice = async (p: MarketPrice) => {
    if (
      !inRange(editWholesale, LIMITS.price.min, LIMITS.price.max) ||
      !inRange(editRetail, LIMITS.price.min, LIMITS.price.max)
    ) {
      showToast(t('adm.err_price'), 'error');
      return;
    }
    const ok = await updateMarketPrice(p.id, editWholesale, editRetail);
    if (ok) setEditingPriceId(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t('adm.confirm_delete'))) void deleteListing(id);
  };

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'overview', label: t('admin.overview') },
    { id: 'users', label: t('admin.user_verification', { length: allUsers.length }) },
    { id: 'listings', label: t('admin.listings_moderation', { length: listings.length }) },
    { id: 'prices', label: t('admin.daily_prices_board', { length: marketPrices.length }) },
    { id: 'articles', label: t('admin.articles_advice', { length: articles.length }) },
  ];

  const verifyBadge = (v: boolean) => (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-bold ${v ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}
    >
      {v ? t('adm.verified') : t('adm.unverified')}
    </span>
  );

  const kpi = (label: string, value: string, sub: string, valueClass = 'text-slate-900') => (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
      <span className="text-xs text-slate-600 font-bold block">{label}</span>
      <div className="flex items-baseline gap-2 mt-1">
        <span className={`text-2xl font-bold font-display tabular-nums ${valueClass}`}>
          {value}
        </span>
      </div>
      <span className="text-[11px] text-slate-600 mt-1 block">{sub}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-emerald-950/10 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6 text-emerald-400" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-display text-emerald-950">
                  {t('admin.market_administration_console')}
                </h1>
                <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                  {t('admin.super_admin')}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {t('admin.moderator_punjab_agriculture_marketing_b', { name: user?.name ?? '' })}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowNewArticle(true)}
            className="inline-flex items-center gap-1.5 px-3.5 min-h-12 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('admin.publish_advisory_article')}</span>
          </button>
        </div>
      </div>

      {/* Counts come from the server (GET /admin/stats); never derived from client-side lists. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpi(
          t('admin.total_registered_users'),
          formatNumber((stats?.farmers ?? 0) + (stats?.buyers ?? 0)),
          `${formatNumber(stats?.farmers ?? 0)} ${t('admin.farmers')} · ${formatNumber(stats?.buyers ?? 0)} ${t('admin.buyers')} · ${formatNumber(stats?.pendingVerifications ?? 0)} ${t('admin.pending_verification')}`,
        )}
        {kpi(
          t('admin.active_produce_listings'),
          formatNumber(stats?.activeListings ?? 0),
          t('admin.live_on_market'),
          'text-emerald-950',
        )}
        {kpi(
          t('admin.completed_deals'),
          formatNumber(stats?.completedOffers ?? 0),
          t('admin.transactions'),
        )}
        {kpi(
          t('admin.total_facilitated_volume'),
          `${t('common.currencyPrefix')} ${formatNumber(stats?.completedValue ?? 0)}`,
          t('admin.direct_farmer_gate_revenue'),
          'text-emerald-950',
        )}
      </div>

      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto scrollbar-none w-fit max-w-full">
        {tabs.map((x) => (
          <button
            key={x.id}
            onClick={() => setTab(x.id)}
            aria-pressed={tab === x.id}
            className={`px-4 min-h-12 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              tab === x.id
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">{t('adm.pending_users')}</h3>
            {pendingUsers.length === 0 ? (
              <EmptyState title={t('state.no_results')} />
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingUsers.slice(0, 6).map((u) => (
                  <div
                    key={u.id}
                    className="py-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 block truncate">{u.name}</span>
                      <span className="text-slate-600">
                        {tDyn('role', u.role)} · {u.location.district}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleUserVerification(u.id)}
                      className={`${smallBtn} bg-amber-50 text-amber-900 border border-amber-200`}
                    >
                      {t('adm.verify')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">{t('adm.latest_listings')}</h3>
            <div className="divide-y divide-slate-100">
              {listings.slice(0, 5).map((l) => (
                <div key={l.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="min-w-0 pe-2">
                    <span className="font-bold text-slate-900 block truncate">{l.cropName}</span>
                    <span className="text-slate-600 block truncate">
                      {l.farmerName} · {t('common.currencyPrefix')} {formatNumber(l.pricePerUnit)} /{' '}
                      {l.unit}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleListingModeration(l.id)}
                      className={`${smallBtn} ${l.isModerated ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}
                    >
                      {l.isModerated ? t('adm.approved') : t('adm.pending')}
                    </button>
                    <button
                      onClick={() => handleDelete(l.id)}
                      className="min-w-12 min-h-12 flex items-center justify-center text-slate-500 hover:text-rose-700"
                      aria-label={t('adm.remove_listing')}
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">{t('adm.users_title')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th scope="col" className={th}>
                    {t('adm.col_name')}
                  </th>
                  <th scope="col" className={th}>
                    {t('adm.col_role')}
                  </th>
                  <th scope="col" className={th}>
                    {t('adm.col_phone')}
                  </th>
                  <th scope="col" className={th}>
                    {t('adm.col_location')}
                  </th>
                  <th scope="col" className={th}>
                    {t('adm.col_details')}
                  </th>
                  <th scope="col" className="py-3 px-4 text-center">
                    {t('adm.col_status')}
                  </th>
                  <th scope="col" className={thEnd}>
                    {t('adm.col_action')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{u.name}</td>
                    <td className="py-3 px-4 font-medium">{tDyn('role', u.role)}</td>
                    <td className="py-3 px-4 text-slate-700">
                      <bdi dir="ltr" className="tabular-nums">
                        {u.phone}
                      </bdi>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {u.location.tehsil}, {u.location.district}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {u.role === 'farmer'
                        ? u.farmSizeAcres
                          ? t('adm.acres', { n: formatNumber(u.farmSizeAcres) })
                          : '—'
                        : u.buyerType
                          ? tDyn('auth.buyer_type', u.buyerType)
                          : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">{verifyBadge(u.isVerified)}</td>
                    <td className="py-3 px-4 text-end">
                      <button
                        onClick={() => toggleUserVerification(u.id)}
                        className={`${smallBtn} bg-slate-100 hover:bg-slate-200 text-slate-800`}
                      >
                        {u.isVerified ? t('adm.revoke') : t('adm.approve')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'listings' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">{t('adm.listings_title')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th scope="col" className={th}>
                    {t('adm.col_crop')}
                  </th>
                  <th scope="col" className={th}>
                    {t('adm.col_farmer')}
                  </th>
                  <th scope="col" className={th}>
                    {t('adm.col_volume')}
                  </th>
                  <th scope="col" className={thEnd}>
                    {t('adm.col_price')}
                  </th>
                  <th scope="col" className={th}>
                    {t('adm.col_harvest')}
                  </th>
                  <th scope="col" className="py-3 px-4 text-center">
                    {t('adm.col_moderation')}
                  </th>
                  <th scope="col" className={thEnd}>
                    {t('adm.col_action')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listings.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{l.cropName}</td>
                    <td className="py-3 px-4 text-slate-700">{l.farmerName}</td>
                    <td className="py-3 px-4 text-slate-700 tabular-nums">
                      {formatNumber(l.quantity)} {l.unit}
                    </td>
                    <td className="py-3 px-4 text-end font-bold text-emerald-900 tabular-nums">
                      {t('common.currencyPrefix')} {formatNumber(l.pricePerUnit)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {formatDate(l.harvestDate, language)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${l.isModerated ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}
                      >
                        {l.isModerated ? t('adm.approved') : t('adm.flagged')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-end">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleListingModeration(l.id)}
                          className={`${smallBtn} text-slate-800 bg-slate-100 hover:bg-slate-200`}
                        >
                          {l.isModerated ? t('adm.flag') : t('adm.approve')}
                        </button>
                        <button
                          onClick={() => handleDelete(l.id)}
                          className={`${smallBtn} text-rose-800 bg-rose-50 hover:bg-rose-100`}
                        >
                          {t('adm.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'prices' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">{t('adm.prices_title')}</h3>
            <p className="text-xs text-slate-600">{t('adm.prices_hint')}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th scope="col" className={th}>
                    {t('adm.col_crop')}
                  </th>
                  <th scope="col" className={th}>
                    {t('adm.col_market')}
                  </th>
                  <th scope="col" className={th}>
                    {t('adm.col_unit')}
                  </th>
                  <th scope="col" className={thEnd}>
                    {t('adm.col_wholesale')}
                  </th>
                  <th scope="col" className={thEnd}>
                    {t('adm.col_retail')}
                  </th>
                  <th scope="col" className={thEnd}>
                    {t('adm.col_action')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {marketPrices.map((p) => {
                  const isEditing = editingPriceId === p.id;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{p.cropName}</td>
                      <td className="py-3 px-4 text-slate-700">{p.marketName}</td>
                      <td className="py-3 px-4 text-slate-600">{p.unit}</td>
                      <td className="py-3 px-4 text-end font-bold text-emerald-900 tabular-nums">
                        {isEditing ? (
                          <input
                            id={`${uid}-w-${p.id}`}
                            aria-label={t('adm.col_wholesale')}
                            type="number"
                            inputMode="numeric"
                            min={LIMITS.price.min}
                            max={LIMITS.price.max}
                            value={editWholesale}
                            onChange={(e) =>
                              setEditWholesale(Math.round(Number(e.target.value)) || 0)
                            }
                            className="w-28 px-2 min-h-12 text-end border border-emerald-600 rounded outline-none font-bold"
                          />
                        ) : (
                          `${t('common.currencyPrefix')} ${formatNumber(p.wholesalePrice)}`
                        )}
                      </td>
                      <td className="py-3 px-4 text-end font-medium text-slate-800 tabular-nums">
                        {isEditing ? (
                          <input
                            aria-label={t('adm.col_retail')}
                            type="number"
                            inputMode="numeric"
                            min={LIMITS.price.min}
                            max={LIMITS.price.max}
                            value={editRetail}
                            onChange={(e) => setEditRetail(Math.round(Number(e.target.value)) || 0)}
                            className="w-28 px-2 min-h-12 text-end border border-emerald-600 rounded outline-none font-bold"
                          />
                        ) : (
                          `${t('common.currencyPrefix')} ${formatNumber(p.retailPrice)}`
                        )}
                      </td>
                      <td className="py-3 px-4 text-end">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleSavePrice(p)}
                              className={`${smallBtn} bg-emerald-700 text-white`}
                            >
                              {t('adm.save')}
                            </button>
                            <button
                              onClick={() => setEditingPriceId(null)}
                              className={`${smallBtn} text-slate-700 hover:text-slate-900`}
                            >
                              {t('adm.cancel')}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartPriceEdit(p)}
                            className={`${smallBtn} bg-emerald-50 hover:bg-emerald-100 text-emerald-800`}
                          >
                            {t('adm.edit')}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'articles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">{t('adm.articles_title')}</h3>
            <button
              onClick={() => setShowNewArticle(true)}
              className="px-3.5 min-h-12 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl"
            >
              {t('adm.create_article')}
            </button>
          </div>
          {articles.length === 0 ? (
            <EmptyState title={t('state.no_results')} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {articles.map((art) => (
                <div
                  key={art.id}
                  className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2"
                >
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">
                    {tDyn('article.cat', art.category)}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">{art.title}</h4>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {art.summary}
                  </p>
                  <div className="text-[11px] text-slate-600 pt-2 border-t border-slate-100 flex justify-between">
                    <span>{t('adm.author', { name: art.author })}</span>
                    <span>{formatDate(art.publishedDate, language)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showNewArticle && (
        <Modal
          onClose={() => setShowNewArticle(false)}
          label={t('adm.new_article')}
          className="max-w-xl"
          scroll
        >
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-base font-bold text-slate-900 font-display">
              {t('adm.new_article')}
            </h3>
            <CloseButton onClick={() => setShowNewArticle(false)} />
          </div>
          <p className="text-xs text-slate-600 mb-4">{t('adm.new_article_hint')}</p>

          {artError && (
            <div
              role="alert"
              className="mb-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold"
            >
              {artError}
            </div>
          )}

          <form
            onSubmit={handlePublishArticle}
            className="space-y-3 max-h-[60vh] overflow-y-auto pe-1"
            noValidate
          >
            <div>
              <label
                htmlFor={`${uid}-at`}
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                {t('adm.art_title')}
              </label>
              <input
                id={`${uid}-at`}
                type="text"
                required
                maxLength={150}
                value={artTitle}
                onChange={(e) => setArtTitle(e.target.value)}
                placeholder={t('adm.art_title_ph')}
                className={field}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor={`${uid}-ac`}
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  {t('adm.art_category')}
                </label>
                <select
                  id={`${uid}-ac`}
                  value={artCategory}
                  onChange={(e) => setArtCategory(e.target.value as ArticleCategory)}
                  className={field}
                >
                  {ARTICLE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {tDyn('article.cat', c)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor={`${uid}-ct`}
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  {t('adm.art_crop')}
                </label>
                <input
                  id={`${uid}-ct`}
                  type="text"
                  required
                  maxLength={LIMITS.textShort}
                  value={artCropTag}
                  onChange={(e) => setArtCropTag(e.target.value)}
                  placeholder={t('adm.art_crop_ph')}
                  className={field}
                />
              </div>
            </div>
            <div>
              <label
                htmlFor={`${uid}-as`}
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                {t('adm.art_summary')}
              </label>
              <textarea
                id={`${uid}-as`}
                rows={2}
                required
                maxLength={400}
                value={artSummary}
                onChange={(e) => setArtSummary(e.target.value)}
                placeholder={t('adm.art_summary_ph')}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-xl outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label
                htmlFor={`${uid}-ab`}
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                {t('adm.art_content')}
              </label>
              <textarea
                id={`${uid}-ab`}
                rows={4}
                required
                maxLength={10000}
                value={artContent}
                onChange={(e) => setArtContent(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-xl outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label
                htmlFor={`${uid}-ar`}
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                {t('adm.art_recs')}
              </label>
              <textarea
                id={`${uid}-ar`}
                rows={3}
                maxLength={2000}
                value={artRecs}
                onChange={(e) => setArtRecs(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-xl outline-none focus:border-emerald-600"
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewArticle(false)}
                className="px-3 min-h-12 text-xs font-medium text-slate-700 hover:text-slate-900"
              >
                {t('adm.cancel')}
              </button>
              <button
                type="submit"
                className="px-4 min-h-12 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl"
              >
                {t('adm.publish')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
