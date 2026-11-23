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
import ImageUploadButton from '../components/ImageUploadButton';
import VideoUploadButton from '../components/VideoUploadButton';

const defaults = (type) => ({
  eyebrow: '', subtitle: '', body: '', imageUrl: '', mobileImageUrl: '', videoUrl: '', posterUrl: '', templateSlot: 'home',
  buttonText: '', buttonLink: '', limit: 4, query: '', height: 'auto',
  width: 100, columns: 4, gap: 16, align: 'left', paddingTop: 80, paddingBottom: 80,
  autoplay: true, muted: true, controls: false, overlay: true, background: '',
  items: '',
  ...(type === 'video_grid' ? { columns: 4, items: 'Atmosphere|The first impression|https://videos.pexels.com/video-files/853801/853801-hd_1920_1080_30fps.mp4|https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=900&q=75\nIngredient|Dark woods|https://videos.pexels.com/video-files/853801/853801-hd_1920_1080_30fps.mp4|https://images.unsplash.com/photo-1616949755610-8c9bbc08f138?auto=format&fit=crop&w=900&q=75\nCraft|Made by hand|https://videos.pexels.com/video-files/853801/853801-hd_1920_1080_30fps.mp4|https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=900&q=75\nEmotion|Leave a trace|https://videos.pexels.com/video-files/853801/853801-hd_1920_1080_30fps.mp4|https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=75' } : {}),
  ...(type === 'testimonials' ? { eyebrow: 'THE AFSANA CIRCLE', subtitle: 'Sample cards are labelled. Replace them with approved customer feedback before presenting them as real reviews.', items: [
    { name: 'Sample customer 01', rating: 5, title: 'An elegant first impression', text: 'Illustrative sample copy. Replace this with feedback approved by a real AFSANA customer.', product: 'Sample fragrance', sample: true },
    { name: 'Sample customer 02', rating: 5, title: 'A scent with character', text: 'Illustrative sample copy. Replace this with feedback approved by a real AFSANA customer.', product: 'Sample fragrance', sample: true },
    { name: 'Sample customer 03', rating: 5, title: 'Made for memorable moments', text: 'Illustrative sample copy. Replace this with feedback approved by a real AFSANA customer.', product: 'Sample fragrance', sample: true },
  ] } : {}),
  ...(type === 'post_grid' ? { columns: 4, items: 'Find your signature scent|A guide to choosing your next fragrance|https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=900&q=80|/journal\nThe world of oud|The mysterious world of oud|https://images.unsplash.com/photo-1616949755610-8c9bbc08f138?auto=format&fit=crop&w=900&q=80|/journal\nThe psychology of scent|Why fragrance becomes memory|https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=80|/journal\nThe Afsana ritual|Make your fragrance yours|https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80|/journal' } : {}),
  ...(type === 'promo_timer' || type === 'offer_timer' ? { endAt: '2026-11-05T23:59', label: 'PRIVATE COLLECTION OFFER', offerText: 'A special AFSANA offer ends soon.', buttonText: 'Shop the offer', buttonLink: '/shop' } : {}),
  ...(type === 'community_pulse' ? { eyebrow: 'THE AFSANA CIRCLE', subtitle: 'Use only verified brand numbers. Non-numeric values are treated as editorial labels.', disclaimer: 'Only publish verified numbers here.', items: 'Verified Reviews|0|Real customer feedback|/journal\nAfsana Circle|0|Community members|/account\nSignature Scents|0|Fragrances discovered|/shop\nGift Moments|0|Gifts created|/gifting' } : {}),
  ...(type === 'footer_showcase' ? { eyebrow: 'THE FINAL CHAPTER', body: 'Every scent leaves a trace. Make yours unforgettable.', offerLabel: 'PRIVATE ACCESS', offerText: 'Discover your signature scent.', buttonText: 'Explore Collection', buttonLink: '/shop' } : {}),
  ...(type === 'muse_scene' ? { eyebrow: 'THE AFSANA MUSE', characterImageUrl: '', body: 'A cinematic character-led chapter where fragrance, fashion and atmosphere meet.', buttonText: 'Meet the collection', buttonLink: '/shop' } : {}),
  ...(type === 'fragrance_dna' ? { eyebrow: 'FRAGRANCE DNA', body: 'Explore the personality behind every composition.', items: 'OUD|Deep & mysterious| |/shop\nAMBER|Warm & magnetic| |/shop\nROSE|Soft & luminous| |/shop\nMUSK|Clean & intimate| |/shop' } : {}),
  ...(type === 'product_3d_showcase' ? { eyebrow: 'THE AFSANA OBJECT', body: 'Explore the signature bottle in motion.', productSlug: '', imageUrl: '', buttonText: 'Explore fragrance', buttonLink: '/shop' } : {}),
  ...(type === 'interactive_gallery' ? { eyebrow: 'THE VISUAL JOURNEY', items: 'The Signature|Luminous opening|https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1000&q=85|/shop\nDark Woods|Deep oud atmosphere|https://images.unsplash.com/photo-1616949755610-8c9bbc08f138?auto=format&fit=crop&w=1000&q=85|/shop\nSoft Light|Floral world|https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1000&q=85|/shop' } : {}),
});
const parseItems = (text) => String(text || '').split('\n').map((x) => x.trim()).filter(Boolean).map((x) => {
  const [title = '', textValue = '', image = '', link = ''] = x.split('|');
  return { title: title.trim(), text: textValue.trim(), image: image.trim(), link: link.trim() };
});
const parseTestimonialItems = (text) => String(text || '').split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
  const [name = '', rating = '0', title = '', textValue = '', product = '', sample = ''] = line.split('|');
  return { name: name.trim(), rating: Number(rating) || 0, title: title.trim(), text: textValue.trim(), product: product.trim(), sample: /^(sample|demo|true|yes)$/i.test(sample.trim()) };
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

  const currentVideoItems = form.type === 'video_grid' ? parseItems(form.config.items) : [];
  const updateVideoItem = (index, key, value) => setForm((state) => {
    const items = parseItems(state.config.items);
    if (!items[index]) return state;
    items[index] = { ...items[index], [key]: value };
    return { ...state, config: { ...state.config, items: itemText(items) } };
  });
  const addVideoItem = () => setForm((state) => {
    const items = parseItems(state.config.items);
    if (items.length >= 4) return state;
    items.push({ title: `Campaign film 0${items.length + 1}`, text: '', image: '', link: '' });
    return { ...state, config: { ...state.config, items: itemText(items) } };
  });
  const removeVideoItem = (index) => setForm((state) => {
    const items = parseItems(state.config.items);
    items.splice(index, 1);
    return { ...state, config: { ...state.config, items: itemText(items) } };
  });

  const open = (item) => {
    if (item) {
      const cfg = { ...defaults(item.type), ...(item.config || {}) };
      if (item.type === 'testimonials') cfg.items = Array.isArray(cfg.items) ? cfg.items : parseTestimonialItems(cfg.items);
      else cfg.items = itemText(cfg.items);
      setForm({ type: item.type, title: item.title || '', config: cfg, isEnabled: item.isEnabled !== false });
    } else setForm({ type: 'hero', title: '', config: defaults('hero'), isEnabled: true });
    setDrawer({ open: true, item: item || null });
  };
  const close = () => setDrawer({ open: false, item: null });
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setNotice('');
    try {
      const cfg = { ...form.config };
      const itemTypes = ['benefits','testimonials','blog_grid','post_grid','category_tiles','marquee','trust_grid','values_grid','video_grid','community_pulse'];
      if (form.type === 'testimonials' && typeof cfg.items === 'string') cfg.items = parseTestimonialItems(cfg.items);
      else if (itemTypes.includes(form.type) && typeof cfg.items === 'string') cfg.items = parseItems(cfg.items);
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
        <div><p className="text-xs uppercase tracking-[.18em] text-[#263e0e] font-semibold">Visual homepage builder</p><h2 className="font-display text-2xl mt-1">Build the storefront like a canvas</h2><p className="text-sm text-[#5f654f] mt-1">Drag sections, set alignment, width, height, columns and spacing. Choose which page each section appears on, including a CMS-editable banner above the Collection page.</p></div>
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
        {form.type === 'testimonials'
          ? <div className="rounded-xl border border-[#b4bf41]/35 bg-[#f4f6eb] p-3 text-xs leading-5 text-[#5f654f]"><strong className="text-[#263e0e]">Shared review content</strong><p>Heading and review cards are managed centrally in CMS → Reviews Manager. Edit them there once to update every page placement.</p></div>
          : <Field label="Section title" hint="Optional — leave empty for the component's default heading"><Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Discover your signature scent" /></Field>}
        <Field label="Display on page" hint="Choose Collection page — top banner to place an editable campaign banner above the collection heading and category filters.">
          <Select value={form.config.templateSlot || 'home'} onChange={(e) => setConfig('templateSlot', e.target.value)}>
            <option value="home">Home page</option>
            <option value="collection-before">Collection page — top banner</option>
            <option value="collection-after">Collection page — below products</option>
            <option value="house">The House page</option>
            <option value="journal">Journal page</option>
            <option value="gifting">Gifting page</option>
            <option value="discover">Scent finder page</option>
            <option value="site-header-after">Below the main navigation</option>
            <option value="site-footer-before">Above the footer</option>
            <option value="site-footer">Footer</option>
          </Select>
        </Field>

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
        {['hero','image_banner','split_story','lookbook'].includes(form.type) && <><Field label="Image URL"><Input value={form.config.imageUrl || ''} onChange={(e) => setConfig('imageUrl', e.target.value)} placeholder="Paste an image URL or upload below" /><div className="mt-2 flex items-center gap-3">{form.config.imageUrl && <img src={form.config.imageUrl} alt="" className="h-16 w-24 rounded-lg object-cover border border-[#263e0e]/10" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />}<ImageUploadButton onUploaded={(url) => setConfig('imageUrl', url)} /></div></Field><Field label="Mobile image URL"><Input value={form.config.mobileImageUrl || ''} onChange={(e) => setConfig('mobileImageUrl', e.target.value)} placeholder="Optional mobile image" /><div className="mt-2"><ImageUploadButton label="Upload mobile image" onUploaded={(url) => setConfig('mobileImageUrl', url)} /></div></Field></>}
        {['video_banner','video_grid'].includes(form.type) && <><Field label="Video URL"><Input value={form.config.videoUrl || ''} onChange={(e) => setConfig('videoUrl', e.target.value)} placeholder="https://…/video.mp4" /></Field><Field label="Poster image URL"><Input value={form.config.posterUrl || ''} onChange={(e) => setConfig('posterUrl', e.target.value)} placeholder="Optional video poster image" /><div className="mt-2"><ImageUploadButton label="Upload poster image" onUploaded={(url) => setConfig('posterUrl', url)} /></div></Field><div className="grid grid-cols-3 gap-2"><Check label="Autoplay" checked={form.config.autoplay !== false} onChange={(v) => setConfig('autoplay', v)} /><Check label="Muted" checked={form.config.muted !== false} onChange={(v) => setConfig('muted', v)} /><Check label="Controls" checked={!!form.config.controls} onChange={(v) => setConfig('controls', v)} /></div></>}
        {['hero','video_banner','image_banner','split_story','promo_timer','offer_timer','muse_scene','product_3d_showcase','fragrance_dna','interactive_gallery','cinematic_statement'].includes(form.type) && <div className="grid grid-cols-2 gap-3"><Field label="Button text"><Input value={form.config.buttonText || ''} onChange={(e) => setConfig('buttonText', e.target.value)} /></Field><Field label="Button link"><Input value={form.config.buttonLink || ''} onChange={(e) => setConfig('buttonLink', e.target.value)} placeholder="/shop" /></Field></div>}
        {['featured_collection','best_sellers','new_arrivals','under_2000','gift_boxes','blog_grid'].includes(form.type) && <><Field label="Collection / query hint"><Input value={form.config.query || ''} onChange={(e) => setConfig('query', e.target.value)} placeholder="Optional category / collection / query" /></Field><Field label="Number of items"><Input type="number" min="1" max="12" value={form.config.limit ?? 4} onChange={(e) => setConfig('limit', Number(e.target.value))} /></Field></>}
        {form.type === 'testimonials' && <div className="rounded-xl border border-[#b4bf41]/35 bg-[#f4f6eb] p-4 text-sm leading-6 text-[#5f654f]">
          <strong className="text-[#263e0e]">Reviews are managed centrally.</strong>
          <p>Use CMS → Reviews Manager to add, edit or remove review cards. Your changes sync to every existing testimonials placement, including Home and product pages. This section editor is only for placement and layout.</p>
        </div>}
        {form.type === 'video_grid' ? <div className="space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 className="text-sm font-semibold text-[#263e0e]">Moving Image videos</h3><p className="text-xs text-[#5f654f]">Upload one MP4 or WebM for each card. Videos are uploaded in secure chunks and stored with AFSANA's existing database media; no R2 setup is required.</p></div>
            <span className="text-xs text-[#5f654f]">{currentVideoItems.length} / 4 cards</span>
          </div>
          {currentVideoItems.map((item, index) => <div key={index} className="space-y-3 rounded-2xl border border-[#263e0e]/10 bg-[#faf8f4] p-4">
            <div className="flex items-center justify-between gap-3"><strong className="text-sm text-[#263e0e]">Video {String(index + 1).padStart(2, '0')}</strong><button type="button" onClick={() => removeVideoItem(index)} className="text-xs font-medium text-[#9b3f3f] hover:underline">Remove card</button></div>
            <Field label="Card title"><Input value={item.title} onChange={(e) => updateVideoItem(index, 'title', e.target.value)} placeholder="e.g. Atmosphere" /></Field>
            <Field label="Card description"><Input value={item.text} onChange={(e) => updateVideoItem(index, 'text', e.target.value)} placeholder="A moving story from the house" /></Field>
            <Field label="Video file or direct URL">
              <Input value={item.image} onChange={(e) => updateVideoItem(index, 'image', e.target.value)} placeholder="Upload an MP4/WebM or paste a direct video URL" />
              <div className="mt-2"><VideoUploadButton label={item.image ? 'Replace video file' : 'Upload video file'} onUploaded={(url) => updateVideoItem(index, 'image', url)} /></div>
              {item.image && <video src={item.image} poster={item.link || undefined} controls muted playsInline preload="metadata" className="mt-3 aspect-video w-full max-w-sm rounded-xl bg-[#201632] object-cover" />}
            </Field>
            <Field label="Poster image URL">
              <Input value={item.link} onChange={(e) => updateVideoItem(index, 'link', e.target.value)} placeholder="Optional still image shown before the video loads" />
              <div className="mt-2"><ImageUploadButton label={item.link ? 'Replace poster image' : 'Upload poster image'} onUploaded={(url) => updateVideoItem(index, 'link', url)} /></div>
              {item.link && <img src={item.link} alt="" className="mt-2 h-20 w-32 rounded-lg border border-[#263e0e]/10 object-cover" />}
            </Field>
          </div>)}
          {currentVideoItems.length < 4 && <button type="button" onClick={addVideoItem} className="w-full rounded-xl border border-dashed border-[#263e0e]/25 bg-white px-4 py-3 text-sm font-medium text-[#263e0e] hover:bg-[#eef2e5]">+ Add video card</button>}
          <p className="text-xs leading-5 text-[#5f654f]">Supported formats: MP4 / WebM · Maximum file size: 250 MiB per video. Upload each card, then press Save section to publish all changes.</p>
        </div> : itemTypes.includes(form.type) && form.type !== 'testimonials' && <Field label="Items" hint="One per line: Title|Description|Image URL|Link."><Textarea rows={10} value={typeof form.config.items === 'string' ? form.config.items : ''} onChange={(e) => setConfig('items', e.target.value)} /></Field>}
        {['promo_timer','offer_timer'].includes(form.type) && <><Field label="Offer label"><Input value={form.config.label || ''} onChange={(e) => setConfig('label', e.target.value)} /></Field><Field label="Offer end (ISO/date-time)"><Input type="datetime-local" value={form.config.endAt || ''} onChange={(e) => setConfig('endAt', e.target.value)} /></Field><Field label="Offer text"><Textarea rows={3} value={form.config.offerText || ''} onChange={(e) => setConfig('offerText', e.target.value)} /></Field></>}
        {form.type === 'muse_scene' && <><Field label="Character image URL"><Input value={form.config.characterImageUrl || ''} onChange={(e) => setConfig('characterImageUrl', e.target.value)} placeholder="Upload/host an editorial character image" /></Field><p className="text-xs text-[#5f654f]">Best result: transparent PNG/WebP of the AFSANA Muse. The storefront adds cinematic glow and motion.</p></>}
        {form.type === 'product_3d_showcase' && <><Field label="Product slug (optional)"><Input value={form.config.productSlug || ''} onChange={(e) => setConfig('productSlug', e.target.value)} placeholder="e.g. signature-oud" /></Field><Field label="Fallback bottle image URL"><Input value={form.config.imageUrl || ''} onChange={(e) => setConfig('imageUrl', e.target.value)} /></Field><p className="text-xs text-[#5f654f]">The homepage theatre uses the product media already stored in Products. Add multiple product images in Admin → Products for the strongest 360° effect.</p></>}
        {form.type === 'community_pulse' && <><Field label="Subtitle"><Input value={form.config.subtitle || ''} onChange={(e) => setConfig('subtitle', e.target.value)} /></Field><Field label="Verified-number disclaimer"><Input value={form.config.disclaimer || ''} onChange={(e) => setConfig('disclaimer', e.target.value)} /></Field></>}
        {form.type === 'footer_showcase' && <><Field label="Body"><Textarea rows={4} value={form.config.body || ''} onChange={(e) => setConfig('body', e.target.value)} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Offer label"><Input value={form.config.offerLabel || ''} onChange={(e) => setConfig('offerLabel', e.target.value)} /></Field><Field label="Offer text"><Input value={form.config.offerText || ''} onChange={(e) => setConfig('offerText', e.target.value)} /></Field></div></>}
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
