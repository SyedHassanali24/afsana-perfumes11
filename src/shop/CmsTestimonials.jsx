const SAMPLE_ITEMS = [
  {
    name: 'Sample customer 01',
    rating: 5,
    title: 'An elegant first impression',
    text: 'Illustrative sample copy. Replace this with feedback approved by a real AFSANA customer.',
    product: 'Sample fragrance',
    sample: true,
  },
  {
    name: 'Sample customer 02',
    rating: 5,
    title: 'A scent with character',
    text: 'Illustrative sample copy. Replace this with feedback approved by a real AFSANA customer.',
    product: 'Sample fragrance',
    sample: true,
  },
  {
    name: 'Sample customer 03',
    rating: 5,
    title: 'Made for memorable moments',
    text: 'Illustrative sample copy. Replace this with feedback approved by a real AFSANA customer.',
    product: 'Sample fragrance',
    sample: true,
  },
];

export const sampleTestimonialsSection = {
  id: 'afsana-sample-reviews-fallback',
  type: 'testimonials',
  title: 'Words from the AFSANA circle.',
  isEnabled: true,
  config: {
    eyebrow: 'THE AFSANA CIRCLE',
    subtitle: 'A place for fragrance stories and customer experiences.',
    items: SAMPLE_ITEMS,
  },
};

export default function CmsTestimonials({ section = sampleTestimonialsSection, compact = false }) {
  const config = section?.config || {};
  const items = Array.isArray(config.items) ? config.items : SAMPLE_ITEMS;
  const heading = section?.title || 'Words from the AFSANA circle.';
  return (
    <section className={`afsana-cms-reviews ${compact ? 'afsana-cms-reviews-compact' : ''}`} aria-label="AFSANA customer reviews">
      <div className="container-xl">
        <div className="afsana-cms-reviews-heading">
          <p>{config.eyebrow || 'THE AFSANA CIRCLE'}</p>
          <h2>{heading}</h2>
          {config.subtitle && <span>{config.subtitle}</span>}
        </div>
        {items.length > 0 ? <div className="afsana-cms-reviews-grid">
          {items.map((item, index) => {
            const rating = Math.max(0, Math.min(5, Math.round(Number(item.rating) || 0)));
            const isSample = item.sample === true || item.isSample === true || String(item.label || '').toLowerCase() === 'sample';
            return (
              <article className="afsana-cms-review-card" key={item.id || `${item.name || item.title || 'review'}-${index}`}>
                <div className="afsana-cms-review-top">
                  {rating > 0 && <span className="afsana-cms-review-stars" aria-label={`${rating} out of 5 stars`}>{'★'.repeat(rating)}<span>{'☆'.repeat(5 - rating)}</span></span>}
                  {isSample && <span className="afsana-cms-review-sample">SAMPLE</span>}
                </div>
                {item.title && <h3>{item.title}</h3>}
                {item.text && <blockquote>“{item.text}”</blockquote>}
                <div className="afsana-cms-review-author">
                  <strong>{item.name || item.author || 'AFSANA customer'}</strong>
                  {item.product && <span>{item.product}</span>}
                </div>
                {isSample && <p className="afsana-cms-review-disclaimer">Illustrative placeholder — replace with approved customer feedback in CMS.</p>}
              </article>
            );
          })}
        </div> : <p className="afsana-cms-reviews-empty">Customer stories will appear here once approved.</p>}
      </div>
    </section>
  );
}
