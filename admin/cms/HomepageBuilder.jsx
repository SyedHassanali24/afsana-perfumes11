import { useMemo, useState } from 'react';
import { GripVertical, Pencil, Plus, Power, Trash2, Video, Image as ImageIcon, Sparkles, ArrowUp, ArrowDown, Copy, LayoutGrid, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Drawer from '../components/Drawer';
import ConfirmDialog from '../components/ConfirmDialog';
import { Field, Input, Textarea, Check, Select } from '../components/FormFields';
import { useAuth } from '../../src/auth/AuthContext';
import { cmsApi } from '../../src/services';
import useApi from '../../src/hooks/useApi';
import { HOMEPAGE_SECTION_TYPES } from '../../src/services/mappers/cms';

const defaults = (type) => ({
  eyebrow: '', subtitle: '', body: '', imageUrl: '', mobileImageUrl: '', videoUrl: '', posterUrl: '',
  buttonText: '', buttonLink: '', limit: 4, query: '', height: 'auto',
  width: 100, columns: 4, gap: 16, align: 'left', paddingTop: 80, paddingBottom: 80,
  autoplay: true, muted: true, controls: false, overlay: true, background: '',
  items: '',
  ...(type === 'video_grid' ? { columns: 4, items: 'Atmosphere|The first impression|https://videos.pexels.com/video-files/853801/853801-hd_1920_1080_30fps.mp4|https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=900&q=75\nIngredient|Dark woods|https://videos.pexels.com/video-files/853801/853801-hd_1920_1080_30fps.mp4|https://images.unsplash.com/photo-1616949755610-8c9bbc08f138?auto=format&fit=crop&w=900&q=75\nCraft|Made by hand|https://videos.pexels.com/video-files/853801/853801-hd_1920_1080_30fps.mp4|https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=900&q=75\nEmotion|Leave a trace|https://videos.pexels.com/video-files/853801/853801-hd_1920_1080_30fps.mp4|https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=75' } : {}),
  ...(type === 'post_grid' ? { columns: 4, items: 'Find your signature scent|A guide to choosing your next fragrance|https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=900&q=80|/journal\nThe world of oud|The mysterious world of oud|https://images.unsplash.com/photo-1616949755610-8c9bbc08f138?auto=format&fit=crop&w=900&q=80|/journal\nThe psychology of scent|Why fragrance becomes memory|https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=80|/journal\nThe Afsana ritual|Make your fragrance yours|https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80|/journal' } : {}),
  ...(type === 'promo_timer' ? { endAt: '', label: 'PRIVATE COLLECTION OFFER', offerText: 'A special AFSANA offer ends soon.', buttonText: 'Shop the offer', buttonLink: '/shop' } : {}),
});
const parseItems = (text) => String(text || '').split('\n').map((x) => x.trim()).filter(Boolean).map((x) => {
  const [title = '', textValue = '', image = '', link = ''] = x.split('|');
  return { title: title.trim(), text: textValue.trim(), image: image.trim(), link: link.trim() };
});
const itemText = (items) => Array.isArray(items) ? items.map((x) => [x.title || '', x.text || '', x.image || '', x.link || ''].filter((v, i) => i < 2 || v).join('|')).join('\n') : String(items || '');

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
  const preview = () => { try { localStorage.setItem('afsana_cms_preview_v1', JSON.stringify({ sections: sorted })); window.open('/?afsanaPreview=1', '_blank', 'noopener,noreferrer'); } catch { setNotice('Preview could not be opened in this browser.'); } };
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const setConfig = (k, v) => setForm((s) => ({ ...s, config: { ...s.config, [k]: v } }));
  const open = (item) => {
    if (item) {
      const cfg = { ...defaults(item.type), ...(item.config || {}) };
      cfg.items = itemText(cfg.items);
      setForm({ type: item.type, title: item.title || '', config: cfg, isEnabled: item.isEnabled !== false });
    } else setForm({ type: 'hero', title: '', config: defaults('hero'), isEnabled: true });
    setDrawer({ open: true, item: item || null });
  };
  const close = () => setDrawer({ open: false, item: null });
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setNotice('');
    try {
      const cfg = { ...form.config };
      const itemTypes = ['benefits','testimonials','blog_grid','post_grid','category_tiles','marquee','trust_grid','values_grid','video_grid'];
      if (itemTypes.includes(form.type) && typeof cfg.items === 'string') cfg.items = parseItems(cfg.items);
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
    try { await Promise.all(next.map((item, i) => api.update(item.id, { sortOrder: i }))); setNotice('Section order saved.'); reload(); }
    catch (e) { setNotice(e.message || 'Could not reorder sections.'); }
  };
  const sorted = [...rows].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const moveBy = async (id, delta) => {
    const next = [...sorted], from = next.findIndex((x) => x.id === id), to = from + delta;
    if (from < 0 || to < 0 || to >= next.length) return;
    const [moved] = next.splice(from, 1); next.splice(to, 0, moved);
    try { await Promise.all(next.map((item, i) => api.update(item.id, { sortOrder: i }))); setNotice('Section order saved.'); reload(); }
    catch (e) { setNotice(e.message || 'Could not reorder sections.'); }
  };
  const duplicate = async (item) => {
    setBusy(true); setNotice('');
    try { await api.create({ type: item.type, title: item.title || '', config: item.config || {}, sortOrder: (item.sortOrder ?? rows.length) + 1, isEnabled: false }); setNotice('Section duplicated as hidden. Review it, then publish it.'); reload(); }
    catch (e) { setNotice(e.message || 'Could not duplicate section.'); } finally { setBusy(false); }
  };

  const common = ['hero','video_banner','image_banner','split_story','rich_text','cinematic_statement','lookbook'].includes(form.type);
  const itemTypes = ['benefits','testimonials','blog_grid','post_grid','category_tiles','marquee','trust_grid','values_grid','video_grid'];
  return <div className="space-y-5">
    <div className="rounded-2xl border border-[#b4bf41]/35 bg-[#eef2e5] p-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div><p className="text-xs uppercase tracking-[.18em] text-[#263e0e] font-semibold">Visual homepage builder</p><h2 className="font-display text-2xl mt-1">Build the storefront like a canvas</h2><p className="text-sm text-[#5f654f] mt-1">Drag sections, set alignment, width, height, columns and spacing. Add up to 4 videos or posts in one row, then preview and publish.</p></div>
        <div className="flex gap-2">{can('homepage.edit') && <Button variant="secondary" onClick={preview}>Preview</Button>}{can('homepage.create') && <Button icon={Plus} onClick={() => open(null)}>Add section</Button>}</div>
      </div>
    </div>
    {notice && <p role="status" className="text-sm rounded-xl px-4 py-3 bg-[#e6f0e4] text-[#3d6b3d]">{notice}</p>}
    {error ? <Card><p className="text-sm text-[#9b3f3f]">{error.message}</p></Card> : loading ? <Card><p className="text-sm text-[#5f654f]">Loading builder…</p></Card> : <div className="space-y-3">
      {sorted.map((item, index) => {
        const meta = HOMEPAGE_SECTION_TYPES.find((x) => x.key === item.type);
        const cfg = item.config || {};
        return <div key={item.id} draggable={can('homepage.edit')} onDragStart={() => setDragId(item.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => { reorder(dragId, item.id); setDragId(null); }} className="group rounded-2xl border border-[#263e0e]/10 bg-[#faf8f4] p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-shadow">
          <div className="flex items-center gap-3">
            <button type="button" className="cursor-grab p-2 rounded-xl bg-[#f3f1e9] text-[#5f654f]" aria-label="Drag section"><GripVertical className="w-5 h-5" /></button>
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-xs font-semibold text-[#748e40]">{String(index + 1).padStart(2, '0')}</span><h3 className="font-medium truncate">{item.title || meta?.label || item.type}</h3>{item.type.includes('video') && <Video className="w-4 h-4 text-[#263e0e]" />}{item.type.includes('image') && <ImageIcon className="w-4 h-4 text-[#263e0e]" />}</div><p className="text-xs text-[#5f654f] mt-1">{meta?.label || item.type} · {cfg.columns || 1} columns · {cfg.align || 'left'} · {cfg.width || 100}%</p></div>
            <span className={item.isEnabled ? 'text-xs rounded-full bg-[#e6f0e4] text-[#3d6b3d] px-2.5 py-1' : 'text-xs rounded-full bg-[#f3f1e9] text-[#5f654f] px-2.5 py-1'}>{item.isEnabled ? 'Live' : 'Hidden'}</span>
            {can('homepage.edit') && <div className="flex items-center gap-1">
              <button type="button" disabled={index === 0} onClick={() => moveBy(item.id, -1)} className="p-2 rounded-xl text-[#5f654f] hover:bg-[#eef2e5] hover:text-[#263e0e] disabled:opacity-30" title="Move up"><ArrowUp className="w-4 h-4" /></button>
              <button type="button" disabled={index === sorted.length - 1} onClick={() => moveBy(item.id, 1)} className="p-2 rounded-xl text-[#5f654f] hover:bg-[#eef2e5] hover:text-[#263e0e] disabled:opacity-30" title="Move down"><ArrowDown className="w-4 h-4" /></button>
              <button type="button" onClick={() => duplicate(item)} className="p-2 rounded-xl text-[#5f654f] hover:bg-[#eef2e5] hover:text-[#263e0e]" title="Duplicate"><Copy className="w-4 h-4" /></button>
              <button type="button" onClick={() => api.setActive(item.id, !item.isEnabled).then(reload)} className="p-2 rounded-xl text-[#5f654f] hover:bg-[#eef2e5] hover:text-[#263e0e]" title={item.isEnabled ? 'Hide' : 'Show'}><Power className="w-4 h-4" /></button>
              <button type="button" onClick={() => open(item)} className="p-2 rounded-xl text-[#5f654f] hover:bg-[#eef2e5] hover:text-[#263e0e]" title="Edit"><Pencil className="w-4 h-4" /></button>
            </div>}
            {can('homepage.delete') && <button type="button" onClick={() => setDel(item)} className="p-2 rounded-xl text-[#5f654f] hover:bg-[#f7e7e5] hover:text-[#9b3f3f]" title="Delete"><Trash2 className="w-4 h-4" /></button>}
          </div>
        </div>;
      })}
      {!sorted.length && <Card><div className="py-10 text-center"><Sparkles className="w-8 h-8 mx-auto text-[#748e40]" /><p className="font-medium mt-3">Your canvas is empty</p><p className="text-sm text-[#5f654f] mt-1">Add a hero, product row, story, video grid, post grid, offer timer or another section.</p></div></Card>}
    </div>}
    <Drawer open={drawer.open} onClose={close} title={drawer.item ? 'Edit homepage section' : 'Add homepage section'} footer={<><Button variant="secondary" type="button" onClick={close}>Cancel</Button><Button type="submit" form="homepage-section-form" disabled={busy}>{busy ? 'Saving…' : 'Save section'}</Button></>}>
      <form id="homepage-section-form" onSubmit={save} className="space-y-4">
        <Field label="Section type"><Select value={form.type} disabled={!!drawer.item} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value, config: defaults(e.target.value) }))}>{HOMEPAGE_SECTION_TYPES.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</Select></Field>
        <Field label="Section title" hint="Optional — leave empty for the component's default heading"><Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Discover your signature scent" /></Field>

        <div className="rounded-2xl border border-[#263e0e]/10 bg-[#f3f1e9] p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold"><LayoutGrid className="w-4 h-4 text-[#748e40]" /> Layout controls</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Width %"><Input type="number" min="20" max="100" value={form.config.width ?? 100} onChange={(e) => setConfig('width', Math.min(100, Math.max(20, Number(e.target.value))))} /></Field>
            <Field label="Height"><Input value={form.config.height ?? 'auto'} onChange={(e) => setConfig('height', e.target.value)} placeholder="auto or 650px" /></Field>
            <Field label="Columns"><Select value={form.config.columns ?? 4} onChange={(e) => setConfig('columns', Number(e.target.value))}>{[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} columns</option>)}</Select></Field>
            <Field label="Gap px"><Input type="number" min="0" max="64" value={form.config.gap ?? 16} onChange={(e) => setConfig('gap', Number(e.target.value))} /></Field>
            <Field label="Top padding"><Input type="number" min="0" max="240" value={form.config.paddingTop ?? 80} onChange={(e) => setConfig('paddingTop', Number(e.target.value))} /></Field>
            <Field label="Bottom padding"><Input type="number" min="0" max="240" value={form.config.paddingBottom ?? 80} onChange={(e) => setConfig('paddingBottom', Number(e.target.value))} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[['left',AlignLeft,'Left'],['center',AlignCenter,'Center'],['right',AlignRight,'Right']].map(([value,Icon,label]) => <button type="button" key={value} onClick={() => setConfig('align', value)} className={'flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs '+(form.config.align===value?'border-[#263e0e] bg-[#263e0e] text-white':'border-[#263e0e]/10 bg-white text-[#5f654f]')}><Icon className="w-4 h-4"/>{label}</button>)}
          </div>
        </div>

        {common && <><Field label="Eyebrow"><Input value={form.config.eyebrow || ''} onChange={(e) => setConfig('eyebrow', e.target.value)} /></Field><Field label="Subtitle"><Input value={form.config.subtitle || ''} onChange={(e) => setConfig('subtitle', e.target.value)} /></Field><Field label="Body copy"><Textarea rows={5} value={form.config.body || ''} onChange={(e) => setConfig('body', e.target.value)} /></Field></>}
        {['hero','image_banner','split_story','lookbook'].includes(form.type) && <><Field label="Image URL"><Input value={form.config.imageUrl || ''} onChange={(e) => setConfig('imageUrl', e.target.value)} placeholder="https://…" /></Field><Field label="Mobile image URL"><Input value={form.config.mobileImageUrl || ''} onChange={(e) => setConfig('mobileImageUrl', e.target.value)} /></Field></>}
        {['video_banner','video_grid'].includes(form.type) && <><Field label="Video URL"><Input value={form.config.videoUrl || ''} onChange={(e) => setConfig('videoUrl', e.target.value)} placeholder="https://…/video.mp4" /></Field><Field label="Poster image URL"><Input value={form.config.posterUrl || ''} onChange={(e) => setConfig('posterUrl', e.target.value)} /></Field><div className="grid grid-cols-3 gap-2"><Check label="Autoplay" checked={form.config.autoplay !== false} onChange={(v) => setConfig('autoplay', v)} /><Check label="Muted" checked={form.config.muted !== false} onChange={(v) => setConfig('muted', v)} /><Check label="Controls" checked={!!form.config.controls} onChange={(v) => setConfig('controls', v)} /></div></>}
        {['hero','video_banner','image_banner','split_story','promo_timer','cinematic_statement'].includes(form.type) && <div className="grid grid-cols-2 gap-3"><Field label="Button text"><Input value={form.config.buttonText || ''} onChange={(e) => setConfig('buttonText', e.target.value)} /></Field><Field label="Button link"><Input value={form.config.buttonLink || ''} onChange={(e) => setConfig('buttonLink', e.target.value)} placeholder="/shop" /></Field></div>}
        {['featured_collection','best_sellers','new_arrivals','under_2000','gift_boxes','blog_grid'].includes(form.type) && <><Field label="Collection / query hint"><Input value={form.config.query || ''} onChange={(e) => setConfig('query', e.target.value)} placeholder="Optional category / collection / query" /></Field><Field label="Number of items"><Input type="number" min="1" max="12" value={form.config.limit ?? 4} onChange={(e) => setConfig('limit', Number(e.target.value))} /></Field></>}
        {itemTypes.includes(form.type) && <Field label="Items" hint="One per line: Title|Description|Image URL|Link. Video grid uses Title|Description|Video URL|Poster URL."><Textarea rows={10} value={typeof form.config.items === 'string' ? form.config.items : ''} onChange={(e) => setConfig('items', e.target.value)} /></Field>}
        {form.type === 'promo_timer' && <><Field label="Offer label"><Input value={form.config.label || ''} onChange={(e) => setConfig('label', e.target.value)} /></Field><Field label="Offer end (ISO/date-time)"><Input type="datetime-local" value={form.config.endAt || ''} onChange={(e) => setConfig('endAt', e.target.value)} /></Field><Field label="Offer text"><Textarea rows={3} value={form.config.offerText || ''} onChange={(e) => setConfig('offerText', e.target.value)} /></Field></>}
        {form.type === 'rich_text' && <Field label="Content"><Textarea rows={10} value={form.config.body || ''} onChange={(e) => setConfig('body', e.target.value)} /></Field>}
        {form.type === 'spacer' && <Field label="Height (px)"><Input type="number" min="20" max="500" value={form.config.height || 80} onChange={(e) => setConfig('height', Number(e.target.value))} /></Field>}
        {form.type === 'faq' && <p className="text-sm text-[#5f654f]">This section automatically uses active FAQ content.</p>}
        {form.type === 'newsletter' && <p className="text-sm text-[#5f654f]">Newsletter signup can be placed anywhere.</p>}
        {form.type === 'scent_finder' && <p className="text-sm text-[#5f654f]">Uses the interactive AFSANA scent-finder experience.</p>}
        {form.type === 'instagram' && <><Field label="Social URL"><Input value={form.config.url || ''} onChange={(e) => setConfig('url', e.target.value)} placeholder="https://instagram.com/…" /></Field><Field label="Intro text"><Textarea rows={3} value={form.config.body || ''} onChange={(e) => setConfig('body', e.target.value)} /></Field></>}
        <Check label="Show this section on the storefront" checked={form.isEnabled} onChange={(v) => set('isEnabled', v)} />
      </form>
    </Drawer>
    <ConfirmDialog open={!!del} danger title="Delete this section?" message="The section will disappear from the homepage. You can add another section later." confirmLabel="Delete" onClose={() => setDel(null)} onConfirm={async () => { await api.remove(del.id); setDel(null); setNotice('Section deleted.'); reload(); }} />
  </div>;
}
