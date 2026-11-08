import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { MarketPrice } from '@/types';
import {
  TrendingUp,
  Bell,
  Plus,
  Trash2,
  Edit2,
  Volume2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { formatNumber, formatDateTime } from '@/utils/format';
import { inRange, LIMITS } from '@/utils/validators';
import { Modal } from '@/components/Modal';
import { CloseButton } from '@/components/CloseButton';
import { useData } from '@/context/DataContext';
import { useI18n } from '@/i18n/I18nContext';
import { useSpeech } from '@/hooks/useSpeech';
import { useToast } from '@/context/ToastContext';

export const PriceBoardView: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const uid = useId();
  const { readAloud } = useSpeech();
  const { showToast } = useToast();
  const { marketPrices, priceAlerts, createPriceAlert, deletePriceAlert, updateMarketPrice } =
    useData();

  const [selectedCrop, setSelectedCrop] = useState<string>(marketPrices[0]?.cropName ?? '');
  const [selectedMarket, setSelectedMarket] = useState<string>('All');
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [alertTargetPrice, setAlertTargetPrice] = useState<number>(0);
  const [alertCondition, setAlertCondition] = useState<'above' | 'below'>('above');
  const [editingPrice, setEditingPrice] = useState<MarketPrice | null>(null);
  const [editWholesale, setEditWholesale] = useState<number>(0);
  const [editRetail, setEditRetail] = useState<number>(0);

  // Alerts are per-user; the server already scopes GET /price-alerts (TODO(api) confirm).
  const myAlerts = priceAlerts.filter((a) => a.userId === user?.id);
  const uniqueCrops = Array.from(new Set(marketPrices.map((p) => p.cropName)));
  const uniqueMarkets = ['All', ...Array.from(new Set(marketPrices.map((p) => p.marketName)))];

  const filteredPrices = marketPrices.filter((p) => {
    if (selectedMarket !== 'All' && p.marketName !== selectedMarket) return false;
    return true;
  });

  const chartData = marketPrices.find((p) => p.cropName === selectedCrop) || marketPrices[0];

  const handleReadPriceSummary = () => {
    if (!chartData) return;
    const text = t('market.today_s_rate_for_in', {
      cropName: chartData.cropName,
      marketName: chartData.marketName,
      wholesalePrice: formatNumber(chartData.wholesalePrice),
      unit: chartData.unit,
      changePercent: formatNumber(chartData.changePercent),
    });
    readAloud(text);
  };

  const openAlertDialog = () => {
    if (!user) {
      showToast(t('market.please_sign_in_to_set'), 'info');
      return;
    }
    const current = marketPrices.find((p) => p.cropName === selectedCrop);
    setAlertTargetPrice(current?.wholesalePrice ?? 0);
    setShowAlertDialog(true);
  };

  const handleCreateAlert = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast(t('market.please_sign_in_to_set'), 'info');
      return;
    }
    if (!selectedCrop || !inRange(alertTargetPrice, LIMITS.price.min, LIMITS.price.max)) return;
    const ok = await createPriceAlert(selectedCrop, alertTargetPrice, alertCondition);
    if (ok) setShowAlertDialog(false);
  };

  const handleOpenEdit = (price: MarketPrice) => {
    setEditingPrice(price);
    setEditWholesale(price.wholesalePrice);
    setEditRetail(price.retailPrice);
  };

  const handleSavePriceEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingPrice) return;
    if (
      !inRange(editWholesale, LIMITS.price.min, LIMITS.price.max) ||
      !inRange(editRetail, LIMITS.price.min, LIMITS.price.max)
    )
      return;
    // TODO(api): PATCH /prices/:id is admin-only on the server.
    const ok = await updateMarketPrice(editingPrice.id, editWholesale, editRetail);
    if (ok) setEditingPrice(null);
  };

  // SVG Line Chart Generator
  const points = chartData?.historicalPrices || [];
  const pricesArray = points.map((p) => p.price);
  const minPrice = Math.min(...(pricesArray.length > 0 ? pricesArray : [1000]));
  const maxPrice = Math.max(...(pricesArray.length > 0 ? pricesArray : [2000]));
  const priceRange = maxPrice - minPrice || 1;

  const chartWidth = 560;
  const chartHeight = 160;
  const padding = 20;

  const svgPoints = points
    .map((p, idx) => {
      const x = padding + (idx / Math.max(1, points.length - 1)) * (chartWidth - padding * 2);
      const y =
        chartHeight - padding - ((p.price - minPrice) / priceRange) * (chartHeight - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-6">
      {/* Title & Alert CTA */}
      <div className="bg-white rounded-2xl border border-emerald-950/10 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
              <TrendingUp className="w-4 h-4 text-emerald-700" aria-hidden="true" />
              <span>{t('market.official_provincial_mandi_commodity_rate')}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-emerald-950 mt-1">
              {t('common.mandiPriceBoardTitle')}
            </h1>
            <p className="text-xs text-slate-500 mt-1">{t('common.mandiPriceBoardSubtitle')}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReadPriceSummary}
              className="inline-flex items-center gap-1.5 px-3 min-h-12 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold text-xs rounded-xl transition-colors"
            >
              <Volume2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
              <span>{t('common.listenVoice')}</span>
            </button>

            <button
              onClick={openAlertDialog}
              className="inline-flex items-center gap-2 px-4 min-h-12 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs rounded-xl transition-colors shadow-xs"
            >
              <Bell className="w-4 h-4" aria-hidden="true" />
              <span>{t('common.setAlertBtn')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Trend Chart Card */}
      {chartData && (
        <div className="bg-white rounded-2xl border border-emerald-950/10 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 font-display">
                  {t('common.trend7d')}: {chartData.cropName}
                </h2>
                <span
                  className={`flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    chartData.trend === 'up'
                      ? 'bg-emerald-100 text-emerald-800'
                      : chartData.trend === 'down'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {chartData.trend === 'up' ? (
                    <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  {chartData.changePercent > 0
                    ? `+${chartData.changePercent}%`
                    : `${chartData.changePercent}%`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('market.market_unit_updated', {
                  marketName: chartData.marketName,
                  unit: chartData.unit,
                  lastUpdated: formatDateTime(chartData.lastUpdated, language),
                })}
              </p>
            </div>

            {/* Crop Selector Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
              {uniqueCrops.map((crop) => (
                <button
                  key={crop}
                  onClick={() => setSelectedCrop(crop)}
                  aria-pressed={selectedCrop === crop}
                  className={`px-3 min-h-12 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                    selectedCrop === crop
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  }`}
                >
                  {crop.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Chart */}
          <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-medium">
              <span>
                {t('market.wholesale_rate_trend', {
                  currencyPrefix: t('common.currencyPrefix'),
                  unit: chartData.unit,
                })}
              </span>
              <span>
                {t('market.high')}
                <strong className="text-slate-900 tabular-nums">
                  {t('common.currencyPrefix')} {formatNumber(maxPrice)}
                </strong>{' '}
                · {t('market.low')}
                <strong className="text-slate-900 tabular-nums">
                  {t('common.currencyPrefix')} {formatNumber(minPrice)}
                </strong>
              </span>
            </div>

            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-40"
                role="img"
                aria-label={t('market.wholesale_rate_trend', {
                  currencyPrefix: t('common.currencyPrefix'),
                  unit: chartData.unit,
                })}
              >
                <line
                  x1={padding}
                  y1={padding}
                  x2={chartWidth - padding}
                  y2={padding}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                />
                <line
                  x1={padding}
                  y1={chartHeight / 2}
                  x2={chartWidth - padding}
                  y2={chartHeight / 2}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                />
                <line
                  x1={padding}
                  y1={chartHeight - padding}
                  x2={chartWidth - padding}
                  y2={chartHeight - padding}
                  stroke="#cbd5e1"
                />

                <polyline
                  fill="none"
                  stroke="#047857"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={svgPoints}
                />

                {points.map((p, idx) => {
                  const x =
                    padding + (idx / Math.max(1, points.length - 1)) * (chartWidth - padding * 2);
                  const y =
                    chartHeight -
                    padding -
                    ((p.price - minPrice) / priceRange) * (chartHeight - padding * 2);
                  return (
                    <g key={idx}>
                      <circle
                        cx={x}
                        cy={y}
                        r="4.5"
                        fill="#047857"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <text
                        x={x}
                        y={chartHeight - 4}
                        fontSize="9"
                        textAnchor="middle"
                        fill="#64748b"
                        className="font-medium"
                      >
                        {p.date}
                      </text>
                      <text
                        x={x}
                        y={y - 8}
                        fontSize="10"
                        textAnchor="middle"
                        fill="#064e3b"
                        fontWeight="bold"
                        className="tabular-nums"
                      >
                        {p.price}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Market Selector & Price Table */}
      <div className="bg-white rounded-2xl border border-emerald-950/10 overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-display">
              {t('market.daily_commodity_price_board')}
            </h3>
            <p className="text-xs text-slate-500">
              {t('market.compare_wholesale_mandi_rates_with')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedMarket}
              aria-label={t('market.all_mandis')}
              onChange={(e) => setSelectedMarket(e.target.value)}
              className="px-3 min-h-12 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 outline-none"
            >
              <option value="All">{t('market.all_mandis')}</option>
              {uniqueMarkets
                .filter((m) => m !== 'All')
                .map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th scope="col" className="py-3 px-4">
                  {t('common.commodity')}
                </th>
                <th scope="col" className="py-3 px-4">
                  {t('common.marketLocation')}
                </th>
                <th scope="col" className="py-3 px-4">
                  {t('common.unit')}
                </th>
                <th scope="col" className="py-3 px-4 text-end">
                  {t('common.wholesaleRate')}
                </th>
                <th scope="col" className="py-3 px-4 text-end">
                  {t('common.retailRate')}
                </th>
                <th scope="col" className="py-3 px-4 text-center">
                  {t('market.trend_col')}
                </th>
                <th scope="col" className="py-3 px-4 text-end">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredPrices.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{item.cropName}</td>
                  <td className="py-3.5 px-4 text-slate-600">{item.marketName}</td>
                  <td className="py-3.5 px-4 text-slate-500">{item.unit}</td>
                  <td className="py-3.5 px-4 text-end font-bold text-emerald-900 tabular-nums">
                    {t('common.currencyPrefix')} {formatNumber(item.wholesalePrice)}
                  </td>
                  <td className="py-3.5 px-4 text-end font-medium text-slate-800 tabular-nums">
                    {t('common.currencyPrefix')} {formatNumber(item.retailPrice)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-bold ${
                        item.trend === 'up'
                          ? 'text-emerald-800 bg-emerald-50'
                          : item.trend === 'down'
                            ? 'text-rose-800 bg-rose-50'
                            : 'text-slate-700 bg-slate-100'
                      }`}
                    >
                      {item.trend === 'up' ? (
                        <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                      ) : item.trend === 'down' ? (
                        <ArrowDownRight className="w-3 h-3" aria-hidden="true" />
                      ) : (
                        '—'
                      )}
                      {item.changePercent > 0
                        ? `+${item.changePercent}%`
                        : `${item.changePercent}%`}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-end">
                    {user?.role === 'admin' ? (
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="inline-flex items-center gap-1 px-2.5 min-h-12 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3 h-3" aria-hidden="true" /> {t('market.edit')}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedCrop(item.cropName);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-950 min-h-12 px-2"
                      >
                        {t('market.chart')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Price Alerts Section */}
      <div className="bg-white rounded-2xl border border-emerald-950/10 p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" aria-hidden="true" />
              <span>{t('market.your_active_price_alerts')}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('market.receive_alerts_when_local_rates')}
            </p>
          </div>
          <button
            onClick={openAlertDialog}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 min-h-12 px-2"
          >
            <Plus className="w-3.5 h-3.5" /> {t('market.add_alert')}
          </button>
        </div>

        {myAlerts.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-2">
            {t('market.no_price_alerts_configured')}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {myAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 block">{alert.cropName}</span>
                  <span className="text-slate-500">
                    {t('market.when')} {alert.condition === 'above' ? '≥' : '≤'}{' '}
                    {t('common.currencyPrefix')} {formatNumber(alert.targetPrice)}
                  </span>
                  {alert.isTriggered && (
                    <span className="text-[10px] text-amber-700 font-bold block mt-0.5">
                      <span aria-hidden="true">✓</span> {t('market.threshold_reached_today')}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => deletePriceAlert(alert.id)}
                  className="text-slate-500 hover:text-rose-700 min-w-12 min-h-12 flex items-center justify-center"
                  aria-label={t('market.delete_alert')}
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Set Price Alert Dialog */}
      {showAlertDialog && (
        <Modal
          onClose={() => setShowAlertDialog(false)}
          label={t('market.create_market_price_alert')}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 font-display">
              {t('market.create_market_price_alert')}
            </h3>
            <CloseButton onClick={() => setShowAlertDialog(false)} />
          </div>

          <form onSubmit={handleCreateAlert} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor={`${uid}-acrop`}
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                {t('common.commodity')}
              </label>
              <select
                id={`${uid}-acrop`}
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="w-full px-3 min-h-12 text-sm border border-slate-300 rounded-xl outline-none bg-white font-medium"
              >
                {uniqueCrops.map((crop) => (
                  <option key={crop} value={crop}>
                    {crop}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor={`${uid}-acond`}
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  {t('market.condition')}
                </label>
                <select
                  id={`${uid}-acond`}
                  value={alertCondition}
                  onChange={(e) => setAlertCondition(e.target.value as 'above' | 'below')}
                  className="w-full px-3 min-h-12 text-sm border border-slate-300 rounded-xl outline-none bg-white"
                >
                  <option value="above">{t('market.price_rises_above')}</option>
                  <option value="below">{t('market.price_drops_below')}</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor={`${uid}-aprice`}
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  {t('market.target_price_pkr')}
                </label>
                <input
                  id={`${uid}-aprice`}
                  type="number"
                  inputMode="numeric"
                  required
                  min={LIMITS.price.min}
                  max={LIMITS.price.max}
                  value={alertTargetPrice}
                  onChange={(e) => setAlertTargetPrice(Math.round(Number(e.target.value)) || 0)}
                  className="w-full px-3 min-h-12 text-sm border border-slate-300 rounded-xl outline-none font-bold tabular-nums"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAlertDialog(false)}
                className="px-3 min-h-12 text-xs font-medium text-slate-700 hover:text-slate-900"
              >
                {t('buyer.cancel')}
              </button>
              <button
                type="submit"
                disabled={!inRange(alertTargetPrice, LIMITS.price.min, LIMITS.price.max)}
                className="px-4 min-h-12 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl disabled:opacity-50"
              >
                {t('market.save_alert')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Admin Price Edit Dialog */}
      {editingPrice && (
        <Modal
          onClose={() => setEditingPrice(null)}
          label={t('market.update_daily_price', { cropName: editingPrice.cropName })}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 font-display">
              {t('market.update_daily_price', { cropName: editingPrice.cropName })}
            </h3>
            <CloseButton onClick={() => setEditingPrice(null)} />
          </div>

          <form onSubmit={handleSavePriceEdit} className="mt-4 space-y-4">
            <p className="text-xs text-slate-600">
              {editingPrice.marketName} ({editingPrice.unit})
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor={`${uid}-ew`}
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  {t('common.wholesaleRate')} ({t('common.currencyPrefix')})
                </label>
                <input
                  id={`${uid}-ew`}
                  type="number"
                  inputMode="numeric"
                  required
                  min={LIMITS.price.min}
                  max={LIMITS.price.max}
                  value={editWholesale}
                  onChange={(e) => setEditWholesale(Math.round(Number(e.target.value)) || 0)}
                  className="w-full px-3 min-h-12 text-sm border border-slate-300 rounded-xl outline-none font-bold text-emerald-900 tabular-nums"
                />
              </div>
              <div>
                <label
                  htmlFor={`${uid}-er`}
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  {t('common.retailRate')} ({t('common.currencyPrefix')})
                </label>
                <input
                  id={`${uid}-er`}
                  type="number"
                  inputMode="numeric"
                  required
                  min={LIMITS.price.min}
                  max={LIMITS.price.max}
                  value={editRetail}
                  onChange={(e) => setEditRetail(Math.round(Number(e.target.value)) || 0)}
                  className="w-full px-3 min-h-12 text-sm border border-slate-300 rounded-xl outline-none font-bold text-slate-800 tabular-nums"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingPrice(null)}
                className="px-3 min-h-12 text-xs font-medium text-slate-700 hover:text-slate-900"
              >
                {t('buyer.cancel')}
              </button>
              <button
                type="submit"
                className="px-4 min-h-12 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl"
              >
                {t('market.publish_price_update')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
