// Product reviews for the storefront: summary + public reviews + (for signed-in buyers) a form.
// Self-contained on purpose: drop <ReviewsSection slug={slug} /> into any product page design. API: reviewsApi (src/services).
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useApi from '../hooks/useApi';
import { reviewsApi } from '../services';
import Button from '../../admin/components/Button';
import { Field, Input, Textarea } from '../../admin/components/FormFields';
import { useCustomer } from '../customer/CustomerAuthContext';

export function Stars({ value, size = 'text-base' }) {
  const v = Math.round(Number(value) || 0);
  return <span className={`${size} text-[#d4af37]`} role="img" aria-label={`${v} out of 5 stars`}>{'★'.repeat(v)}<span className="text-[#5f654f]/40">{'★'.repeat(5 - v)}</span></span>;
}
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export default function ReviewsSection({ slug, copy = {} }) {
  const t = (key) => copy[key];
  const { status } = useCustomer();
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [slug]);
  const list = useApi(() => reviewsApi.list(slug, { page, limit: 10 }), [slug, page]);
  const mine = useApi(() => (status === 'authed' ? reviewsApi.mine(slug) : Promise.resolve(null)), [slug, status]);
  const [form, setForm] = useState(null); // null = closed, otherwise { rating, title, text }
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [notice, setNotice] = useState('');

  const s = list.data?.summary; const pg = list.data?.pagination;
  const my = mine.data?.review; const canReview = mine.data?.canReview;
  const open = () => { setProblem(''); setNotice(''); setForm({ rating: my?.rating || 5, title: my?.title || '', text: my?.text || '' }); };
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setProblem('');
    try {
      await reviewsApi.save(slug, { rating: form.rating, title: form.title.trim() || undefined, text: form.text.trim() || undefined });
      setForm(null); setNotice(t('reviewSubmitted')); await mine.reload(); await list.reload();
    } catch (err) { setProblem(err.details?.[0]?.message || err.message || t('reviewSaveError')); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm(t('deleteReviewConfirm'))) return;
    try { await reviewsApi.remove(slug); setNotice(t('reviewDeleted')); await mine.reload(); await list.reload(); } catch (err) { setProblem(err.message); }
  };

  return (
    <section className="afsana-reviews mt-16 rounded-2xl border border-[#263e0e]/10 bg-[#faf8f4] p-5 sm:p-7 shadow-[0_18px_50px_rgba(24,35,8,.06)]" aria-labelledby="reviews-title">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h2 id="reviews-title" className="font-display text-2xl">{t("reviewsHeading")}</h2>
          {s && s.count > 0 && <p className="text-sm text-[#5f654f] mt-1 flex items-center gap-2"><Stars value={s.avg} /> {s.avg} out of 5 · {s.count} {s.count === 1 ? 'review' : 'reviews'}</p>}
        </div>
        {status === 'authed' && canReview && !form && <Button variant="secondary" onClick={open}>{my ? t('editReview') : t('writeReview')}</Button>}
      </div>

      {notice && <p role="status" className="text-sm text-[#3d6b3d] mb-4">{notice}</p>}
      {status === 'guest' && <p className="text-sm text-[#5f654f] mb-4"><Link to="/login" className="underline text-[#182308]">{t("signInReview")}</Link> {t("signInReviewPrompt")}</p>}
      {status === 'authed' && mine.data && !canReview && !my && <p className="text-sm text-[#5f654f] mb-4">{t("reviewDeliveredPrompt")}</p>}
      {my && !form && (
        <div className="rounded-xl border border-[#263e0e]/10 bg-[#faf8f4]-raised p-4 mb-6 text-sm space-y-1">
          <p className="text-[#182308]">{t("yourReview")} <span className="text-[#5f654f]">({my.status === 'Pending' ? t("waitingApproval") : my.status === 'Rejected' ? t("notPublished") : t("published")})</span></p>
          <Stars value={my.rating} />{my.title && <p className="text-[#182308]">{my.title}</p>}{my.text && <p className="text-[#5f654f] whitespace-pre-wrap">{my.text}</p>}
          <button type="button" onClick={remove} className="text-xs text-[#9b3f3f] underline">{t("deleteReview")}</button>
        </div>
      )}

      {form && (
        <form onSubmit={save} className="rounded-xl border border-[#263e0e]/10 bg-[#faf8f4]-raised p-5 mb-6 space-y-4" noValidate>
          <div role="radiogroup" aria-label={t("yourRating")} className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={form.rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setForm({ ...form, rating: n })} className={`text-2xl ${n <= form.rating ? 'text-[#d4af37]' : 'text-[#5f654f]/40'}`}>★</button>
            ))}
          </div>
          <Field label={t("reviewTitleOptional")}><Input maxLength={80} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label={t("reviewTextOptional")} hint={t("reviewTextHint")}><Textarea rows={4} maxLength={1500} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} /></Field>
          {problem && <p role="alert" className="text-sm text-[#9b3f3f]">{problem}</p>}
          <div className="flex gap-3"><Button type="submit" disabled={busy}>{busy ? t('saving') : t('submitReview')}</Button><Button type="button" variant="secondary" onClick={() => setForm(null)}>{t("cancel")}</Button></div>
        </form>
      )}

      {list.loading && !list.data ? <p className="text-sm text-[#5f654f]">{t("loadingReviews")}</p>
        : list.error ? <p className="text-sm text-[#9b3f3f]">{t("reviewsLoadError")}</p>
         : !list.data?.reviews?.length ? <p className="text-sm text-[#5f654f]">{t("noReviews")}</p>
        : (
          <ul className="space-y-5">
            {list.data.reviews.map((r) => (
              <li key={r.id} className="border-b border-[#263e0e]/10 pb-5 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 text-sm"><Stars value={r.rating} />{r.featured && <span className="text-xs text-[#748e40]">{t("featuredReview")}</span>}</div>
                {r.title && <p className="text-[#182308] mt-1">{r.title}</p>}
                {r.text && <p className="text-sm text-[#5f654f] mt-1 whitespace-pre-wrap">{r.text}</p>}
                <p className="text-xs text-[#5f654f] mt-2">{r.name} · {t("verifiedBuyer")} · {fmt(r.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      <div className="afsana-review-preview" aria-label="Illustrative sample review cards">
        <div className="afsana-review-preview-head">
          <div><p className="afsana-review-preview-kicker">{t("sampleKicker")}</p><h3>{t("sampleHeading")}</h3></div>
          <span>{t("sampleCount")}</span>
        </div>
        <p className="afsana-review-preview-note">{t("sampleNotice")}</p>
        <div className="afsana-review-preview-grid">
          {[
            {group:t("sample1Group"),language:t("sample1Language"),text:t("sample1Text")},
            {group:t("sample2Group"),language:t("sample2Language"),text:t("sample2Text")},
            {group:t("sample3Group"),language:t("sample3Language"),text:t("sample3Text")},
            {group:t("sample4Group"),language:t("sample4Language"),text:t("sample4Text")}
          ].map((review,index)=>(
            <article className="afsana-review-preview-card" key={index}>
              <div className="afsana-review-preview-meta"><span>{review.group}</span><small>{review.language}</small></div>
              <div className="afsana-review-preview-stars" aria-label="Sample 5 out of 5 stars">★★★★★</div>
              <p>{review.text}</p>
              <span className="afsana-review-preview-label">{t("sampleLabel")}</span>
            </article>
          ))}
        </div>
      </div>

      {pg && pg.pages > 1 && (
        <div className="flex items-center gap-3 mt-6 text-sm">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("previous")}</Button>
          <span className="text-[#5f654f]">Page {pg.page} of {pg.pages}</span>
          <Button variant="secondary" size="sm" disabled={page >= pg.pages} onClick={() => setPage(page + 1)}>{t("next")}</Button>
        </div>
      )}
    </section>
  );
}
