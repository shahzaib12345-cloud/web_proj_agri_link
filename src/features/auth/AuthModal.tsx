import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Phone, Lock, User as UserIcon, Tractor, ShoppingCart, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useI18n } from '@/i18n/I18nContext';
import { Modal } from '@/components/Modal';
import { CloseButton } from '@/components/CloseButton';
import {
  checkPassword,
  inRange,
  isValidPhone,
  LIMITS,
  normalizePhone,
  toNumber,
} from '@/utils/validators';
import type { BuyerType, RegisterInput } from '@/types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PAKISTAN_CROPS = [
  'Wheat / گندم',
  'Cotton / کپاس پھٹی',
  'Basmati Rice / باسمتی چاول',
  'Potatoes / آلو',
  'Fresh Tomatoes / ٹماٹر',
  'Red Onions / پیاز',
  'Maize / مکئی',
  'Sugarcane / گنا',
  'Kinnow / کنو',
  'Mangoes / چونسہ آم',
];

const BUYER_TYPES: BuyerType[] = ['wholesaler', 'processor', 'retailer', 'individual'];

const inputBase =
  'w-full ps-9 pe-3 min-h-12 text-sm border border-slate-300 rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none';
const plainInput =
  'w-full px-3 min-h-12 text-sm border border-slate-300 rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none';

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const { t, tDyn, errorMessage } = useI18n();
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<RegisterInput['role']>('farmer');
  const [district, setDistrict] = useState('');
  const [tehsil, setTehsil] = useState('');
  const [village, setVillage] = useState('');
  const [farmSize, setFarmSize] = useState('');
  const [buyerType, setBuyerType] = useState<BuyerType>('wholesaler');
  const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setPassword(''); // never leave a typed password in memory after the dialog closes
    setError(null);
    onClose();
  };

  const toggleCrop = (crop: string) =>
    setSelectedCrops((prev) =>
      prev.includes(crop) ? prev.filter((c) => c !== crop) : [...prev, crop],
    );

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const normalized = normalizePhone(phone);
    if (!normalized) return setError(t('error.invalid_phone'));
    if (!password) return setError(t('auth.err_password_required'));
    setSubmitting(true);
    try {
      await login(normalized, password);
      showToast(t('auth.signed_in'), 'success');
      handleClose();
    } catch (err) {
      setError(errorMessage(err)); // generic message: never reveals whether the phone exists
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const normalized = normalizePhone(phone);
    if (name.trim().length < 2) return setError(t('auth.err_name'));
    if (!normalized) return setError(t('error.invalid_phone'));
    if (checkPassword(password)) return setError(t('error.invalid_password'));
    if (!district.trim() || !tehsil.trim()) return setError(t('auth.err_location'));
    const size = farmSize === '' ? undefined : toNumber(farmSize);
    if (
      role === 'farmer' &&
      size !== undefined &&
      !inRange(size, LIMITS.farmSizeAcres.min, LIMITS.farmSizeAcres.max)
    )
      return setError(t('auth.err_farm_size'));

    setSubmitting(true);
    try {
      await register({
        phone: normalized,
        password,
        name: name.trim(),
        role,
        district: district.trim(),
        tehsil: tehsil.trim(),
        village: village.trim(),
        cropsGrown: role === 'farmer' ? selectedCrops : [],
        farmSizeAcres: role === 'farmer' ? size : undefined,
        buyerType: role === 'buyer' ? buyerType : undefined,
      });
      showToast(t('auth.welcome', { name: name.trim() }), 'success');
      handleClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const title = mode === 'login' ? t('common.loginTitle') : t('common.registerTitle');
  const tabClass = (active: boolean) =>
    `flex-1 min-h-12 px-2 text-xs font-bold rounded-lg transition-colors ${active ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-700 hover:text-slate-900'}`;

  return (
    <Modal onClose={handleClose} label={title} scroll>
      <div className="flex items-center justify-between pb-3 border-b border-emerald-950/10">
        <div>
          <h2 className="text-lg font-bold text-emerald-950 font-display">{title}</h2>
          <p className="text-xs text-slate-600 mt-0.5">{t('auth.subtitle')}</p>
        </div>
        <CloseButton onClick={handleClose} />
      </div>

      <div role="tablist" className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl my-4">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          onClick={() => {
            setMode('login');
            setError(null);
          }}
          className={tabClass(mode === 'login')}
        >
          {t('auth.tab_login')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          onClick={() => {
            setMode('register');
            setError(null);
          }}
          className={tabClass(mode === 'register')}
        >
          {t('auth.tab_register')}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold"
        >
          {error}
        </div>
      )}

      {mode === 'login' ? (
        <form onSubmit={handleLogin} className="space-y-4" noValidate>
          <div>
            <label htmlFor={id('phone')} className="block text-xs font-bold text-slate-700 mb-1">
              {t('common.phoneLabel')}
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute start-3 top-4" aria-hidden="true" />
              <input
                id={id('phone')}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 300 1234567"
                className={`${inputBase} tabular-nums font-medium text-start`}
                aria-invalid={phone !== '' && !isValidPhone(phone)}
              />
            </div>
          </div>
          <div>
            <label htmlFor={id('pw')} className="block text-xs font-bold text-slate-700 mb-1">
              {t('auth.password')}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute start-3 top-4" aria-hidden="true" />
              <input
                id={id('pw')}
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputBase}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-12 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
          >
            {submitting ? t('auth.verifying') : t('common.signInPhone')}
          </button>
        </form>
      ) : (
        <form
          onSubmit={handleRegister}
          className="space-y-3.5 max-h-[60vh] overflow-y-auto pe-1"
          noValidate
        >
          <fieldset>
            <legend className="block text-xs font-bold text-slate-700 mb-1.5">
              {t('auth.registering_as')}
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['farmer', Tractor, 'common.roleFarmer'],
                  ['buyer', ShoppingCart, 'common.roleBuyer'],
                ] as const
              ).map(([r, Icon, label]) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={role === r}
                  onClick={() => setRole(r)}
                  className={`p-3 min-h-12 rounded-xl border flex flex-col items-center gap-1 transition-all ${role === r ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}
                >
                  <Icon className="w-5 h-5 text-emerald-700" aria-hidden="true" />
                  <span className="text-xs">{t(label)}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor={id('name')} className="block text-xs font-bold text-slate-700 mb-1">
              {t('common.fullNameLabel')}
            </label>
            <div className="relative">
              <UserIcon
                className="w-4 h-4 text-slate-500 absolute start-3 top-4"
                aria-hidden="true"
              />
              <input
                id={id('name')}
                type="text"
                autoComplete="name"
                required
                maxLength={LIMITS.textShort}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('auth.name_placeholder')}
                className={inputBase}
              />
            </div>
          </div>

          <div>
            <label htmlFor={id('rphone')} className="block text-xs font-bold text-slate-700 mb-1">
              {t('common.phoneLabel')}
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute start-3 top-4" aria-hidden="true" />
              <input
                id={id('rphone')}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 300 1234567"
                className={`${inputBase} tabular-nums text-start`}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['district', district, setDistrict, 'auth.district'],
                ['tehsil', tehsil, setTehsil, 'auth.tehsil'],
                ['village', village, setVillage, 'auth.village'],
              ] as const
            ).map(([k, v, set, label]) => (
              <div key={k}>
                <label htmlFor={id(k)} className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t(label)}
                </label>
                <input
                  id={id(k)}
                  type="text"
                  maxLength={LIMITS.textShort}
                  value={v}
                  onChange={(e) => set(e.target.value)}
                  className={plainInput}
                />
              </div>
            ))}
          </div>

          {role === 'farmer' ? (
            <>
              <div>
                <label htmlFor={id('farm')} className="block text-xs font-bold text-slate-700 mb-1">
                  {t('auth.farm_size')}
                </label>
                <input
                  id={id('farm')}
                  type="number"
                  inputMode="decimal"
                  min={LIMITS.farmSizeAcres.min}
                  max={LIMITS.farmSizeAcres.max}
                  step="0.1"
                  value={farmSize}
                  onChange={(e) => setFarmSize(e.target.value)}
                  className={plainInput}
                />
              </div>
              <fieldset>
                <legend className="block text-xs font-bold text-slate-700 mb-1">
                  {t('auth.crops_grown')}
                </legend>
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                  {PAKISTAN_CROPS.map((c) => {
                    const selected = selectedCrops.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleCrop(c)}
                        className={`text-start px-2 min-h-12 text-xs rounded border transition-colors flex items-center justify-between ${selected ? 'bg-emerald-100 border-emerald-500 text-emerald-950 font-bold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                      >
                        <span className="truncate">{c}</span>
                        {selected && (
                          <Check
                            className="w-3 h-3 text-emerald-700 shrink-0 ms-1"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </>
          ) : (
            <div>
              <label htmlFor={id('btype')} className="block text-xs font-bold text-slate-700 mb-1">
                {t('auth.buyer_category')}
              </label>
              <select
                id={id('btype')}
                value={buyerType}
                onChange={(e) => setBuyerType(e.target.value as BuyerType)}
                className={`${plainInput} bg-white font-medium`}
              >
                {BUYER_TYPES.map((b) => (
                  <option key={b} value={b}>
                    {tDyn('auth.buyer_type', b)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor={id('rpw')} className="block text-xs font-bold text-slate-700 mb-1">
              {t('auth.password')}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute start-3 top-4" aria-hidden="true" />
              <input
                id={id('rpw')}
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={64}
                aria-describedby={id('pwhint')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputBase}
              />
            </div>
            <p id={id('pwhint')} className="text-[11px] text-slate-600 mt-1">
              {t('auth.password_hint')}
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-12 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50 mt-2"
          >
            {submitting ? t('auth.creating') : t('auth.complete_registration')}
          </button>
        </form>
      )}
    </Modal>
  );
}
