import { useMemo, useState } from 'react';
import { GripVertical, Pencil, Plus, Power, Trash2, Video, Image as ImageIcon, Sparkles } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Drawer from '../components/Drawer';
import ConfirmDialog from '../components/ConfirmDialog';
import { Field, Input, Textarea, Check } from '../components/FormFields';
import { useAuth } from '../../src/auth/AuthContext';
import { cmsApi } from '../../src/services';
import useApi from '../../src/hooks/useApi';
import { HOMEPAGE_SECTION_TYPES } from '../../src/services/mappers/cms';

const defaults = (type) => ({
  eyebrow: '', subtitle: '', body: '', imageUrl: '', mobileImageUrl: '', videoUrl: '', posterUrl: '',
  buttonText: '', buttonLink: '', limit: 4, query: '', items: '', height: 80,
  autoplay: true, muted: true,
  ...(type === 'benefits' ? { items: 'Premium ingredients|Crafted with care\nLong lasting|Made for memorable moments\nOriginal|Authentic Afsana fragrance\nFast delivery|Packed with care' } : {}),
});
const parseItems = (text) => String(text || '').split('\n').map((x) => x.trim()).filter(Boolean).map((x) => { const [title, ...rest] = x.split('|'); return { title: title.trim(), text: rest.join('|').trim() }; });

export default function HomepageBuilder() {
  const { can } = useAuth();
  const api = useMemo(() => cmsApi('homepage'), []);
  const { data, loading, error, reload } = useApi(() => api.list(), []);
  const rows = data?.items || [];
  const [dragId, setDragId] = useState(null);
  const [drawer, setDrawer] = useState({ open: false, item: null });
  const [form, setForm] = useState({ type: 'hero', title: '', config: defaults('hero'), isEnabled: true });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [del, setDel] = useState(null);
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const setConfig = (k, v) => setForm((s) => ({ ...s, config: { ...s.config, [k]: v } }));
  const open = (item) => {
    if (item) {
      const cfg = { ...defaults(item.type), ...(item.config || {}) };
      cfg.items = Array.isArray(cfg.items) ? cfg.items.map((x) => `${x.title || ''}|${x.text || ''}`).join('\n') : (cfg.items || '');
      setForm({ type: item.type, title: item.title || '', config: cfg, isEnabled: item.isEnabled !== false });
    } else setForm({ type: 'hero', title: '', config: defaults('hero'), isEnabled: true });
    setDrawer({ open: true, item: item || null });
  };
  const close = () => setDrawer({ open: false, item: null });
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setNotice('');
    try {
      const cfg = { ...form.config };
      if (['benefits', 'testimonials', 'blog_grid'].includes(form.type) && typeof cfg.items === 'string') cfg.items = parseItems(cfg.items);
      const payload = { type: form.type, title: form.title.trim(), config: cfg, sortOrder: drawer.item?.sortOrder ?? rows.length, isEnabled: !!form.isEnabled };
      if (drawer.item) await api.update(drawer.item.id, payload); else await api.create(payload);
      close(); setNotice('Section saved.'); reload();
    } catch (e2) { setNotice(e2.message || 'Could not save section.'); } finally { setBusy(false); }
  };
  const reorder = async (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const next = [...rows].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const from = next.findIndex((x) => x.id === sourceId), to = next.findIndex((x) => x.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = next.splice(from, 1); next.splice(to, 0, moved);
    try { for (let i = 0; i < next.length; i += 1) await api.update(next[i].id, { sortOrder: i }); setNotice('Section order saved.'); reload(); }
    catch (e) { setNotice(e.message || 'Could not reorder sections.'); }
  };
  const sorted = [...rows].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const common = ['hero', 'video_banner', 'image_banner', 'split_story', 'rich_text'].includes(form.type);

  return <div className="space-y-5">
    <div className="rounded-2xl border border-primary-soft-border bg-primary-soft p-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div><p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">Visual homepage builder</p><h2 className="font-display text-2xl mt-1">Build your storefront like a canvas</h2><p className="text-sm text-ink-muted mt-1">Drag sections, switch them on/off, and edit text, images and videos without touching code.</p></div>
        {can('homepage.create') && <Button icon={Plus} onClick={() => open(null)}>Add section</Button>}
      </div>
    </div>
    {notice && <p role="status" className="text-sm rounded-xl px-4 py-3 bg-success-soft text-success">{notice}</p>}
    {error ? <Card><p className="text-sm text-danger">{error.message}</p></Card> : loading ? <Card><p className="text-sm text-ink-muted">Loading builder…</p></Card> : <div className="space-y-3">
      {sorted.map((item, index) => {
        const meta = HOMEPAGE_SECTION_TYPES.find((x) => x.key === item.type);
        return <div key={item.id} draggable={can('homepage.edit')} onDragStart={() => setDragId(item.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => { reorder(dragId, item.id); setDragId(null); }} className="group rounded-2xl border border-border bg-surface p-4 shadow-card hover:shadow-card-hover transition-shadow">
          <div className="flex items-center gap-3">
            <button type="button" className="cursor-grab p-2 rounded-xl bg-bg text-ink-muted" aria-label="Drag section"><GripVertical className="w-5 h-5" /></button>
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-xs font-semibold text-primary">{String(index + 1).padStart(2, '0')}</span><h3 className="font-medium truncate">{item.title || meta?.label || item.type}</h3>{item.type === 'video_banner' && <Video className="w-4 h-4 text-primary" />}{item.type === 'image_banner' && <ImageIcon className="w-4 h-4 text-primary" />}</div><p className="text-xs text-ink-muted mt-1">{meta?.label || item.type}</p></div>
            <span className={item.isEnabled ? 'text-xs rounded-full bg-success-soft text-success px-2.5 py-1' : 'text-xs rounded-full bg-bg text-ink-muted px-2.5 py-1'}>{item.isEnabled ? 'Live' : 'Hidden'}</span>
            {can('homepage.edit') && <button type="button" onClick={() => api.setActive(item.id, !item.isEnabled).then(reload)} className="p-2 rounded-xl text-ink-muted hover:bg-primary-soft hover:text-primary" title={item.isEnabled ? 'Hide' : 'Show'}><Power className="w-4 h-4" /></button>}
            {can('homepage.edit') && <button type="button" onClick={() => open(item)} className="p-2 rounded-xl text-ink-muted hover:bg-primary-soft hover:text-primary" title="Edit"><Pencil className="w-4 h-4" /></button>}
            {can('homepage.delete') && <button type="button" onClick={() => setDel(item)} className="p-2 rounded-xl text-ink-muted hover:bg-danger-soft hover:text-danger" title="Delete"><Trash2 className="w-4 h-4" /></button>}
          </div>
        </div>;
      })}
      {!sorted.length && <Card><div className="py-10 text-center"><Sparkles className="w-8 h-8 mx-auto text-primary" /><p className="font-medium mt-3">Your canvas is empty</p><p className="text-sm text-ink-muted mt-1">Add a hero, product row, story, video banner, testimonials or another section.</p></div></Card>}
    </div>}
    <Drawer open={drawer.open} onClose={close} title={drawer.item ? 'Edit homepage section' : 'Add homepage section'} footer={<><Button variant="secondary" type="button" onClick={close}>Cancel</Button><Button type="submit" form="homepage-section-form" disabled={busy}>{busy ? 'Saving…' : 'Save section'}</Button></>}>
      <form id="homepage-section-form" onSubmit={save} className="space-y-4">
        <Field label="Section type"><select value={form.type} disabled={!!drawer.item} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value, config: defaults(e.target.value) }))} className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">{HOMEPAGE_SECTION_TYPES.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</select></Field>
        <Field label="Section title" hint="Optional — leave empty for the component's default heading"><Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Discover your signature scent" /></Field>
        {common && <><Field label="Eyebrow"><Input value={form.config.eyebrow || ''} onChange={(e) => setConfig('eyebrow', e.target.value)} /></Field><Field label="Subtitle"><Input value={form.config.subtitle || ''} onChange={(e) => setConfig('subtitle', e.target.value)} /></Field><Field label="Body copy"><Textarea rows={5} value={form.config.body || ''} onChange={(e) => setConfig('body', e.target.value)} /></Field></>}
        {['hero', 'image_banner', 'split_story'].includes(form.type) && <><Field label="Image URL"><Input value={form.config.imageUrl || ''} onChange={(e) => setConfig('imageUrl', e.target.value)} placeholder="https://… or /api/media/…" /></Field><Field label="Mobile image URL"><Input value={form.config.mobileImageUrl || ''} onChange={(e) => setConfig('mobileImageUrl', e.target.value)} /></Field></>}
        {form.type === 'video_banner' && <><Field label="Video URL" hint="MP4/WebM URL. This remains a full banner-sized video section."><Input value={form.config.videoUrl || ''} onChange={(e) => setConfig('videoUrl', e.target.value)} placeholder="https://…/hero.mp4" /></Field><Field label="Poster image URL"><Input value={form.config.posterUrl || ''} onChange={(e) => setConfig('posterUrl', e.target.value)} /></Field></>}
        {['hero', 'video_banner', 'image_banner', 'split_story'].includes(form.type) && <div className="grid grid-cols-2 gap-3"><Field label="Button text"><Input value={form.config.buttonText || ''} onChange={(e) => setConfig('buttonText', e.target.value)} /></Field><Field label="Button link"><Input value={form.config.buttonLink || ''} onChange={(e) => setConfig('buttonLink', e.target.value)} placeholder="/shop" /></Field></div>}
        {['featured_collection', 'best_sellers', 'new_arrivals', 'under_2000', 'gift_boxes', 'blog_grid'].includes(form.type) && <><Field label="Collection / query hint"><Input value={form.config.query || ''} onChange={(e) => setConfig('query', e.target.value)} placeholder="Optional category / collection / query" /></Field><Field label="Number of items"><Input type="number" min="1" max="12" value={form.config.limit ?? 4} onChange={(e) => setConfig('limit', Number(e.target.value))} /></Field></>}
        {['benefits', 'testimonials', 'blog_grid'].includes(form.type) && <Field label="Cards" hint="One per line: Title|Description"><Textarea rows={8} value={typeof form.config.items === 'string' ? form.config.items : ''} onChange={(e) => setConfig('items', e.target.value)} /></Field>}
        {form.type === 'rich_text' && <Field label="Content"><Textarea rows={10} value={form.config.body || ''} onChange={(e) => setConfig('body', e.target.value)} /></Field>}
        {form.type === 'spacer' && <Field label="Height (px)"><Input type="number" min="20" max="500" value={form.config.height || 80} onChange={(e) => setConfig('height', Number(e.target.value))} /></Field>}
        {form.type === 'faq' && <p className="text-sm text-ink-muted">This section automatically uses your active FAQ content from CMS.</p>}
        {form.type === 'newsletter' && <p className="text-sm text-ink-muted">This section can be placed anywhere on the homepage.</p>}
        {form.type === 'instagram' && <Field label="Social URL"><Input value={form.config.url || ''} onChange={(e) => setConfig('url', e.target.value)} placeholder="https://instagram.com/…" /></Field>}
        <Check label="Show this section on the storefront" checked={form.isEnabled} onChange={(v) => set('isEnabled', v)} />
      </form>
    </Drawer>
    <ConfirmDialog open={!!del} danger title="Delete this section?" message="The section will disappear from the homepage. You can add another section later." confirmLabel="Delete" onClose={() => setDel(null)} onConfirm={async () => { await api.remove(del.id); setDel(null); setNotice('Section deleted.'); reload(); }} />
  </div>;
}
