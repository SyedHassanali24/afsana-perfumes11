import { Minus, Plus, ImageOff } from 'lucide-react';
import Button from '../../admin/components/Button';

export const Container = ({ children, className = '' }) => <div className={`max-w-6xl mx-auto px-4 sm:px-6 ${className}`}>{children}</div>;

export const PageTitle = ({ title, subtitle, action }) => (
  <div className="flex items-end justify-between gap-4 mb-6">
    <div>
      <h1 className="font-display text-3xl">{title}</h1>
      {subtitle && <p className="text-sm text-ink-muted mt-1">{subtitle}</p>}
    </div>
    {action}
  </div>
);

export function Placeholder({ className = '' }) {
  return <div className={`flex items-center justify-center bg-gold-soft text-gold ${className}`}><ImageOff className="w-6 h-6 opacity-60" aria-hidden /></div>;
}

// Every data screen shows one of: loading / error (+retry) / empty / content.
export function StateBox({ loading, error, empty, emptyText = 'Nothing here yet.', onRetry, children, skeleton }) {
  if (loading) return skeleton || <div className="py-16 text-center text-sm text-ink-muted" role="status">Loading…</div>;
  if (error) return (
    <div className="py-16 text-center space-y-3" role="alert">
      <p className="text-sm text-danger">{error.message || 'Something went wrong.'}</p>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>}
    </div>
  );
  if (empty) return <div className="py-16 text-center text-sm text-ink-muted">{emptyText}</div>;
  return children;
}

export const CardsSkeleton = ({ n = 8 }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6" aria-hidden>
    {Array.from({ length: n }, (_, i) => <div key={i} className="aspect-[4/5] rounded-md bg-surface border border-border animate-pulse" />)}
  </div>
);

export function Pager({ pagination, onPage }) {
  if (!pagination || pagination.pages <= 1) return null;
  const { page, pages } = pagination;
  return (
    <nav className="flex items-center justify-center gap-3 mt-10" aria-label="Pagination">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
      <span className="text-sm text-ink-muted">Page {page} of {pages}</span>
      <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
    </nav>
  );
}

export function QtyStepper({ value, onChange, max = 20, min = 1, label = 'Quantity' }) {
  const cap = Math.max(min, Math.min(20, max));
  return (
    <div className="inline-flex items-center border border-border rounded-sm" role="group" aria-label={label}>
      <button type="button" aria-label="Decrease" disabled={value <= min} onClick={() => onChange(value - 1)} className="p-2 text-ink-muted disabled:opacity-30"><Minus className="w-4 h-4" /></button>
      <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{value}</span>
      <button type="button" aria-label="Increase" disabled={value >= cap} onClick={() => onChange(value + 1)} className="p-2 text-ink-muted disabled:opacity-30"><Plus className="w-4 h-4" /></button>
    </div>
  );
}
