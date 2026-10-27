import { Link } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import { productsApi, publicTaxonomyApi, shopContentApi } from '../../services';
import { Container } from '../ui';
import HomepageSections from '../HomepageSections';
import useTitle from '../useTitle';

const DEFAULT_SECTIONS = [
  { id:'default-hero', type:'hero', title:'A scent that becomes your signature.', isEnabled:true, config:{ eyebrow:'AFSANA PERFUMES', subtitle:'Discover refined fragrances composed for presence, memory and everyday luxury.', buttonText:'Shop the collection', buttonLink:'/shop' } },
  { id:'default-cinematic', type:'cinematic_statement', title:'Wear the memory. Leave the impression.', isEnabled:true, config:{ eyebrow:'THE ART OF PERFUMERY', body:'Afsana is composed around the moments you want to keep — and the presence you want to leave behind.', buttonText:'Explore the collection', buttonLink:'/shop' } },
  { id:'default-benefits', type:'benefits', title:'', isEnabled:true, config:{ items:'Signature-worthy sillage|Designed to be remembered\nThoughtful ingredients|Chosen for a beautiful finish\nElegant packaging|Ready to gift or keep\nPakistan-wide delivery|Packed with care' } },
  { id:'default-best', type:'best_sellers', title:'The Afsana Icons', isEnabled:true, config:{ limit:4 } },
  { id:'default-story', type:'split_story', title:'Luxury is not loud. It lingers.', isEnabled:true, config:{ eyebrow:'THE AFSANA STORY', body:'Every Afsana fragrance is an invitation to leave an impression — quietly, beautifully and unmistakably yours.', buttonText:'Discover the collection', buttonLink:'/shop' } },
  { id:'default-new', type:'new_arrivals', title:'New in the House', isEnabled:true, config:{ limit:4 } },
  { id:'default-lookbook', type:'lookbook', title:'A fragrance wardrobe for every moment', isEnabled:true, config:{} },
  { id:'default-values', type:'values_grid', title:'Details matter', isEnabled:true, config:{} },
  { id:'default-trust', type:'trust_grid', title:'', isEnabled:true, config:{} },
  { id:'default-editorial', type:'blog_grid', title:'Notes from the house', isEnabled:true, config:{} },
  { id:'default-testimonials', type:'testimonials', title:'Loved, remembered, recommended.', isEnabled:true, config:{} },
  { id:'default-faq', type:'faq', title:'Everything you need to know', isEnabled:true, config:{} },
  { id:'default-newsletter', type:'newsletter', title:'', isEnabled:true, config:{} },
  { id:'default-social', type:'instagram', title:'Afsana, beyond the bottle.', isEnabled:true, config:{} },
];

function CmsBannerBridge({banners}) {
  if (!banners.length) return null;
  const mapped=banners.map((b)=>({id:b.id,type:'hero',title:b.heading||'Afsana Perfumes',isEnabled:true,config:{imageUrl:b.desktopImage?.url||b.desktopImageUrl||'',mobileImageUrl:b.mobileImage?.url||b.mobileImageUrl||'',subtitle:b.subtitle||'',buttonText:b.buttonText||'',buttonLink:b.buttonLink||'/shop',eyebrow:'AFSANA PERFUMES'}}));
  return <HomepageSections sections={mapped}/>;
}

export default function HomePage(){
  useTitle();
  const content=useApi(()=>shopContentApi.get(),[]);
  const sections=content.data?.homepageSections||[];
  const banners=content.data?.banners||[];
  const faqs=content.data?.faqs||[];
  if(sections.length) return <HomepageSections sections={sections} faqs={faqs}/>;
  if(banners.length) return <CmsBannerBridge banners={banners}/>;
  return <HomepageSections sections={DEFAULT_SECTIONS} faqs={faqs}/>;
}
