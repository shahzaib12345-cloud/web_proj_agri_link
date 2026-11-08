import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, Minus, Check } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useI18n } from '@/i18n/I18nContext';
import { Modal } from '@/components/Modal';
import { CloseButton } from '@/components/CloseButton';
import { addDaysISO, inRange, isValidHarvestDate, LIMITS, todayISO } from '@/utils/validators';
import type { ProduceListing, ProduceUnit } from '@/types';

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Category = ProduceListing['category'];

// TODO(api): photo upload. Until the API supports it, farmers pick one of the bundled preset images.
const PRESET_CROPS: {
  name: string;
  variety: string;
  category: Category;
  unit: ProduceUnit;
  defaultPrice: number;
  img: string;
}[] = [
  {
    name: 'Wheat / گندم (Dilkash Grain)',
    variety: 'دلکش 2020 (Grade 1 Clean)',
    category: 'Cereals & Grains',
    unit: 'Maund (40 kg / من)',
    defaultPrice: 3950,
    img: '/images/grain.webp',
  },
  {
    name: 'Cotton / کپاس پھٹی (Phutti)',
    variety: 'بی ٹی سفید لمبا ریشہ',
    category: 'Cereals & Grains',
    unit: 'Maund (40 kg / من)',
    defaultPrice: 8200,
    img: '/images/grain.webp',
  },
  {
    name: 'Potatoes / آلو (Mozika A Grade)',
    variety: 'موزیکا سرخ مٹی کا آلو',
    category: 'Tubers & Roots',
    unit: 'Bori (50 kg / بوری)',
    defaultPrice: 2450,
    img: '/images/potatoes-onions.webp',
  },
  {
    name: 'Fresh Tomatoes / ٹماٹر (Hybrid Red)',
    variety: 'فارمی ہائبرڈ سخت پیٹی',
    category: 'Vegetables',
    unit: 'Crate (پیٹی)',
    defaultPrice: 1450,
    img: '/images/tomatoes.webp',
  },
  {
    name: 'Basmati Rice / چاول (Super Kernel)',
    variety: 'سپر کرنل پکا دھان',
    category: 'Cereals & Grains',
    unit: 'Maund (40 kg / من)',
    defaultPrice: 5200,
    img: '/images/grain.webp',
  },
  {
    name: 'Red Onions / دیسی سرخ پیاز',
    variety: 'دیسی گلابی خشک چھلکا',
    category: 'Vegetables',
    unit: 'Bori (50 kg / بوری)',
    defaultPrice: 3400,
    img: '/images/potatoes-onions.webp',
  },
];

const CATEGORIES: { value: Category; key: string }[] = [
  { value: 'Cereals & Grains', key: 'cereals_grains' },
  { value: 'Vegetables', key: 'vegetables' },
  { value: 'Tubers & Roots', key: 'tubers_roots' },
  { value: 'Legumes', key: 'legumes' },
  { value: 'Fruits', key: 'fruits' },
];

const UNITS: ProduceUnit[] = [
  'Maund (40 kg / من)',
  'Bori (50 kg / بوری)',
  'Crate (پیٹی)',
  'kg (کلو)',
];

const field =
  'w-full px-3 min-h-12 text-sm border border-slate-300 rounded-xl outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white';
const stepBtn =
  'w-12 h-12 shrink-0 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-700';

export const CreateListingModal: React.FC<CreateListingModalProps> = ({ isOpen, onClose }) => {
  const { t, tDyn } = useI18n();
  const { createListing } = useData();
  const uid = useId();
  const id = (n: string) => `${uid}-${n}`;

  const [cropName, setCropName] = useState(PRESET_CROPS[0].name);
  const [variety, setVariety] = useState(PRESET_CROPS[0].variety);
  const [category, setCategory] = useState<Category>(PRESET_CROPS[0].category);
  const [quantity, setQuantity] = useState(100);
  const [unit, setUnit] = useState<ProduceUnit>(PRESET_CROPS[0].unit);
  const [pricePerUnit, setPricePerUnit] = useState(PRESET_CROPS[0].defaultPrice);
  const [minOrderQuantity, setMinOrderQuantity] = useState(10);
  const [harvestDate, setHarvestDate] = useState(todayISO());
  const [description, setDescription] = useState(t('farmer.clean_harvest_directly_from_our'));
  const [imageUrl, setImageUrl] = useState(PRESET_CROPS[0].img);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: (typeof PRESET_CROPS)[number]) => {
    setCropName(preset.name);
    setVariety(preset.variety);
    setCategory(preset.category);
    setUnit(preset.unit);
    setPricePerUnit(preset.defaultPrice);
    setImageUrl(preset.img);
  };

  const clampQty = (n: number) =>
    Math.min(
      LIMITS.quantity.max,
      Math.max(LIMITS.quantity.min, Math.round(n) || LIMITS.quantity.min),
    );
  const clampPrice = (n: number) =>
    Math.min(LIMITS.price.max, Math.max(LIMITS.price.min, Math.round(n) || LIMITS.price.min));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!cropName.trim() || !variety.trim()) return setError(t('farmer.err_required'));
    if (!inRange(quantity, LIMITS.quantity.min, LIMITS.quantity.max))
      return setError(t('farmer.err_quantity'));
    if (!inRange(pricePerUnit, LIMITS.price.min, LIMITS.price.max))
      return setError(t('farmer.err_price'));
    if (!inRange(minOrderQuantity, 1, quantity)) return setError(t('farmer.err_min_order'));
    if (!isValidHarvestDate(harvestDate)) return setError(t('farmer.err_harvest_date'));

    setSubmitting(true);
    try {
      // The server derives farmer id/name/location from the session; the client only sends listing fields.
      const ok = await createListing({
        cropName: cropName.trim(),
        variety: variety.trim(),
        category,
        quantity,
        unit,
        pricePerUnit,
        minOrderQuantity,
        harvestDate,
        availableUntil: addDaysISO(30),
        description: description.trim().slice(0, LIMITS.textLong),
        imageUrl,
      });
      if (ok) onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} label={t('farmer.post_produce_for_sale')} className="max-w-xl" scroll>
      <div className="flex items-center justify-between pb-3 border-b border-emerald-950/10">
        <div>
          <h2 className="text-lg font-bold text-emerald-950 font-display">
            {t('farmer.post_produce_for_sale')}
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            {t('farmer.make_your_harvest_visible_to')}
          </p>
        </div>
        <CloseButton onClick={onClose} />
      </div>

      <fieldset className="my-3">
        <legend className="block text-xs font-bold text-slate-700 mb-1.5">
          {t('farmer.select_crop_template')}
        </legend>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {PRESET_CROPS.map((p) => (
            <button
              key={p.name}
              type="button"
              aria-pressed={cropName === p.name}
              onClick={() => handleSelectPreset(p)}
              className={`px-3 min-h-12 text-xs rounded-xl border whitespace-nowrap transition-colors flex items-center gap-1 ${
                cropName === p.name
                  ? 'bg-emerald-800 border-emerald-800 text-white font-bold shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{p.name.split('/')[0].trim()}</span>
              {cropName === p.name && (
                <Check className="w-3.5 h-3.5 text-emerald-200" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      </fieldset>

      {error && (
        <div
          role="alert"
          className="mb-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-3.5 max-h-[60vh] overflow-y-auto pe-1"
        noValidate
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={id('crop')} className="block text-xs font-semibold text-slate-700 mb-1">
              {t('farmer.crop_name')}
            </label>
            <input
              id={id('crop')}
              type="text"
              required
              maxLength={LIMITS.textShort}
              value={cropName}
              onChange={(e) => setCropName(e.target.value)}
              className={field}
            />
          </div>
          <div>
            <label
              htmlFor={id('variety')}
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              {t('farmer.variety_grade')}
            </label>
            <input
              id={id('variety')}
              type="text"
              required
              maxLength={LIMITS.textShort}
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
              className={field}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={id('cat')} className="block text-xs font-semibold text-slate-700 mb-1">
              {t('farmer.category')}
            </label>
            <select
              id={id('cat')}
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className={field}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {tDyn('farmer', c.key)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={id('unit')} className="block text-xs font-semibold text-slate-700 mb-1">
              {t('farmer.unit_of_sale')}
            </label>
            <select
              id={id('unit')}
              value={unit}
              onChange={(e) => setUnit(e.target.value as ProduceUnit)}
              className={`${field} font-bold text-emerald-950`}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div>
            <label htmlFor={id('qty')} className="block text-xs font-bold text-slate-700 mb-1">
              {t('farmer.total_available', { unit })}
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label={t('a11y.decrease')}
                onClick={() => setQuantity(clampQty(quantity - 10))}
                className={stepBtn}
              >
                <Minus className="w-4 h-4" aria-hidden="true" />
              </button>
              <input
                id={id('qty')}
                type="number"
                inputMode="numeric"
                min={LIMITS.quantity.min}
                max={LIMITS.quantity.max}
                required
                value={quantity}
                onChange={(e) => setQuantity(clampQty(Number(e.target.value)))}
                className={`${field} text-center font-bold tabular-nums`}
              />
              <button
                type="button"
                aria-label={t('a11y.increase')}
                onClick={() => setQuantity(clampQty(quantity + 10))}
                className={stepBtn}
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div>
            <label htmlFor={id('price')} className="block text-xs font-bold text-slate-700 mb-1">
              {t('farmer.price_per_pkr', { unit })}
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label={t('a11y.decrease')}
                onClick={() => setPricePerUnit(clampPrice(pricePerUnit - 50))}
                className={stepBtn}
              >
                <Minus className="w-4 h-4" aria-hidden="true" />
              </button>
              <input
                id={id('price')}
                type="number"
                inputMode="numeric"
                min={LIMITS.price.min}
                max={LIMITS.price.max}
                required
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(clampPrice(Number(e.target.value)))}
                className={`${field} text-center font-bold tabular-nums border-emerald-600 text-emerald-950`}
              />
              <button
                type="button"
                aria-label={t('a11y.increase')}
                onClick={() => setPricePerUnit(clampPrice(pricePerUnit + 50))}
                className={stepBtn}
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={id('min')} className="block text-xs font-semibold text-slate-700 mb-1">
              {t('farmer.min_order')}
            </label>
            <input
              id={id('min')}
              type="number"
              inputMode="numeric"
              min={1}
              max={quantity}
              required
              value={minOrderQuantity}
              onChange={(e) => setMinOrderQuantity(Math.round(Number(e.target.value)) || 1)}
              className={`${field} tabular-nums`}
            />
          </div>
          <div>
            <label
              htmlFor={id('harvest')}
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              {t('farmer.harvest_date')}
            </label>
            <input
              id={id('harvest')}
              type="date"
              required
              min={addDaysISO(-365)}
              max={todayISO()}
              value={harvestDate}
              onChange={(e) => setHarvestDate(e.target.value)}
              className={field}
            />
          </div>
        </div>

        <div>
          <label htmlFor={id('desc')} className="block text-xs font-semibold text-slate-700 mb-1">
            {t('farmer.description_collection_info')}
          </label>
          <textarea
            id={id('desc')}
            rows={2}
            maxLength={LIMITS.textLong}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2.5 text-sm text-slate-800 border border-slate-300 rounded-xl outline-none leading-relaxed focus:border-emerald-600"
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 min-h-12 text-xs font-medium text-slate-700 hover:text-slate-900"
          >
            {t('buyer.cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 min-h-12 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
          >
            {submitting ? t('farmer.publishing') : t('farmer.publish_listing')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
