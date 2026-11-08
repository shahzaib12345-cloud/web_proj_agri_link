import {
  Sun,
  CloudSun,
  CloudRain,
  CloudLightning,
  Cloud,
  Wind,
  Droplets,
  Thermometer,
  MapPin,
  AlertCircle,
  Volume2,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useI18n } from '@/i18n/I18nContext';
import { useSpeech } from '@/hooks/useSpeech';
import { CardGridSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { formatWeekday, formatShortDate } from '@/utils/format';
import type { WeatherDay } from '@/types';

function WeatherIcon({ condition }: { condition: WeatherDay['condition'] }) {
  switch (condition) {
    case 'Sunny':
      return <Sun className="w-6 h-6 text-amber-500" aria-hidden="true" />;
    case 'Partly Cloudy':
      return <CloudSun className="w-6 h-6 text-amber-500" aria-hidden="true" />;
    case 'Scattered Showers':
      return <CloudRain className="w-6 h-6 text-sky-500" aria-hidden="true" />;
    case 'Heavy Rain':
      return <CloudLightning className="w-6 h-6 text-indigo-500" aria-hidden="true" />;
    default:
      return <Cloud className="w-6 h-6 text-slate-500" aria-hidden="true" />;
  }
}

export function WeatherPanel() {
  const { language, t, tDyn } = useI18n();
  const { readAloud } = useSpeech();
  const { weather, status } = useData();
  // TODO(api): let the user choose the district once GET /weather supports more than the default.
  const location = t('weather.location_multan');
  const todayWeather = weather[0];

  if (status === 'loading' && !todayWeather) return <CardGridSkeleton count={3} />;
  if (!todayWeather) return <EmptyState title={t('weather.unavailable')} />;

  const handleReadWeatherAdvisory = () => {
    readAloud(
      t('weather.today_s_agricultural_weather_for', {
        split: location,
        tempMax: todayWeather.tempMax,
        rainProbPercent: todayWeather.rainProbPercent,
        advisory: todayWeather.advisory,
      }),
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-emerald-950/10 p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
            <CloudSun className="w-4 h-4 text-emerald-700" />
            <span>{t('common.weatherTitle')}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-emerald-950 mt-1">
            {t('common.sprayRainForecast')}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReadWeatherAdvisory}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold text-xs rounded-xl flex items-center gap-1 shrink-0"
          >
            <Volume2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
            <span>{t('common.listenVoice')}</span>
          </button>

          <div className="flex items-center gap-1.5 border border-slate-200 rounded-xl px-2.5 py-1 bg-white">
            <MapPin className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
            <span className="text-xs font-bold text-slate-800">{location}</span>
          </div>
        </div>
      </div>

      {/* Today's Hero Weather Card */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 rounded-xl text-white p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0">
            <WeatherIcon condition={todayWeather.condition} />
          </div>
          <div>
            <span className="text-xs text-emerald-200 uppercase tracking-wider font-semibold">
              {t('weather.today_in', { split: location })}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-display tabular-nums">
                {todayWeather.tempMax}&deg;C
              </span>
              <span className="text-sm text-emerald-200 tabular-nums">
                / {t('weather.low')} {todayWeather.tempMin}&deg;C ·{' '}
                {tDyn('weather.cond', todayWeather.condition)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-xs border-t md:border-t-0 md:border-l border-white/20 pt-3 md:pt-0 md:pl-6">
          <div>
            <span className="text-emerald-200 text-[11px] block flex items-center gap-1 font-semibold">
              <Droplets className="w-3.5 h-3.5" /> {t('common.rainChance')}
            </span>
            <strong className="text-base font-bold tabular-nums">
              {todayWeather.rainProbPercent}%
            </strong>
          </div>
          <div>
            <span className="text-emerald-200 text-[11px] block flex items-center gap-1 font-semibold">
              <Thermometer className="w-3.5 h-3.5" /> {t('common.humidity')}
            </span>
            <strong className="text-base font-bold tabular-nums">
              {todayWeather.humidityPercent}%
            </strong>
          </div>
          <div>
            <span className="text-emerald-200 text-[11px] block flex items-center gap-1 font-semibold">
              <Wind className="w-3.5 h-3.5" /> {t('common.windSpeed')}
            </span>
            <strong className="text-base font-bold tabular-nums">
              {todayWeather.windSpeedKmh} {t('weather.kmh')}
            </strong>
          </div>
        </div>
      </div>

      {/* Agricultural Advisory Banner */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-950">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-amber-900 block mb-0.5 text-sm">
            {t('common.agronomyNotice')}:
          </strong>
          <p className="leading-relaxed text-slate-800 font-medium">{todayWeather.advisory}</p>
        </div>
      </div>

      {/* 7-Day Horizontal Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 pt-2">
        {weather.map((day) => (
          <div
            key={day.date}
            className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center text-center justify-between"
          >
            <span className="text-xs font-bold text-slate-800">
              {formatWeekday(day.date, language)}
            </span>
            <span className="text-[10px] text-slate-500 mb-2">
              {formatShortDate(day.date, language)}
            </span>
            <div className="my-1">
              <WeatherIcon condition={day.condition} />
            </div>
            <span className="text-xs font-bold text-slate-900 tabular-nums">
              {day.tempMax}&deg; /{' '}
              <span className="text-slate-500 font-normal">{day.tempMin}&deg;</span>
            </span>
            <span className="text-[10px] text-sky-700 font-semibold mt-1">
              {day.rainProbPercent}% {t('weather.rain')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
