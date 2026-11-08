import { useState } from 'react';
import { BookOpen, Search, Clock, ArrowRight, Volume2 } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useI18n } from '@/i18n/I18nContext';
import { useSpeech } from '@/hooks/useSpeech';
import { Modal } from '@/components/Modal';
import { CloseButton } from '@/components/CloseButton';
import { EmptyState } from '@/components/EmptyState';
import { formatDate } from '@/utils/format';
import type { Article } from '@/types';

export function AdvicePanel() {
  const { language, t, tDyn } = useI18n();
  const { readAloud } = useSpeech();
  const { articles } = useData();
  const [articleSearch, setArticleSearch] = useState('');
  const [readingArticle, setReadingArticle] = useState<Article | null>(null);

  const q = articleSearch.trim().toLowerCase();
  const filteredArticles = articles.filter(
    (art) =>
      !q ||
      art.title.toLowerCase().includes(q) ||
      art.cropTag.toLowerCase().includes(q) ||
      art.summary.toLowerCase().includes(q),
  );

  return (
    <>
      {/* Farming Advice & Agronomy Knowledge Base */}
      <div className="bg-white rounded-2xl border border-emerald-950/10 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
              <BookOpen className="w-4 h-4 text-emerald-700" />
              <span>{t('weather.agronomy_knowledge_hub')}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-display text-emerald-950 mt-0.5">
              {t('common.farmingAdviceTitle')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('common.farmingAdviceSubtitle')}</p>
          </div>
        </div>

        {/* Search */}
        <div className="space-y-3">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-4" aria-hidden="true" />
            <input
              type="text"
              value={articleSearch}
              onChange={(e) => setArticleSearch(e.target.value)}
              placeholder={t('common.searchAdvicePlaceholder')}
              className="w-full ps-9 pe-3 min-h-12 text-xs border border-slate-200 rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
            />
          </div>
        </div>

        {/* Articles List */}
        {filteredArticles.length === 0 && (
          <EmptyState title={t('state.no_results')} hint={t('state.no_results_hint')} />
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {filteredArticles.map((article) => (
            <div
              key={article.id}
              role="button"
              tabIndex={0}
              onClick={() => setReadingArticle(article)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setReadingArticle(article);
                }
              }}
              className="p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 transition-all cursor-pointer flex flex-col justify-between group bg-slate-50/50 hover:bg-white"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                  <span className="font-bold text-emerald-800">
                    {tDyn('article.cat', article.category)}
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {article.readTimeMin} {t('weather.min_read')}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-800 transition-colors line-clamp-2 leading-relaxed">
                  {article.title}
                </h3>

                <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                  {article.summary}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500">
                  {t('weather.target_crop')}{' '}
                  <strong className="text-slate-800">{article.cropTag}</strong>
                </span>
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>{t('common.readGuide')}</span> <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Article Reader Modal with Voice Read-Aloud */}
      {readingArticle && (
        <Modal
          onClose={() => setReadingArticle(null)}
          label={readingArticle.title}
          className="max-w-2xl"
          scroll
        >
          <div className="flex items-start justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                {tDyn('article.cat', readingArticle.category)} · {readingArticle.cropTag}
              </span>
              <h2 className="text-lg sm:text-xl font-bold font-display text-emerald-950 mt-1 leading-relaxed">
                {readingArticle.title}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {readingArticle.author} · {formatDate(readingArticle.publishedDate, language)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => readAloud(`${readingArticle.title}۔ ${readingArticle.summary}`)}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-emerald-950 rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <Volume2 className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t('common.listenVoice')}</span>
              </button>
              <CloseButton onClick={() => setReadingArticle(null)} />
            </div>
          </div>

          <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pe-1 text-slate-700 text-xs sm:text-sm leading-relaxed">
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200/70 text-emerald-950 font-medium">
              {readingArticle.summary}
            </div>

            <div className="space-y-3">
              {readingArticle.content.map((paragraph, i) => (
                <p key={i} className="leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            {readingArticle.keyRecommendations && readingArticle.keyRecommendations.length > 0 && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-2 text-xs uppercase tracking-wider">
                  {t('weather.key_agronomy_recommendations')}
                </h4>
                <ul className="space-y-1.5 list-disc list-inside text-xs text-slate-700">
                  {readingArticle.keyRecommendations.map((rec, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => setReadingArticle(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
            >
              {t('weather.close')}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
