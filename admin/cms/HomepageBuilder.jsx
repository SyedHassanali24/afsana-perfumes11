import { useMemo, useState } from 'react';
import { GripVertical, Pencil, Plus, Power, Trash2, Video, Image as ImageIcon, Sparkles, ArrowUp, ArrowDown, Copy, LayoutGrid, AlignLeft, AlignCenter, AlignRight, Search, Home, ShoppingBag, Compass, BookOpen, Building2, Gift, Mail, Globe2, Layers, ShoppingCart, CreditCard, Truck } from 'lucide-react';
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
  ...(type === 'footer_showcase' ? { templateSlot: 'site-footer', eyebrow: 'THE FINAL CHAPTER', body: 'Every scent leaves a trace. Make yours unforgettable.', offerLabel: 'PRIVATE ACCESS', offerText: 'Discover your signature scent.', buttonText: 'Explore Collection', buttonLink: '/shop' } : {}),
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
const itemText = (items) => Array.isArray(items) ? items.map((x) => [x.title || '', x.text || '', x.image || '', x.link || ''].join('|')).join('\n') : String(items || '');

const CMS_PAGE_GROUPS = [
  { key: 'all', label: 'All pages', description: 'Find any section across the whole website.', icon: Layers, defaultSlot: 'home' },
  { key: 'home', label: 'Home', path: '/', description: 'The homepage experience, campaigns and featured stories.', icon: Home, defaultSlot: 'home', preview: true },
  { key: 'collection', label: 'Collection', path: '/shop', description: 'Collection page sections, above and below the product listing.', icon: ShoppingBag, defaultSlot: 'collection-before', preview: true },
  { key: 'discover', label: 'Scent finder', path: '/discover', description: 'The scent-finder page and its supporting content.', icon: Compass, defaultSlot: 'discover', preview: true },
  { key: 'journal', label: 'Journal', path: '/journal', description: 'Featured story, article cards and journal page content.', icon: BookOpen, defaultSlot: 'journal', preview: true },
  { key: 'house', label: 'The house', path: '/about', description: 'The House story, brand values and editorial sections.', icon: Building2, defaultSlot: 'house', preview: true },
  { key: 'gifting', label: 'Gifting', path: '/gifting', description: 'Gift collections, guidance and gifting stories.', icon: Gift, defaultSlot: 'gifting', preview: true },
  { key: 'contact', label: 'Contact', path: '/contact', description: 'Content placed before and after the contact form.', icon: Mail, defaultSlot: 'contact-before', preview: true },
  { key: 'product', label: 'Product details', description: 'Shared sections above and below every product detail page.', icon: ShoppingBag, defaultSlot: 'product-before' },
  { key: 'cart', label: 'Cart', path: '/cart', description: 'Content around the shopping cart page.', icon: ShoppingCart, defaultSlot: 'cart-before', preview: true },
  { key: 'checkout', label: 'Checkout', path: '/checkout', description: 'Content around the secure checkout page.', icon: CreditCard, defaultSlot: 'checkout-before', preview: true },
  { key: 'track', label: 'Track order', path: '/track', description: 'Content around the order tracking page.', icon: Truck, defaultSlot: 'track-before', preview: true },
  { key: 'shared', label: 'Site-wide', description: 'Shared navigation, header and footer content.', icon: Globe2, defaultSlot: 'site-header-after' },
];

const sectionSlot = (item) => {
  const type = String(item?.type || '');
  if (type === 'footer_showcase' || type === 'custom_footer') return 'site-footer';
  if (type === 'nav_menu') return 'site-navigation';
  if (type === 'whatsapp_float' || type === 'ai_concierge') return 'site-footer-before';
  return String(item?.config?.templateSlot || 'home').trim().toLowerCase() || 'home';
};
const sectionPageGroup = (item) => {
  const slot = sectionSlot(item);
  if (slot === 'site-navigation' || slot === 'site-header-after' || slot.startsWith('site-header-after-') || slot === 'site-footer-before' || slot.startsWith('site-footer-before-') || slot === 'site-footer') return 'shared';
  if (slot === 'collection-before' || slot.startsWith('collection-before-') || slot === 'collection-after' || slot.startsWith('collection-after-')) return 'collection';
  if (slot === 'contact-before' || slot.startsWith('contact-before-') || slot === 'contact-after' || slot.startsWith('contact-after-')) return 'contact';
  for (const page of ['product','cart','checkout','track']) if (slot.startsWith(page + '-before') || slot.startsWith(page + '-after')) return page;
  if (slot === 'discover' || slot.startsWith('discover-')) return 'discover';
  if (slot === 'journal' || slot.startsWith('journal-')) return 'journal';
  if (slot === 'house' || slot.startsWith('house-')) return 'house';
  if (slot === 'gifting' || slot.startsWith('gifting-')) return 'gifting';
  return 'home';
};
const sectionSlotLabel = (item) => {
  const slot = sectionSlot(item);
  const labels = {
    home: 'Home page', discover: 'Scent finder page', journal: 'Journal page', house: 'The House page', gifting: 'Gifting page',
    'collection-before': 'Collection · Above products', 'collection-after': 'Collection · Below products',
    'contact-before': 'Contact · Above form', 'contact-after': 'Contact · Below form',
    'product-before': 'Product · Above details', 'product-after': 'Product · Below details',
    'cart-before': 'Cart · Above cart', 'cart-after': 'Cart · Below cart',
    'checkout-before': 'Checkout · Above form', 'checkout-after': 'Checkout · Below form',
    'track-before': 'Order tracking · Above form', 'track-after': 'Order tracking · Below form',
    'site-navigation': 'Shared · Navigation', 'site-header-after': 'Shared · Below navigation',
    'site-footer-before': 'Shared · Above footer', 'site-footer': 'Shared · Footer',
  };
  return labels[slot] || slot.replaceAll('-', ' ');
};
const sectionPreviewImage = (item) => {
  const config = item?.config || {};
  const entries = Array.isArray(config.items) ? config.items : parseItems(config.items);
  const candidates = [
    config.imageUrl, config.desktopImageUrl, config.mobileImageUrl, config.posterUrl,
    config.characterImageUrl, config.thumbnailUrl, config.journalImage1Url,
    config.journalImage2Url, config.journalImage3Url,
    ...entries.map((entry) => entry?.image || entry?.imageUrl || entry?.posterUrl || ''),
  ];
  return candidates.find((value) => {
    if (typeof value !== 'string' || !value.trim()) return false;
    const clean = value.trim().split(/[?#]/, 1)[0].toLowerCase();
    return !/\.(mp4|webm|mov|m4v|glb|gltf)$/.test(clean) && (/^(https?:\/\/|\/|data:image\/)/i.test(value.trim()));
  }) || '';
};
const sectionTypeKind = (type = '') => {
  if (String(type).includes('video')) return 'video';
  if (['blog_grid','post_grid'].includes(type)) return 'stories';
  if (['featured_collection','best_sellers','new_arrivals','under_2000','gift_boxes','product_3d_showcase'].includes(type)) return 'products';
  if (['image_banner','split_story','lookbook','interactive_gallery','muse_scene'].includes(type)) return 'visual';
  if (['rich_text','faq','newsletter','testimonials','community_pulse'].includes(type)) return 'content';
  return 'layout';
};
const sectionSearchText = (item) => {
  const config = item?.config || {};
  const meta = HOMEPAGE_SECTION_TYPES.find((entry) => entry.key === item?.type);
  const values = [item?.title, item?.type, meta?.label, sectionSlotLabel(item), config.eyebrow, config.subtitle, config.body, config.buttonText, config.buttonLink];
  const entries = Array.isArray(config.items) ? config.items : parseItems(config.items);
  entries.forEach((entry) => values.push(entry?.title, entry?.text, entry?.name, entry?.product, entry?.link));
  return values.filter(Boolean).join(' ').toLowerCase();
};
const previewLayoutKey = (item) => {
  const slot = sectionSlot(item);
  if (slot.startsWith('collection-before')) return 'collection_before';
  if (slot.startsWith('collection-after')) return 'collection_after';
  if (slot.startsWith('contact-before')) return 'contact_before';
  if (slot.startsWith('contact-after')) return 'contact_after';
  for (const page of ['product','cart','checkout','track']) {
    if (slot.startsWith(page + '-before')) return page + '_before';
    if (slot.startsWith(page + '-after')) return page + '_after';
  }
  if (slot === 'site-navigation') return 'site_navigation';
  if (slot === 'site-header-after') return 'site_header_after';
  if (slot.startsWith('site-footer-before')) return 'site_footer_before';
  if (slot === 'site-footer') return 'site_footer';
  return slot.split('-')[0] || 'home';
};

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
  const [activePage, setActivePage] = useState('home');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const preview = () => { try { if (!activePageConfig?.preview || !activePageConfig.path) return; const layouts = {}; pageRows.forEach((item) => { const key = previewLayoutKey(item); (layouts[key] ||= []).push(item); }); localStorage.setItem('afsana_cms_preview_v3', JSON.stringify({ layouts })); window.open(activePageConfig.path + '?afsanaPreview=1', '_blank', 'noopener,noreferrer'); } catch { setNotice('Preview could not be opened in this browser.'); } };
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const setConfig = (k, v) => setForm((s) => ({ ...s, config: { ...s.config, [k]: v } }));

  const currentVideoItems = form.type === 'video_grid' ? parseItems(form.config.items) : [];
  const currentPostItems = ['post_grid','blog_grid'].includes(form.type) ? parseItems(form.config.items) : [];
  const updateVideoItem = (index, key, value) => setForm((state) => {
    const items = parseItems(state.config.items);
    if (!items[index]) return state;
    items[index] = { ...items[index], [key]: value };
    return { ...state, config: { ...state.config, items: itemText(items) } };
  });
  const updatePostItem = (index, key, value) => setForm((state) => {
    const items = parseItems(state.config.items);
    if (!items[index]) return state;
    items[index] = { ...items[index], [key]: value };
    return { ...state, config: { ...state.config, items: itemText(items) } };
  });
  const addPostItem = () => setForm((state) => {
    const items = parseItems(state.config.items);
    if (items.length >= 4) return state;
    items.push({ title: `New story 0${items.length + 1}`, text: '', image: '', link: '/journal' });
    return { ...state, config: { ...state.config, items: itemText(items) } };
  });
  const removePostItem = (index) => setForm((state) => {
    const items = parseItems(state.config.items);
    items.splice(index, 1);
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

  const open = (item, targetSlot = CMS_PAGE_GROUPS.find((page) => page.key === activePage)?.defaultSlot || 'home') => {
    if (item) {
      const cfg = { ...defaults(item.type), ...(item.config || {}) };
      if (['footer_showcase','custom_footer'].includes(item.type)) cfg.templateSlot = 'site-footer';
      if (item.type === 'nav_menu') cfg.templateSlot = 'site-navigation';
      if (['whatsapp_float','ai_concierge'].includes(item.type)) cfg.templateSlot = 'site-footer-before';
      if (item.type === 'testimonials') cfg.items = Array.isArray(cfg.items) ? cfg.items : parseTestimonialItems(cfg.items);
      else cfg.items = itemText(cfg.items);
      setForm({ type: item.type, title: item.title || '', config: cfg, isEnabled: item.isEnabled !== false });
    } else setForm({ type: 'hero', title: '', config: { ...defaults('hero'), templateSlot: targetSlot }, isEnabled: true });
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
  const sorted = [...rows].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const activePageConfig = CMS_PAGE_GROUPS.find((page) => page.key === activePage) || CMS_PAGE_GROUPS[1];
  const pageRows = sorted.filter((item) => activePage === 'all' || sectionPageGroup(item) === activePage);
  const visibleRows = pageRows.filter((item) => {
    const matchesQuery = !searchTerm.trim() || sectionSearchText(item).includes(searchTerm.trim().toLowerCase());
    const matchesType = typeFilter === 'all' || sectionTypeKind(item.type) === typeFilter;
    return matchesQuery && matchesType;
  });
  const orderRowsFor = (item) => pageRows.filter((entry) => sectionSlot(entry) === sectionSlot(item));
  const reorder = async (sourceId, targetId) => {
    if (activePage === 'all' || searchTerm.trim() || typeFilter !== 'all' || !sourceId || !targetId || sourceId === targetId) return;
    const source = pageRows.find((item) => item.id === sourceId);
    const target = pageRows.find((item) => item.id === targetId);
    if (!source || !target || sectionSlot(target) !== sectionSlot(source)) return;
    const next = orderRowsFor(source);
    const from = next.findIndex((item) => item.id === sourceId), to = next.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = next.splice(from, 1); next.splice(to, 0, moved);
    try { await Promise.all(next.map((item, index) => api.update(item.id, { sortOrder: index }))); setNotice('Section order saved.'); reload(); }
    catch (e) { setNotice(e.message || 'Could not reorder sections.'); }
  };
  const moveBy = async (id, delta) => {
    if (activePage === 'all' || searchTerm.trim() || typeFilter !== 'all') return;
    const item = pageRows.find((entry) => entry.id === id);
    if (!item) return;
    const next = orderRowsFor(item);
    const from = next.findIndex((entry) => entry.id === id), to = from + delta;
    if (from < 0 || to < 0 || to >= next.length) return;
    const [moved] = next.splice(from, 1); next.splice(to, 0, moved);
    try { await Promise.all(next.map((entry, index) => api.update(entry.id, { sortOrder: index }))); setNotice('Section order saved.'); reload(); }
    catch (e) { setNotice(e.message || 'Could not reorder sections.'); }
  };
  const duplicate = async (item) => {
    setBusy(true); setNotice('');
    try { await api.create({ type: item.type, title: item.title || '', config: item.config || {}, sortOrder: (item.sortOrder ?? rows.length) + 1, isEnabled: false }); setNotice('Section duplicated as hidden. Review it, then publish it.'); reload(); }
    catch (e) { setNotice(e.message || 'Could not duplicate section.'); } finally { setBusy(false); }
  };

  const common = ['hero','video_banner','video_grid','image_banner','split_story','rich_text','cinematic_statement','lookbook'].includes(form.type);
  const itemTypes = ['benefits','testimonials','blog_grid','post_grid','category_tiles','marquee','trust_grid','values_grid','video_grid'];
  return <div className="space-y-5">
    <div className="rounded-3xl border border-[#263e0e]/10 bg-[#faf8f4] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#748e40]">AFSANA / CONTENT STUDIO</p>
          <h2 className="mt-2 font-display text-3xl text-[#263e0e] sm:text-4xl">Your website, page by page.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5f654f]">Choose a page, find its sections, and edit the content in one clear workspace. Each page keeps its own sections and order.</p>
        </div>
        {can('homepage.create') && <Button icon={Plus} onClick={() => open(null, activePageConfig.defaultSlot)}>Add section</Button>}
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-2xl border border-[#263e0e]/10 bg-white p-3 sm:p-4"><p className="text-[10px] uppercase tracking-[.13em] text-[#748e40]">Total sections</p><p className="mt-1 font-display text-2xl text-[#263e0e] sm:text-3xl">{rows.length}</p></div>
        <div className="rounded-2xl border border-[#263e0e]/10 bg-white p-3 sm:p-4"><p className="text-[10px] uppercase tracking-[.13em] text-[#748e40]">Live</p><p className="mt-1 font-display text-2xl text-[#263e0e] sm:text-3xl">{rows.filter((item) => item.isEnabled !== false).length}</p></div>
        <div className="rounded-2xl border border-[#263e0e]/10 bg-white p-3 sm:p-4"><p className="text-[10px] uppercase tracking-[.13em] text-[#748e40]">Hidden</p><p className="mt-1 font-display text-2xl text-[#263e0e] sm:text-3xl">{rows.filter((item) => item.isEnabled === false).length}</p></div>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="h-fit rounded-3xl border border-[#263e0e]/10 bg-white p-3 sm:p-4">
        <div className="px-2 pb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#748e40]">Website pages</p>
          <p className="mt-1 text-xs text-[#7b8375]">Select a page to manage its own content.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-1">
          {CMS_PAGE_GROUPS.map((page) => {
            const PageIcon = page.icon;
            const count = page.key === 'all' ? rows.length : rows.filter((item) => sectionPageGroup(item) === page.key).length;
            const selected = activePage === page.key;
            return <button key={page.key} type="button" onClick={() => setActivePage(page.key)} aria-pressed={selected}
              className={'flex min-w-0 items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ' + (selected ? 'border-[#263e0e] bg-[#263e0e] text-white shadow-sm' : 'border-[#263e0e]/10 bg-[#faf8f4] text-[#263e0e] hover:border-[#748e40]/50 hover:bg-[#f3f1e9]')}>
              <span className={'grid h-9 w-9 shrink-0 place-items-center rounded-xl ' + (selected ? 'bg-white/10 text-[#d3dcae]' : 'bg-[#eef2e5] text-[#526d35]')}><PageIcon className="h-4 w-4"/></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold sm:text-sm">{page.label}</span><span className={'mt-0.5 block text-[10px] ' + (selected ? 'text-white/65' : 'text-[#7b8375]')}>{count} sections</span></span>
              <span className={'hidden rounded-full px-2 py-1 text-[10px] font-semibold sm:inline-flex ' + (selected ? 'bg-white/10 text-white' : 'bg-white text-[#748e40]')}>{count}</span>
            </button>;
          })}
        </div>
        <div className="mt-4 rounded-2xl bg-[#f3f1e9] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#526d35]">Quick tip</p>
          <p className="mt-1 text-xs leading-5 text-[#687363]">Use <strong>All pages</strong> to search the full website. Page tabs keep editing and section ordering separate.</p>
        </div>
      </aside>

      <main className="min-w-0 space-y-4">
        <div className="rounded-3xl border border-[#263e0e]/10 bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#748e40]">PAGE WORKSPACE</p>
              <h3 className="mt-1 font-display text-2xl text-[#263e0e] sm:text-3xl">{activePageConfig.label}</h3>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-[#687363]">{activePageConfig.description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-full bg-[#eef2e5] px-3 py-1.5 text-xs font-semibold text-[#526d35]">{pageRows.length} sections</span>
              {activePageConfig.preview && <Button variant="secondary" onClick={preview}>Preview page</Button>}
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#263e0e]/15 bg-[#faf8f4] px-3 py-2.5 focus-within:border-[#748e40]">
              <Search className="h-4 w-4 shrink-0 text-[#748e40]"/>
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={activePage === 'all' ? 'Search every page, section, heading or story…' : 'Search this page’s sections, headings or stories…'} className="w-full min-w-0 bg-transparent text-sm text-[#263e0e] outline-none placeholder:text-[#9a9f92]" aria-label="Search CMS sections"/>
              {searchTerm && <button type="button" onClick={() => setSearchTerm('')} className="text-xs font-semibold text-[#748e40]">Clear</button>}
            </label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter section type" className="rounded-xl border border-[#263e0e]/15 bg-[#faf8f4] px-3 py-2.5 text-sm text-[#263e0e] outline-none focus:border-[#748e40]">
              <option value="all">All section types</option>
              <option value="visual">Images & visuals</option>
              <option value="video">Video sections</option>
              <option value="stories">Journal & story cards</option>
              <option value="products">Product sections</option>
              <option value="content">Text & content</option>
              <option value="layout">Layout & other</option>
            </select>
          </div>
          {activePage === 'all' && <p className="mt-2 text-[11px] text-[#7b8375]">Search is currently across every page. Each result shows where it appears.</p>}
        </div>

        {notice && <p role="status" className="rounded-xl bg-[#e6f0e4] px-4 py-3 text-sm text-[#3d6b3d]">{notice}</p>}
        {error ? <Card><p className="text-sm text-[#9b3f3f]">{error.message}</p></Card> : loading ? <Card><p className="text-sm text-[#5f654f]">Loading your website sections…</p></Card> : null}

        {!loading && !error && visibleRows.length === 0 && <div className="rounded-3xl border border-dashed border-[#748e40]/40 bg-[#faf8f4] px-5 py-12 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#eef2e5] text-[#526d35]"><Layers className="h-6 w-6"/></span>
          <h4 className="mt-4 font-display text-2xl text-[#263e0e]">{searchTerm || typeFilter !== 'all' ? 'No matching sections' : 'No sections on ' + activePageConfig.label + ' yet'}</h4>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#687363]">{searchTerm || typeFilter !== 'all' ? 'Try another search or clear the filters. Your other page content remains untouched.' : 'Add a section here and it will be assigned to this page—not mixed into another page.'}</p>
          {searchTerm || typeFilter !== 'all' ? <Button variant="secondary" className="mt-4" onClick={() => { setSearchTerm(''); setTypeFilter('all'); }}>Clear filters</Button> : can('homepage.create') && <Button icon={Plus} className="mt-4" onClick={() => open(null, activePageConfig.defaultSlot)}>Add first section</Button>}
        </div>}

        {!loading && !error && visibleRows.map((item) => {
          const meta = HOMEPAGE_SECTION_TYPES.find((entry) => entry.key === item.type);
          const config = item.config || {};
          const image = sectionPreviewImage(item);
          const typeKind = sectionTypeKind(item.type);
          const PreviewIcon = typeKind === 'video' ? Video : typeKind === 'visual' ? ImageIcon : typeKind === 'stories' ? BookOpen : typeKind === 'products' ? ShoppingBag : Layers;
          const orderRows = orderRowsFor(item);
          const orderIndex = orderRows.findIndex((entry) => entry.id === item.id);
          const canReorder = activePage !== 'all' && !searchTerm.trim() && typeFilter === 'all';
          const title = item.title || config.eyebrow || meta?.label || item.type;
          const detail = config.subtitle || config.body || (Array.isArray(config.items) ? config.items[0]?.text : '') || '';
          return <article key={item.id} draggable={can('homepage.edit') && canReorder} onDragStart={() => setDragId(item.id)} onDragOver={(e) => { if (canReorder) e.preventDefault(); }} onDrop={() => reorder(dragId, item.id)} className="group flex flex-col gap-4 rounded-3xl border border-[#263e0e]/10 bg-white p-3 shadow-[var(--shadow-card)] transition hover:border-[#748e40]/40 hover:shadow-[var(--shadow-hover)] sm:flex-row sm:items-center sm:p-4">
            <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-2xl bg-[#f3f1e9] sm:h-28 sm:w-40">
              {image ? <img src={image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover"/> : <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_50%_35%,rgba(180,191,65,.18),transparent_55%),linear-gradient(145deg,#f3f1e9,#e8ede5)]"><div className="text-center text-[#526d35]"><PreviewIcon className="mx-auto h-8 w-8"/><span className="mt-2 block text-[9px] font-semibold uppercase tracking-[.18em]">{meta?.label || item.type}</span><span className="mt-1 block text-[8px] text-[#7b8375]">Section preview</span></div></div>}
              <span className="absolute left-2 top-2 rounded-lg bg-white/90 px-2 py-1 text-[9px] font-bold text-[#526d35]">#{String(orderIndex + 1).padStart(2,'0')}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[9px] font-semibold uppercase tracking-[.15em] text-[#748e40]">{meta?.label || item.type}</span>
                <span className="text-[#c2c8b8]">·</span>
                <span className="text-[10px] text-[#7b8375]">{sectionSlotLabel(item)}</span>
              </div>
              <h4 className="mt-1 truncate font-display text-xl text-[#263e0e] sm:text-2xl">{title}</h4>
              <p className="mt-1 line-clamp-2 max-w-2xl text-xs leading-5 text-[#687363]">{detail || 'This section is ready to edit. Open it to review its content and settings.'}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={'rounded-full px-2.5 py-1 text-[10px] font-semibold ' + (item.isEnabled !== false ? 'bg-[#e6f0e4] text-[#3d6b3d]' : 'bg-[#f3f1e9] text-[#73796b]')}>{item.isEnabled !== false ? 'Live on site' : 'Hidden'}</span>
                {Array.isArray(config.items) && <span className="rounded-full bg-[#f3f1e9] px-2.5 py-1 text-[10px] text-[#687363]">{config.items.length} content items</span>}
                {config.width && <span className="rounded-full bg-[#f3f1e9] px-2.5 py-1 text-[10px] text-[#687363]">{config.width}% width</span>}
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[#263e0e]/10 pt-3 sm:flex-col sm:justify-center sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
              {can('homepage.edit') && <div className="flex items-center gap-1">
                <button type="button" disabled={!canReorder || orderIndex <= 0} onClick={() => moveBy(item.id, -1)} className="rounded-xl p-2 text-[#5f654f] hover:bg-[#eef2e5] hover:text-[#263e0e] disabled:opacity-25" title="Move section up"><ArrowUp className="h-4 w-4"/></button>
                <button type="button" disabled={!canReorder || orderIndex === orderRows.length - 1} onClick={() => moveBy(item.id, 1)} className="rounded-xl p-2 text-[#5f654f] hover:bg-[#eef2e5] hover:text-[#263e0e] disabled:opacity-25" title="Move section down"><ArrowDown className="h-4 w-4"/></button>
                <button type="button" onClick={() => duplicate(item)} className="rounded-xl p-2 text-[#5f654f] hover:bg-[#eef2e5] hover:text-[#263e0e]" title="Duplicate section"><Copy className="h-4 w-4"/></button>
                <button type="button" onClick={() => api.setActive(item.id, !item.isEnabled).then(reload)} className="rounded-xl p-2 text-[#5f654f] hover:bg-[#eef2e5] hover:text-[#263e0e]" title={item.isEnabled ? 'Hide section' : 'Publish section'}><Power className="h-4 w-4"/></button>
                <button type="button" onClick={() => open(item)} className="rounded-xl p-2 text-[#5f654f] hover:bg-[#eef2e5] hover:text-[#263e0e]" title="Edit section"><Pencil className="h-4 w-4"/></button>
              </div>}
              {can('homepage.delete') && <button type="button" onClick={() => setDel(item)} className="rounded-xl p-2 text-[#5f654f] hover:bg-[#f7e7e5] hover:text-[#9b3f3f]" title="Delete section"><Trash2 className="h-4 w-4"/></button>}
            </div>
          </article>;
        })}
      </main>
    </div>
    <Drawer open={drawer.open} onClose={close} title={drawer.item ? 'Edit homepage section' : 'Add homepage section'} footer={<><Button variant="secondary" type="button" onClick={close}>Cancel</Button><Button type="submit" form="homepage-section-form" disabled={busy}>{busy ? 'Saving…' : 'Save section'}</Button></>}>
      <form id="homepage-section-form" onSubmit={save} className="space-y-4">
        <Field label="Section type"><Select value={form.type} disabled={!!drawer.item} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value, config: { ...defaults(e.target.value), templateSlot: s.config.templateSlot || activePageConfig.defaultSlot } }))}>{HOMEPAGE_SECTION_TYPES.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</Select></Field>
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
            <option value="contact-before">Contact page — above the form</option>
            <option value="contact-after">Contact page — below the form</option>
            <option value="product-before">Product page — above details</option>
            <option value="product-after">Product page — below details</option>
            <option value="cart-before">Cart page — above cart</option>
            <option value="cart-after">Cart page — below cart</option>
            <option value="checkout-before">Checkout page — above form</option>
            <option value="checkout-after">Checkout page — below form</option>
            <option value="track-before">Track order — above form</option>
            <option value="track-after">Track order — below form</option>
            <option value="discover">Scent finder page</option>
            <option value="site-navigation">Shared — navigation</option>
            <option value="site-header-after">Shared — below the navigation</option>
            <option value="site-footer-before">Shared — above the footer</option>
            <option value="site-footer">Shared — footer</option>
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
        {form.type === 'video_banner' && <><Field label="Video URL"><Input value={form.config.videoUrl || ''} onChange={(e) => setConfig('videoUrl', e.target.value)} placeholder="https://…/video.mp4" /></Field><Field label="Poster image URL"><Input value={form.config.posterUrl || ''} onChange={(e) => setConfig('posterUrl', e.target.value)} placeholder="Optional video poster image" /><div className="mt-2"><ImageUploadButton label="Upload poster image" onUploaded={(url) => setConfig('posterUrl', url)} /></div></Field><div className="grid grid-cols-3 gap-2"><Check label="Autoplay" checked={form.config.autoplay !== false} onChange={(v) => setConfig('autoplay', v)} /><Check label="Muted" checked={form.config.muted !== false} onChange={(v) => setConfig('muted', v)} /><Check label="Controls" checked={!!form.config.controls} onChange={(v) => setConfig('controls', v)} /></div></>}
        {['hero','video_banner','image_banner','split_story','promo_timer','offer_timer','muse_scene','product_3d_showcase','fragrance_dna','interactive_gallery','cinematic_statement'].includes(form.type) && <div className="grid grid-cols-2 gap-3"><Field label="Button text"><Input value={form.config.buttonText || ''} onChange={(e) => setConfig('buttonText', e.target.value)} /></Field><Field label="Button link"><Input value={form.config.buttonLink || ''} onChange={(e) => setConfig('buttonLink', e.target.value)} placeholder="/shop" /></Field></div>}
        {['featured_collection','best_sellers','new_arrivals','under_2000','gift_boxes','blog_grid'].includes(form.type) && <><Field label="Collection / query hint"><Input value={form.config.query || ''} onChange={(e) => setConfig('query', e.target.value)} placeholder="Optional category / collection / query" /></Field><Field label="Number of items"><Input type="number" min="1" max="12" value={form.config.limit ?? 4} onChange={(e) => setConfig('limit', Number(e.target.value))} /></Field></>}
        {form.type === 'testimonials' && <div className="rounded-xl border border-[#b4bf41]/35 bg-[#f4f6eb] p-4 text-sm leading-6 text-[#5f654f]">
          <strong className="text-[#263e0e]">Reviews are managed centrally.</strong>
          <p>Use CMS → Reviews Manager to add, edit or remove review cards. Your changes sync to every existing testimonials placement, including Home and product pages. This section editor is only for placement and layout.</p>
        </div>}
        {['post_grid','blog_grid'].includes(form.type) ? <div className="space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 className="text-sm font-semibold text-[#263e0e]">Journal stories & perfume images</h3><p className="text-xs text-[#5f654f]">Upload your AFSANA bottle or product photo for each story card. The uploaded image will appear in this section.</p></div>
            <span className="text-xs text-[#5f654f]">{currentPostItems.length} / 4 stories</span>
          </div>
          {currentPostItems.map((item, index) => <div key={index} className="space-y-3 rounded-2xl border border-[#263e0e]/10 bg-[#faf8f4] p-4">
            <div className="flex items-center justify-between gap-3"><strong className="text-sm text-[#263e0e]">Story {String(index + 1).padStart(2, '0')}</strong><button type="button" onClick={() => removePostItem(index)} className="text-xs font-medium text-[#9b3f3f] hover:underline">Remove story</button></div>
            <Field label="Story title"><Input value={item.title} onChange={(e) => updatePostItem(index, 'title', e.target.value)} placeholder="e.g. Find your signature scent" /></Field>
            <Field label="Story description"><Textarea rows={2} value={item.text} onChange={(e) => updatePostItem(index, 'text', e.target.value)} placeholder="A short introduction to this story" /></Field>
            <Field label="Perfume image">
              <Input value={item.image} onChange={(e) => updatePostItem(index, 'image', e.target.value)} placeholder="Upload an image or paste its URL" />
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <ImageUploadButton label={item.image ? 'Replace perfume image' : 'Upload perfume image'} onUploaded={(url) => updatePostItem(index, 'image', url)} />
                {item.image && <img src={item.image} alt="" className="h-24 w-20 rounded-lg border border-[#263e0e]/10 bg-white object-contain p-1" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />}
              </div>
            </Field>
            <Field label="Story link"><Input value={item.link} onChange={(e) => updatePostItem(index, 'link', e.target.value)} placeholder="/journal" /></Field>
          </div>)}
          {currentPostItems.length < 4 && <button type="button" onClick={addPostItem} className="w-full rounded-xl border border-dashed border-[#263e0e]/25 bg-white px-4 py-3 text-sm font-medium text-[#263e0e] hover:bg-[#eef2e5]">+ Add story</button>}
          <p className="text-xs leading-5 text-[#5f654f]">Upload up to four individual perfume images. Press Save section after each upload or after updating the cards.</p>
        </div> : form.type === 'video_grid' ? <div className="space-y-4">
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
