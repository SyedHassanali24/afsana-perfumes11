import { useEffect, useState } from 'react';
import { Plus, Trash2, Star, Save, RefreshCw } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { Field, Input, Textarea, Select, Check } from '../components/FormFields';
import { useAuth } from '../../src/auth/AuthContext';
import { cmsApi } from '../../src/services';
import { sampleTestimonialsSection } from '../../src/shop/CmsTestimonials';

const api = cmsApi('homepage');
const clone = (value) => JSON.parse(JSON.stringify(value));
const defaults = () => ({
  title: sampleTestimonialsSection.title,
  eyebrow: sampleTestimonialsSection.config.eyebrow,
  subtitle: sampleTestimonialsSection.config.subtitle,
  items: clone(sampleTestimonialsSection.config.items),
});
const pageForSlot = (slot) => {
  const value = String(slot || 'home').trim().toLowerCase();
  const prefix = value.split('-')[0];
  return ['home', 'house', 'journal', 'gifting', 'discover', 'collection'].includes(prefix) ? prefix : value;
};
const pageLabel = (slot) => ({
  home: 'Home',
  house: 'The House',
  journal: 'Journal',
  gifting: 'Gifting',
  discover: 'Scent finder',
  'collection-before': 'Collection',
  'collection-after': 'Collection',
}[String(slot || 'home').toLowerCase()] || String(slot || 'Home'));
const normalizeItems = (value) => {
  if (Array.isArray(value)) return value.map((item) => ({
    name: item.name || item.author || '',
    rating: Math.max(0, Math.min(5, Number(item.rating) || 0)),
    title: item.title || '',
    text: item.text || '',
    product: item.product || '',
    sample: item.sample === true || item.isSample === true || String(item.label || '').toLowerCase() === 'sample',
  }));
  return String(value || '').split('\\n').map((line) => {
    const [name = '', rating = '0', title = '', text = '', product = '', sample = ''] = line.split('|');
    return { name: name.trim(), rating: Number(rating) || 0, title: title.trim(), text: text.trim(), product: product.trim(), sample: /^(sample|demo|true|yes)$/i.test(sample.trim()) };
  }).filter((item) => item.name || item.title || item.text);
};

export default function ReviewsManager() {
  const { can } = useAuth();
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    setProblem('');
    try {
      const response = await api.list();
      const all = response?.items || [];
      const testimonialRows = all
        .filter((item) => item.type === 'testimonials')
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setRecords(testimonialRows);
      const preferred = testimonialRows.find((item) => item.isEnabled !== false && pageForSlot(item.config?.templateSlot) === 'home')
        || testimonialRows.find((item) => item.isEnabled !== false)
        || testimonialRows[0];
      if (preferred) {
        setForm({
          title: preferred.title || sampleTestimonialsSection.title,
          eyebrow: preferred.config?.eyebrow ?? sampleTestimonialsSection.config.eyebrow,
          subtitle: preferred.config?.subtitle ?? sampleTestimonialsSection.config.subtitle,
          items: normalizeItems(preferred.config?.items),
        });
      } else {
        setForm(defaults());
      }
    } catch (error) {
      setProblem(error.message || 'Could not load CMS reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateItem = (index, key, value) => set('items', form.items.map((item, i) => i === index ? { ...item, [key]: value } : item));
  const addItem = () => set('items', [...form.items, { name: '', rating: 5, title: '', text: '', product: '', sample: false }]);
  const removeItem = (index) => set('items', form.items.filter((_, i) => i !== index));

  const save = async () => {
    if (!can('homepage.edit') && records.length) {
      setProblem('You do not have permission to edit CMS reviews.');
      return;
    }
    if (!records.length && !can('homepage.create')) {
      setProblem('You do not have permission to create the shared CMS reviews section.');
      return;
    }
    setBusy(true);
    setProblem('');
    setNotice('');
    try {
      const shared = {
        eyebrow: form.eyebrow.trim(),
        subtitle: form.subtitle.trim(),
        items: clone(form.items),
      };
      const hasEnabledHome = records.some((record) =>
        record.isEnabled !== false && pageForSlot(record.config?.templateSlot) === 'home'
      );

      if (records.length) {
        await Promise.all(records.map((record) => api.update(record.id, {
          type: 'testimonials',
          title: form.title.trim(),
          config: { ...(record.config || {}), ...shared },
          sortOrder: record.sortOrder ?? 0,
          isEnabled: record.isEnabled !== false,
        })));
      }

      if (!hasEnabledHome) {
        if (!can('homepage.create')) throw new Error('Review content was updated, but your role cannot create the shared Home placement. Ask an administrator for homepage.create permission.');
        await api.create({
          type: 'testimonials',
          title: form.title.trim(),
          config: { ...shared, templateSlot: 'home' },
          sortOrder: 999,
          isEnabled: true,
        });
      }

      setNotice('Saved. The same review cards are now synced to every existing CMS testimonials placement and the shared Home/product-page placement.');
      await load();
    } catch (error) {
      setProblem(error.message || 'Could not save CMS reviews.');
    } finally {
      setBusy(false);
    }
  };

  const placements = [...new Set(records.map((record) => pageLabel(record.config?.templateSlot)))];
  const editable = can('homepage.edit') || (!records.length && can('homepage.create'));

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#748e40]">Central content manager</p>
            <h2 className="mt-1 font-display text-2xl text-[#182308]">Customer testimonials</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f654f]">
              Edit these display cards once. One save updates every existing CMS testimonial section across the site. Product pages also use the shared Home testimonial set.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={load} disabled={loading || busy}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-[#e6f0e4] px-3 py-1.5 text-[#3d6b3d]">One save · All placements</span>
          {placements.map((label) => <span key={label} className="rounded-full border border-[#263e0e]/15 px-3 py-1.5 text-[#5f654f]">{label}</span>)}
          {!placements.length && <span className="rounded-full border border-[#263e0e]/15 px-3 py-1.5 text-[#5f654f]">Home + product pages on first save</span>}
        </div>
      </Card>

      {notice && <p role="status" className="rounded-xl bg-[#e6f0e4] px-4 py-3 text-sm text-[#3d6b3d]">{notice}</p>}
      {problem && <p role="alert" className="rounded-xl bg-[#f7e7e5] px-4 py-3 text-sm text-[#9b3f3f]">{problem}</p>}
      {loading ? <Card><p className="text-sm text-[#5f654f]">Loading shared testimonials…</p></Card> : (
        <>
          <Card>
            <div className="space-y-4">
              <Field label="Section heading"><Input value={form.title} onChange={(event) => set('title', event.target.value)} disabled={!editable} maxLength={120} /></Field>
              <Field label="Eyebrow"><Input value={form.eyebrow} onChange={(event) => set('eyebrow', event.target.value)} disabled={!editable} maxLength={80} /></Field>
              <Field label="Intro text"><Textarea rows={2} value={form.subtitle} onChange={(event) => set('subtitle', event.target.value)} disabled={!editable} maxLength={240} /></Field>
            </div>
          </Card>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="font-display text-xl text-[#182308]">Review cards</h3><p className="text-xs text-[#5f654f]">Edit, add or remove cards. Changes sync to every placement.</p></div>
              {editable && <Button type="button" variant="secondary" onClick={addItem}><Plus className="mr-2 h-4 w-4" /> Add review</Button>}
            </div>
            {form.items.map((item, index) => (
              <Card key={index}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#263e0e]"><Star className="h-4 w-4 text-[#b4bf41]" /> Review {index + 1}</div>
                  {editable && <button type="button" onClick={() => removeItem(index)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#9b3f3f] underline"><Trash2 className="h-3.5 w-3.5" /> Remove</button>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Display name"><Input value={item.name || ''} onChange={(event) => updateItem(index, 'name', event.target.value)} disabled={!editable} maxLength={80} /></Field>
                  <Field label="Star rating"><Select value={String(item.rating ?? 0)} onChange={(event) => updateItem(index, 'rating', Number(event.target.value))} disabled={!editable}>{[0,1,2,3,4,5].map((n) => <option key={n} value={n}>{n === 0 ? 'No rating' : `${n} / 5 stars`}</option>)}</Select></Field>
                </div>
                <div className="mt-4 space-y-4">
                  <Field label="Review heading"><Input value={item.title || ''} onChange={(event) => updateItem(index, 'title', event.target.value)} disabled={!editable} maxLength={120} /></Field>
                  <Field label="Customer comment"><Textarea rows={3} value={item.text || ''} onChange={(event) => updateItem(index, 'text', event.target.value)} disabled={!editable} maxLength={1500} /></Field>
                  <Field label="Perfume / product name"><Input value={item.product || ''} onChange={(event) => updateItem(index, 'product', event.target.value)} disabled={!editable} maxLength={80} /></Field>
                  <Check label="Mark this as a sample/demo card" checked={!!item.sample} onChange={(value) => updateItem(index, 'sample', value)} disabled={!editable} />
                </div>
              </Card>
            ))}
            {!form.items.length && <Card><p className="text-sm text-[#5f654f]">No testimonials are configured. Add a review card to begin.</p></Card>}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-2xl text-xs leading-5 text-[#5f654f]">
              These are editable CMS display testimonials. Verified-buyer reviews remain separate in Sales → Reviews, where approval and moderation are handled.
            </p>
            <Button type="button" onClick={save} disabled={!editable || busy}>
              <Save className="mr-2 h-4 w-4" /> {busy ? 'Saving all placements…' : 'Save reviews everywhere'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
