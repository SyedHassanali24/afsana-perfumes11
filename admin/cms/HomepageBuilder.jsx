import { useMemo, useState } from 'react';
import MediaUploadButton from '../components/MediaUploadButton';
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

const PAGE_OPTIONS = [["home","Homepage"],["site_navigation","Header navigation"],["site_header_after","Global header — after navigation"],["collection_before","Collection — before products"],["collection_after","Collection — after products"],["product_before","Product — before details"],["product_after","Product — after details"],["house","The House page"],["journal","Journal page"],["gifting","Gifting page"],["cart_before","Cart — before cart"],["cart_after","Cart — after cart"],["checkout_before","Checkout — before form"],["checkout_after","Checkout — after form"],["track_before","Track order — before form"],["track_after","Track order — after form"],["site_footer_before","Global footer — before footer"],["site_footer","Complete site footer"]];
const PAGE_PREVIEW_PATHS = { home:'/', site_navigation:'/', site_header_after:'/', site_footer_before:'/', site_footer:'/', collection_before:'/shop', collection_after:'/shop', product_before:'/product/preview', product_after:'/product/preview', house:'/about', journal:'/journal', gifting:'/gifting', cart_before:'/cart', cart_after:'/cart', checkout_before:'/checkout', checkout_after:'/checkout', track_before:'/track', track_after:'/track' };

const defaults = (type) => ({
  eyebrow: '', subtitle: '', body: '', imageUrl: '', mobileImageUrl: '', videoUrl: '', posterUrl: '',
  buttonText: '', buttonLink: '', limit: 4, query: '', height: 'auto',
  width: 100, columns: 4, gap: 16, align: 'left', paddingTop: 80, paddingBottom: 80,
  autoplay: true, muted: true, controls: false, overlay: true, background: '', theme: 'neon',
  items: '',
  ...(type === 'video_grid' ? { columns: 4, items: 'Atmosphere|The first impression|https://videos.pexels.com/video-files/853801/853801-hd_1920_1080_30fps.mp4|https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=900&q=75\nIngredient|Dark woods|https://videos.pexels.com/video-files/853801/853801-hd_1920_1080_30fps.mp4|https://images.unsplash.com/photo-1616949755610-8c9bbc08f138?auto=format&fit=crop&w=900&q=75\nCraft|Made by hand|https://videos.pexels.com/video-files/853801/853801-hd_1920_1080_30fps.mp4|https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=900&q=75\nEmotion|Leave a trace|https://videos.pexels.com/video-files/853801/853801-hd_1920_1080_30fps.mp4|https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=75' } : {}),
  ...(type === 'post_grid' ? { columns: 4, items: 'Find your signature scent|A guide to choosing your next fragrance|https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=900&q=80|/journal\nThe world of oud|The mysterious world of oud|https://images.unsplash.com/photo-1616949755610-8c9bbc08f138?auto=format&fit=crop&w=900&q=80|/journal\nThe psychology of scent|Why fragrance becomes memory|https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=80|/journal\nThe Afsana ritual|Make your fragrance yours|https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80|/journal' } : {}),
  ...(type === 'promo_timer' || type === 'offer_timer' ? { endAt: '2026-11-05T23:59', label: 'PRIVATE COLLECTION OFFER', offerText: 'A special AFSANA offer ends soon.', buttonText: 'Shop the offer', buttonLink: '/shop' } : {}),
  ...(type === 'community_pulse' ? { eyebrow: 'THE AFSANA CIRCLE', subtitle: 'Use only verified brand numbers. Non-numeric values are treated as editorial labels.', disclaimer: 'Only publish verified numbers here.', items: 'Verified Reviews|0|Real customer feedback|/journal\nAfsana Circle|0|Community members|/account\nSignature Scents|0|Fragrances discovered|/shop\nGift Moments|0|Gifts created|/gifting' } : {}),
  ...(type === 'footer_showcase' ? { eyebrow: 'THE FINAL CHAPTER', body: 'Every scent leaves a trace. Make yours unforgettable.', offerLabel: 'PRIVATE ACCESS', offerText: 'Discover your signature scent.', buttonText: 'Explore Collection', buttonLink: '/shop' } : {}),
  ...(type === 'reference_assets' ? {
    heroBottleImageUrl:'', product3dModelUrl:'', product3dPosterUrl:'',
    filmAtmosphereVideoUrl:'', filmBotanicalVideoUrl:'', filmCraftVideoUrl:'', filmEmotionVideoUrl:'',
    worldDarkImageUrl:'', worldSoftImageUrl:'', worldBoldImageUrl:'',
    filmAtmosphereImageUrl:'', filmBotanicalImageUrl:'', filmCraftImageUrl:'', filmEmotionImageUrl:'',
    journalImage1Url:'', journalImage2Url:'', journalImage3Url:'',
    giftImage1Url:'', giftImage2Url:'', giftImage3Url:''
  } : {}),
  ...(type === 'custom_footer' ? { brandName:'AFSANA', tagline:'THE ART OF SCENT', description:'Fragrance is more than a note. It is a memory, a feeling, a signature.', email:'', phone:'', instagramUrl:'', facebookUrl:'', footerNote:'The Art of Scent. Crafted for memories.', items:'Collection|Explore the fragrances||/shop\nThe House|Our story||/about\nJournal|Stories and rituals||/journal\nGifting|Thoughtful gifts||/gifting' } : {}),
  ...(type === 'nav_menu' ? { items:'Home|/\nCollection|/shop\nThe House|/about\nJournal|/journal\nGifting|/gifting' } : {}),
  ...(type === 'whatsapp_float' ? { label: 'Chat with AFSANA', phone: '', message: 'Assalam-o-alaikum, I need help choosing an AFSANA fragrance.' } : {}),
  ...(type === 'ai_concierge' ? { label: 'Scent Concierge', subtitle: 'A guided fragrance discovery assistant.' } : {}),
  ...(type === 'muse_scene' ? { eyebrow: 'THE AFSANA MUSE', characterImageUrl: '', body: 'A cinematic character-led chapter where fragrance, fashion and atmosphere meet.', buttonText: 'Meet the collection', buttonLink: '/shop' } : {}),
  ...(type === 'fragrance_dna' ? { eyebrow: 'FRAGRANCE DNA', body: 'Explore the personality behind every composition.', items: 'OUD|Deep & mysterious| |/shop\nAMBER|Warm & magnetic| |/shop\nROSE|Soft & luminous| |/shop\nMUSK|Clean & intimate| |/shop' } : {}),
  ...(type === 'product_3d_showcase' ? { eyebrow: 'THE AFSANA OBJECT', body: 'Explore the signature bottle in motion.', productSlug: '', imageUrl: '', buttonText: 'Explore fragrance', buttonLink: '/shop' } : {}),
  ...(type === 'interactive_gallery' ? { eyebrow: 'THE VISUAL JOURNEY', items: 'The Signature|Luminous opening|https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1000&q=85|/shop\nDark Woods|Deep oud atmosphere|https://images.unsplash.com/photo-1616949755610-8c9bbc08f138?auto=format&fit=crop&w=1000&q=85|/shop\nSoft Light|Floral world|https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1000&q=85|/shop' } : {}),
});
const parseItems = (text) => String(text || '').split('\n').map((x) => x.trim()).filter(Boolean).map((x) => {
  const [title = '', textValue = '', image = '', link = ''] = x.split('|');
  return { title: title.trim(), text: textValue.trim(), image: image.trim(), link: link.trim() };
});
const itemText = (items) => Array.isArray(items) ? items.map((x) => [x.title || '', x.text || '', x.image || '', x.link || ''].filter((v, i) => i < 2 || v).join('|')).join('\n') : String(items || '');

const AFSANA_EXPERIENCE_SECTIONS = [
      { type:'reference_assets', title:'AFSANA image & 3D asset library', config:defaults('reference_assets') },
      { type:'hero', title:'SCENT IS YOUR ENERGY.', config:{ eyebrow:'A new dimension of fragrance', subtitle:'Not just a fragrance. A feeling that enters the room before you do. Explore a world of unexpected notes, bold presence and unforgettable rituals.', heroKicker:'A new dimension of fragrance', buttonText:'Explore the collection', buttonLink:'/shop', secondaryButtonText:'Find your scent', secondaryButtonLink:'/discover', layout:'reference' } },
      { type:'marquee', title:'Make an entrance. Leave a memory.', config:{ items:[{title:'MAKE AN ENTRANCE'},{title:'LEAVE A MEMORY'},{title:'BE YOUR OWN SIGNATURE'},{title:'SCENT IS A LANGUAGE'}] } },
      { type:'category_tiles', title:'Enter a scent world.', config:{ eyebrow:'CHOOSE YOUR ATMOSPHERE', subtitle:'Every fragrance has a universe. Find the one that feels like yours—from magnetic woods to luminous skin scents.', columns:3, items:[{title:'Dark & magnetic',text:'Warm woods. Smoked amber. Quiet confidence.',image:'',link:'/shop?category=signature'},{title:'Soft & luminous',text:'Airy florals. Clean skin. Open windows.',image:'',link:'/shop?category=fresh'},{title:'Bright & bold',text:'Citrus sparks. Electric energy. No apologies.',image:'',link:'/shop?category=bold'}] } },
      { type:'best_sellers', title:'Objects of desire.', config:{ eyebrow:'THE AFSANA SELECTION', subtitle:'Discover the fragrances that define the house.', limit:4, query:'sort:popular', columns:4 } },
      { type:'product_3d_showcase', title:'Meet your scent in 3D.', config:{ eyebrow:'BEYOND THE BOTTLE', body:'Turn it. Tilt it. Get closer. Explore the AFSANA object from every angle with an interactive product experience made for curious minds.', buttonText:'Enter the 3D studio', buttonLink:'/shop' } },
      { type:'offer_timer', title:'Good taste. Even better delivery.', config:{ label:'A LITTLE EXTRA FROM THE HOUSE', offerText:'Complimentary delivery on orders above PKR 7,500. Your next favourite arrives wrapped in the AFSANA experience.', buttonText:'Explore the private edit', buttonLink:'/shop', hideTimer:true } },
      { type:'scent_finder', title:'Your mood has a fragrance. Let’s find it.', config:{ eyebrow:'A LITTLE SCIENCE. A LOT OF INSTINCT.' } },
      { type:'video_grid', title:'Feel the fragrance.', config:{ ...defaults('video_grid'), eyebrow:'THE AFSANA MOVING IMAGE', items:parseItems(defaults('video_grid').items), limit:4, columns:4 } },
      { type:'blog_grid', title:'The scent journal.', config:{ eyebrow:'NOTES FROM THE HOUSE', items:parseItems(defaults('post_grid').items).slice(0,3), columns:3, limit:3 } },
      { type:'newsletter', title:'Good things linger.', config:{ eyebrow:'THE PRIVATE LIST', body:'Be first to discover new drops, private offers, scent rituals and stories from the AFSANA universe.' } },
];

export default function HomepageBuilder() {
  const { can } = useAuth();
  const api = useMemo(() => cmsApi('homepage'), []);
  const { data, loading, error, reload } = useApi(() => api.list(), []);
  const rows = data?.items || [];
  const [dragId, setDragId] = useState(null);
  const [drawer, setDrawer] = useState({ open: false, item: null });
  const [pageKey, setPageKey] = useState('home');
  const [insertAfter, setInsertAfter] = useState(null);
  const [form, setForm] = useState({ type: 'hero', title: '', config: defaults('hero'), isEnabled: true });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [del, setDel] = useState(null);
  const previewExperienceLayout = () => {
    try {
      const layouts = {
        home: AFSANA_EXPERIENCE_SECTIONS.map((section, index) => ({ ...section, id:`preview-home-${index}`, pageKey:'home', sortOrder:index, isEnabled:true, config:{ ...section.config, theme:'neon', templateId:'afsana-neon-experience-v1' } })),
        site_navigation: [{ id:'preview-navigation', type:'nav_menu', title:'AFSANA navigation', pageKey:'site_navigation', sortOrder:0, isEnabled:true, config:{ items:parseItems(defaults('nav_menu').items), theme:'neon' } }],
        site_footer: [{ id:'preview-footer', type:'custom_footer', title:'AFSANA custom footer', pageKey:'site_footer', sortOrder:0, isEnabled:true, config:{ ...defaults('custom_footer'), items:parseItems(defaults('custom_footer').items), theme:'neon' } }],
        site_footer_before: [{ id:'preview-ai', type:'ai_concierge', title:'Scent Concierge', pageKey:'site_footer_before', sortOrder:0, isEnabled:true, config:{ ...defaults('ai_concierge'), theme:'neon' } }]
      };
      localStorage.setItem('afsana_cms_preview_v2', JSON.stringify({ pageKey:'home', sections:layouts.home, layouts }));
      window.open('/?afsanaPreview=1&afsanaPageKey=home', '_blank', 'noopener,noreferrer');
    } catch { setNotice('The AFSANA preview could not be opened in this browser.'); }
  };

  const addExperienceLayout = async () => {
    const templateId = 'afsana-neon-experience-v1';
    const templateRows = rows.filter((item) => item.config?.templateId === templateId);
    const existingSlots = new Set(templateRows.map((item) => item.config?.templateSlot).filter(Boolean));
    const expectedSlots = [...AFSANA_EXPERIENCE_SECTIONS.map((_, index) => `home-${index}`), 'site-footer', 'site-footer-before-ai', 'site-footer-before-whatsapp'];
    if (expectedSlots.every((slot) => existingSlots.has(slot))) {
      setNotice('The AFSANA experience layout is already installed. Edit, hide, reorder or remove its sections below.');
      return;
    }
    setBusy(true); setNotice('');
    const starter = AFSANA_EXPERIENCE_SECTIONS;
    try {
      const existingHome = rows.filter((item) => (item.pageKey || 'home') === 'home' && item.config?.templateId !== templateId).sort((a,b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      for (let index = 0; index < starter.length; index += 1) {
        const section = starter[index], slot = `home-${index}`;
        const existing = templateRows.find((item) => item.config?.templateSlot === slot);
        if (existing) { await api.update(existing.id, { sortOrder:index }); continue; }
        const config = { ...section.config, theme:'neon', templateId, templateSlot:slot };
        await api.create({ type:section.type, title:section.title, pageKey:'home', config, sortOrder:index, isEnabled:true });
        existingSlots.add(slot);
      }
      await Promise.all(existingHome.map((item, index) => api.update(item.id, { sortOrder: starter.length + index })));
      const globalSections = [
        { slot:'site-footer', type:'custom_footer', title:'AFSANA custom footer', pageKey:'site_footer', config:defaults('custom_footer'), sortOrder:0, isEnabled:true },
        { slot:'site-footer-before-ai', type:'ai_concierge', title:'Scent Concierge', pageKey:'site_footer_before', config:defaults('ai_concierge'), sortOrder:0, isEnabled:true },
        { slot:'site-footer-before-whatsapp', type:'whatsapp_float', title:'WhatsApp contact', pageKey:'site_footer_before', config:defaults('whatsapp_float'), sortOrder:1, isEnabled:false }
      ];
      for (const item of globalSections) {
        if (existingSlots.has(item.slot)) continue;
        const config = { ...item.config, theme:'neon', templateId, templateSlot:item.slot };
        await api.create({ type:item.type, title:item.title, pageKey:item.pageKey, config, sortOrder:item.sortOrder, isEnabled:item.isEnabled });
        existingSlots.add(item.slot);
      }
      setPageKey('home'); setNotice('AFSANA experience layout added before your existing sections. Everything is editable; WhatsApp stays off until you enter its number.'); reload();
    } catch (e) { setNotice(e.message || 'Some layout sections may have saved. Run Add AFSANA experience layout again to safely complete any missing items.'); reload(); }
    finally { setBusy(false); }
  };

  const preview = () => { try { localStorage.setItem('afsana_cms_preview_v2', JSON.stringify({ pageKey, sections: sorted })); const target = PAGE_PREVIEW_PATHS[pageKey] || '/'; window.open(`${target}?afsanaPreview=1&afsanaPageKey=${encodeURIComponent(pageKey)}`, '_blank', 'noopener,noreferrer'); } catch { setNotice('Preview could not be opened in this browser.'); } };
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const setConfig = (k, v) => setForm((s) => ({ ...s, config: { ...s.config, [k]: v } }));
  const open = (item, afterItem = null) => {
    setInsertAfter(afterItem);
    if (item) {
      setPageKey(item.pageKey || 'home');
      const cfg = { ...defaults(item.type), ...(item.config || {}) };
      cfg.items = itemText(cfg.items);
      setForm({ type: item.type, title: item.title || '', pageKey: item.pageKey || 'home', config: cfg, isEnabled: item.isEnabled !== false });
    } else {
      const initialType = pageKey === 'site_navigation' ? 'nav_menu' : pageKey === 'site_footer' ? 'custom_footer' : 'hero';
      setForm({ type: initialType, title: '', pageKey, config: defaults(initialType), isEnabled: true });
    }
    setDrawer({ open: true, item: item || null });
  };
  const close = () => { setDrawer({ open: false, item: null }); setInsertAfter(null); };
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setNotice('');
    try {
      const cfg = { ...form.config };
      const itemTypes = ['benefits','testimonials','blog_grid','post_grid','category_tiles','marquee','trust_grid','values_grid','video_grid','community_pulse','nav_menu','custom_footer'];
      if (itemTypes.includes(form.type) && typeof cfg.items === 'string') cfg.items = parseItems(cfg.items);
      const targetPage = form.pageKey || 'home';
      const payload = { type: form.type, title: form.title.trim(), pageKey: targetPage, config: cfg, sortOrder: drawer.item?.sortOrder ?? sorted.length, isEnabled: !!form.isEnabled };
      if (drawer.item) {
        if ((drawer.item.pageKey || 'home') !== targetPage) {
          const destinationCount = rows.filter((x) => (x.pageKey || 'home') === targetPage && x.id !== drawer.item.id).length;
          payload.sortOrder = destinationCount;
        }
        await api.update(drawer.item.id, payload);
      } else {
        const insertIndex = insertAfter ? Math.max(0, sorted.findIndex((x) => x.id === insertAfter.id) + 1) : sorted.length;
        await api.create({ ...payload, sortOrder: insertIndex });
        await Promise.all(sorted.map((item, i) => api.update(item.id, { sortOrder: i < insertIndex ? i : i + 1 })));
      }
      setPageKey(targetPage); close(); setNotice('Section saved in the selected page layout.'); reload();
    } catch (e2) { setNotice(e2.message || 'Could not save section.'); } finally { setBusy(false); }
  };
  const reorder = async (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const next = [...sorted];
    const from = next.findIndex((x) => x.id === sourceId), to = next.findIndex((x) => x.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = next.splice(from, 1); next.splice(to, 0, moved);
    try { await Promise.all(next.map((item, i) => api.update(item.id, { sortOrder: i }))); setNotice('Section order saved.'); reload(); }
    catch (e) { setNotice(e.message || 'Could not reorder sections.'); }
  };
  const pageRows = rows.filter((item) => (item.pageKey || 'home') === pageKey);
  const sorted = [...pageRows].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const experienceSlots = new Set(rows.filter((item) => item.config?.templateId === 'afsana-neon-experience-v1').map((item) => item.config?.templateSlot));
  const hasExperienceTemplate = [...AFSANA_EXPERIENCE_SECTIONS.map((_, index) => `home-${index}`), 'site-footer', 'site-footer-before-ai', 'site-footer-before-whatsapp'].every((slot) => experienceSlots.has(slot));
  const moveBy = async (id, delta) => {
    const next = [...sorted], from = next.findIndex((x) => x.id === id), to = from + delta;
    if (from < 0 || to < 0 || to >= next.length) return;
    const [moved] = next.splice(from, 1); next.splice(to, 0, moved);
    try { await Promise.all(next.map((item, i) => api.update(item.id, { sortOrder: i }))); setNotice('Section order saved.'); reload(); }
    catch (e) { setNotice(e.message || 'Could not reorder sections.'); }
  };
  const duplicate = async (item) => {
    setBusy(true); setNotice('');
    try {
      const insertIndex = Math.max(0, sorted.findIndex((x) => x.id === item.id) + 1);
      await api.create({ type: item.type, title: item.title || '', pageKey: item.pageKey || pageKey, config: item.config || {}, sortOrder: insertIndex, isEnabled: false });
      await Promise.all(sorted.map((row, i) => api.update(row.id, { sortOrder: i < insertIndex ? i : i + 1 })));
      setNotice('Section duplicated just below the original as hidden. Review it, then publish it.'); reload();
    } catch (e) { setNotice(e.message || 'Could not duplicate section.'); } finally { setBusy(false); }
  };

  const common = ['hero','video_banner','image_banner','split_story','rich_text','cinematic_statement','lookbook'].includes(form.type);
  const formPageTypes = form.pageKey === 'site_navigation' ? HOMEPAGE_SECTION_TYPES.filter((x) => x.key === 'nav_menu') : form.pageKey === 'site_footer' ? HOMEPAGE_SECTION_TYPES.filter((x) => x.key === 'custom_footer') : HOMEPAGE_SECTION_TYPES.filter((x) => !['nav_menu','custom_footer'].includes(x.key));
  const itemTypes = ['benefits','testimonials','blog_grid','post_grid','category_tiles','marquee','trust_grid','values_grid','video_grid','nav_menu','custom_footer'];
  return <div className="space-y-5">
    <div className="rounded-2xl border border-[#b4bf41]/35 bg-[#eef2e5] p-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div><p className="text-xs uppercase tracking-[.18em] text-[#263e0e] font-semibold">Universal website builder</p><h2 className="font-display text-2xl mt-1">Every page. One visual canvas.</h2><p className="text-sm text-[#5f654f] mt-1">Choose a page or insertion point, then add, hide, duplicate, delete and reorder sections without changing products, orders or checkout.</p></div>
        <div className="flex flex-wrap items-center gap-2"><Select aria-label="Website page" value={pageKey} onChange={(e) => setPageKey(e.target.value)}>{PAGE_OPTIONS.map(([key,label]) => <option key={key} value={key}>{label}</option>)}</Select>{can('homepage.edit') && pageKey === 'home' && <Button variant="secondary" onClick={previewExperienceLayout}>Preview AFSANA layout</Button>}{can('homepage.create') && pageKey === 'home' && <Button variant="secondary" disabled={busy || hasExperienceTemplate} onClick={addExperienceLayout}>{hasExperienceTemplate ? 'Experience layout added' : 'Add AFSANA experience layout'}</Button>}{can('homepage.edit') && <Button variant="secondary" onClick={preview}>Preview this page</Button>}{can('homepage.create') && <Button icon={Plus} onClick={() => open(null)}>Add section</Button>}</div>
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
            {can('homepage.create') && <button type="button" onClick={() => open(null, item)} className="p-2 rounded-xl text-[#748e40] hover:bg-[#eef2e5]" title="Insert a new section after this one"><Plus className="w-4 h-4" /></button>}
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
      {!sorted.length && <Card><div className="py-10 text-center"><Sparkles className="w-8 h-8 mx-auto text-[#748e40]" /><p className="font-medium mt-3">No sections on this page yet</p><p className="text-sm text-[#5f654f] mt-1">Add a hero, product row, story, video grid, post grid, 3D theatre, offer timer or any other section.</p></div></Card>}
    </div>}
    <Drawer open={drawer.open} onClose={close} title={drawer.item ? 'Edit homepage section' : 'Add homepage section'} footer={<><Button variant="secondary" type="button" onClick={close}>Cancel</Button><Button type="submit" form="homepage-section-form" disabled={busy}>{busy ? 'Saving…' : 'Save section'}</Button></>}>
      <form id="homepage-section-form" onSubmit={save} className="space-y-4">
        <Field label="Place this section on"><Select disabled={form.type === 'nav_menu' || form.type === 'custom_footer'} value={form.pageKey || pageKey} onChange={(e) => set('pageKey', e.target.value)}>{PAGE_OPTIONS.map(([key,label]) => <option key={key} value={key}>{label}</option>)}</Select></Field>
        <Field label="Section type"><Select value={form.type} disabled={!!drawer.item} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value, config: defaults(e.target.value) }))}>{formPageTypes.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</Select></Field>
        <Field label="Section title" hint="Optional — leave empty for the component's default heading"><Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Discover your signature scent" /></Field>

        <div className="rounded-2xl border border-[#263e0e]/10 bg-[#f3f1e9] p-4 space-y-3">
          <Field label="Visual palette"><Select value={form.config.theme || 'neon'} onChange={(e) => setConfig('theme', e.target.value)}><option value="neon">Electric violet + acid lime</option><option value="classic">AFSANA forest + olive</option></Select></Field>
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
        {['hero','video_banner','image_banner','split_story','promo_timer','offer_timer','muse_scene','product_3d_showcase','fragrance_dna','interactive_gallery','cinematic_statement'].includes(form.type) && <div className="grid grid-cols-2 gap-3"><Field label="Button text"><Input value={form.config.buttonText || ''} onChange={(e) => setConfig('buttonText', e.target.value)} /></Field><Field label="Button link"><Input value={form.config.buttonLink || ''} onChange={(e) => setConfig('buttonLink', e.target.value)} placeholder="/shop" /></Field></div>}
        {['featured_collection','best_sellers','new_arrivals','under_2000','gift_boxes','blog_grid'].includes(form.type) && <><Field label="Collection / query hint"><Input value={form.config.query || ''} onChange={(e) => setConfig('query', e.target.value)} placeholder="Optional category / collection / query" /></Field><Field label="Number of items"><Input type="number" min="1" max="12" value={form.config.limit ?? 4} onChange={(e) => setConfig('limit', Number(e.target.value))} /></Field></>}
        {itemTypes.includes(form.type) && <Field label="Items" hint="One per line: Title|Description|Image URL|Link. Video grid uses Title|Description|Video URL|Poster URL."><Textarea rows={10} value={typeof form.config.items === 'string' ? form.config.items : ''} onChange={(e) => setConfig('items', e.target.value)} /></Field>}
        {['promo_timer','offer_timer'].includes(form.type) && <><Field label="Offer label"><Input value={form.config.label || ''} onChange={(e) => setConfig('label', e.target.value)} /></Field><Field label="Offer end (ISO/date-time)"><Input type="datetime-local" value={form.config.endAt || ''} onChange={(e) => setConfig('endAt', e.target.value)} /></Field><Field label="Offer text"><Textarea rows={3} value={form.config.offerText || ''} onChange={(e) => setConfig('offerText', e.target.value)} /></Field></>}
        {form.type === 'muse_scene' && <><Field label="Character image URL"><Input value={form.config.characterImageUrl || ''} onChange={(e) => setConfig('characterImageUrl', e.target.value)} placeholder="Upload/host an editorial character image" /></Field><p className="text-xs text-[#5f654f]">Best result: transparent PNG/WebP of the AFSANA Muse. The storefront adds cinematic glow and motion.</p></>}
        {form.type === 'product_3d_showcase' && <><Field label="Product slug (optional)"><Input value={form.config.productSlug || ''} onChange={(e) => setConfig('productSlug', e.target.value)} placeholder="e.g. signature-oud" /></Field><Field label="Fallback bottle image URL"><Input value={form.config.imageUrl || ''} onChange={(e) => setConfig('imageUrl', e.target.value)} /></Field><p className="text-xs text-[#5f654f]">The homepage theatre uses the product media already stored in Products. Add multiple product images in Admin → Products for the strongest 360° effect.</p></>}
        {form.type === 'community_pulse' && <><Field label="Subtitle"><Input value={form.config.subtitle || ''} onChange={(e) => setConfig('subtitle', e.target.value)} /></Field><Field label="Verified-number disclaimer"><Input value={form.config.disclaimer || ''} onChange={(e) => setConfig('disclaimer', e.target.value)} /></Field></>}
        {form.type === 'footer_showcase' && <><Field label="Body"><Textarea rows={4} value={form.config.body || ''} onChange={(e) => setConfig('body', e.target.value)} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Offer label"><Input value={form.config.offerLabel || ''} onChange={(e) => setConfig('offerLabel', e.target.value)} /></Field><Field label="Offer text"><Input value={form.config.offerText || ''} onChange={(e) => setConfig('offerText', e.target.value)} /></Field></div></>}
        {form.type === 'reference_assets' && <div className="space-y-5">
          <p className="text-xs leading-5 text-[#5f654f]">Upload your real AFSANA bottle image, GLB 3D model and campaign photos. Leave a field blank to keep its existing visual fallback. Images are optimized before upload; GLB assets can be up to 4 MB.</p>
          <Field label="Hero perfume bottle image"><Input value={form.config.heroBottleImageUrl || ''} onChange={(e) => setConfig('heroBottleImageUrl', e.target.value)} placeholder="Uploaded media URL" /><MediaUploadButton accept="image/jpeg,image/png,image/webp" label="Upload hero bottle photo" onUploaded={(url) => setConfig('heroBottleImageUrl', url)} /></Field>
          <Field label="Interactive 3D perfume model (.glb)"><Input value={form.config.product3dModelUrl || ''} onChange={(e) => setConfig('product3dModelUrl', e.target.value)} placeholder="Uploaded .glb URL" /><MediaUploadButton accept=".glb,model/gltf-binary" label="Upload 3D GLB model" onUploaded={(url) => setConfig('product3dModelUrl', url)} /></Field>
          <Field label="3D model poster / fallback image"><Input value={form.config.product3dPosterUrl || ''} onChange={(e) => setConfig('product3dPosterUrl', e.target.value)} /><MediaUploadButton accept="image/jpeg,image/png,image/webp" label="Upload 3D poster" onUploaded={(url) => setConfig('product3dPosterUrl', url)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['worldDarkImageUrl','Dark & magnetic world'],['worldSoftImageUrl','Soft & luminous world'],['worldBoldImageUrl','Bright & bold world'],
              ['filmAtmosphereImageUrl','Film 01 — Atmosphere'],['filmBotanicalImageUrl','Film 02 — Botanical'],['filmCraftImageUrl','Film 03 — Craft'],['filmEmotionImageUrl','Film 04 — Emotion'],
              ['journalImage1Url','Journal image 01'],['journalImage2Url','Journal image 02'],['journalImage3Url','Journal image 03'],
              ['giftImage1Url','Gifting image 01'],['giftImage2Url','Gifting image 02'],['giftImage3Url','Gifting image 03']
            ].map(([key,label]) => <Field key={key} label={label}><Input value={form.config[key] || ''} onChange={(e) => setConfig(key, e.target.value)} placeholder="Uploaded media URL" /><MediaUploadButton accept="image/jpeg,image/png,image/webp" label="Upload image" onUploaded={(url) => setConfig(key, url)} /></Field>)}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              ['filmAtmosphereVideoUrl','Film 01 — Atmosphere video'],['filmBotanicalVideoUrl','Film 02 — Botanical video'],
              ['filmCraftVideoUrl','Film 03 — Craft video'],['filmEmotionVideoUrl','Film 04 — Emotion video']
            ].map(([key,label]) => <Field key={key} label={label}><Input value={form.config[key] || ''} onChange={(e) => setConfig(key, e.target.value)} placeholder="Uploaded MP4/WebM URL" /><MediaUploadButton accept="video/mp4,video/webm" label="Upload campaign video" onUploaded={(url) => setConfig(key, url)} /></Field>)}
          </div>
        </div>}
        {form.type === 'custom_footer' && <><Field label="Brand name"><Input value={form.config.brandName || 'AFSANA'} onChange={(e) => setConfig('brandName', e.target.value)} /></Field><Field label="Tagline"><Input value={form.config.tagline || ''} onChange={(e) => setConfig('tagline', e.target.value)} /></Field><Field label="Footer description"><Textarea rows={3} value={form.config.description || ''} onChange={(e) => setConfig('description', e.target.value)} /></Field><Field label="Footer links" hint="One per line: Label|Description||/internal-route"><Textarea rows={7} value={typeof form.config.items === 'string' ? form.config.items : itemText(form.config.items)} onChange={(e) => setConfig('items', e.target.value)} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Contact email"><Input value={form.config.email || ''} onChange={(e) => setConfig('email', e.target.value)} /></Field><Field label="Contact phone"><Input value={form.config.phone || ''} onChange={(e) => setConfig('phone', e.target.value)} /></Field><Field label="Instagram URL"><Input value={form.config.instagramUrl || ''} onChange={(e) => setConfig('instagramUrl', e.target.value)} /></Field><Field label="Facebook URL"><Input value={form.config.facebookUrl || ''} onChange={(e) => setConfig('facebookUrl', e.target.value)} /></Field></div><Field label="Bottom copyright / note"><Input value={form.config.footerNote || ''} onChange={(e) => setConfig('footerNote', e.target.value)} /></Field></>}
        {form.type === 'nav_menu' && <><Field label="Navigation links" hint="One per line: Label|/internal-route. Example: Journal|/journal"><Textarea rows={8} value={typeof form.config.items === 'string' ? form.config.items : itemText(form.config.items)} onChange={(e) => setConfig('items', e.target.value)} /></Field><p className="text-xs text-[#5f654f]">The order here becomes the desktop and mobile navigation order. Use routes such as /shop, /about and /journal.</p></>}
        {form.type === 'whatsapp_float' && <><Field label="WhatsApp phone (international digits)"><Input value={form.config.phone || ''} onChange={(e) => setConfig('phone', e.target.value)} placeholder="923001234567" /></Field><Field label="Button label"><Input value={form.config.label || ''} onChange={(e) => setConfig('label', e.target.value)} /></Field><Field label="First message"><Textarea rows={3} value={form.config.message || ''} onChange={(e) => setConfig('message', e.target.value)} /></Field><p className="text-xs text-[#5f654f]">This becomes a floating WhatsApp button on every page when placed in the global footer area.</p></>}
        {form.type === 'ai_concierge' && <><Field label="Assistant label"><Input value={form.config.label || ''} onChange={(e) => setConfig('label', e.target.value)} /></Field><Field label="Description"><Input value={form.config.subtitle || ''} onChange={(e) => setConfig('subtitle', e.target.value)} /></Field><p className="text-xs text-[#5f654f]">This opens the guided scent discovery experience. It is a front-end guided assistant, not a connected LLM service yet.</p></>}
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
