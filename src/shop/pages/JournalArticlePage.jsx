import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import useTitle from '../useTitle';
import { Container } from '../ui';
import { JOURNAL_ARTICLES } from '../journalArticles';

export default function JournalArticlePage() {
  const { slug } = useParams();
  const article = JOURNAL_ARTICLES.find((item) => item.slug === slug);
  const canonicalUrl = article ? `https://afsanaperfumes.store/journal/${article.slug}` : '';
  const jsonLd = useMemo(() => {
    if (!article) return null;
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Article',
          headline: article.title,
          description: article.description,
          datePublished: article.publishedDate,
          dateModified: article.publishedDate,
          author: { '@type': 'Organization', name: 'AFSANA Perfumes' },
          publisher: {
            '@type': 'Organization',
            name: 'AFSANA Perfumes',
            url: 'https://afsanaperfumes.store/',
          },
          mainEntityOfPage: canonicalUrl,
          inLanguage: 'en-PK',
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://afsanaperfumes.store/' },
            { '@type': 'ListItem', position: 2, name: 'Journal', item: 'https://afsanaperfumes.store/journal' },
            { '@type': 'ListItem', position: 3, name: article.title, item: canonicalUrl },
          ],
        },
      ],
    };
  }, [article, canonicalUrl]);

  useTitle(article?.seoTitle || article?.title || 'AFSANA Journal', {
    description: article?.description || 'Perfume guides and scent stories from AFSANA Perfumes.',
    canonicalUrl: canonicalUrl || undefined,
    jsonLd,
    type: 'article',
    robots: 'index,follow,max-image-preview:large',
  });

  if (!article) return <Navigate to="/journal" replace />;

  return (
    <article className="bg-[#f7f4ed] text-[#173d26]">
      <header className="bg-[#173d26] py-16 text-white sm:py-24">
        <Container>
          <Link to="/journal" className="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.18em] text-[#ffbd37]">
            <ArrowLeft className="h-4 w-4" /> Back to the AFSANA Journal
          </Link>
          <p className="mt-12 text-[9px] font-bold uppercase tracking-[.25em] text-[#ffbd37]">{article.eyebrow}</p>
          <h1 className="mt-5 max-w-4xl font-display text-5xl leading-[.96] tracking-[-.04em] sm:text-7xl">{article.title}</h1>
          <p className="mt-7 max-w-2xl text-sm leading-8 text-white/75">{article.excerpt}</p>
          <div className="mt-8 flex items-center gap-3 text-[9px] font-bold uppercase tracking-[.18em] text-white/60">
            <BookOpen className="h-4 w-4" /> AFSANA JOURNAL <span>·</span> {article.sections.length} SECTIONS
          </div>
        </Container>
      </header>
      <Container>
        <div className="mx-auto max-w-3xl py-14 sm:py-20">
          <p className="mb-10 border-l-2 border-[#b69556] pl-5 text-base leading-8 text-[#405942]">{article.excerpt}</p>
          {article.sections.map((section, index) => (
            <section key={section.heading} className="mb-11">
              <p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#748e40]">0{index + 1} / AFSANA GUIDE</p>
              <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">{section.heading}</h2>
              {section.paragraphs.map((paragraph, paragraphIndex) => (
                <p key={paragraphIndex} className="mt-5 text-sm leading-8 text-[#586b5a]">{paragraph}</p>
              ))}
            </section>
          ))}
          <div className="mt-14 border-t border-[#173d26]/15 pt-8">
            <p className="font-display text-3xl">Continue your AFSANA story.</p>
            <p className="mt-3 text-sm leading-7 text-[#687363]">Explore the collection, discover your scent profile or speak with the AFSANA team.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {article.links.map((link) => (
                <Link key={link.href} to={link.href} className="inline-flex items-center gap-2 bg-[#173d26] px-5 py-3 text-[9px] font-bold uppercase tracking-[.16em] text-white">
                  {link.label} <ArrowRight className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>
          <Link to="/journal" className="mt-10 inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.18em] text-[#496b4e]">
            <ArrowLeft className="h-4 w-4" /> More from the journal
          </Link>
        </div>
      </Container>
    </article>
  );
}
