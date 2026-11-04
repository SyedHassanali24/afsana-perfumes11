import useApi from '../hooks/useApi';
import { cmsPublicApi } from '../services';

export const PAGE_COPY_FIELDS = {
  collection_before: [
    ['eyebrow','Collection eyebrow','AFSANA / THE COMPLETE COLLECTION'],
    ['titleStart','Main heading','Find your'],
    ['titleAccent','Heading accent','forever note.'],
    ['intro','Collection introduction','Explore fragrances crafted around mood, memory and modern identity. Find the scent that feels unmistakably yours.'],
    ['footnote','Hero footnote','CURATED SCENTS. LASTING IMPRESSIONS.'],
    ['allCategory','All products filter','All fragrances'],
    ['signatureCategory','Signature filter','Signature'],
    ['freshCategory','Fresh filter','Fresh'],
    ['boldCategory','Bold filter','Bold'],
    ['warmCategory','Warm filter','Warm'],
    ['sortLabel','Sort label','Sort by'],
    ['sortNewest','Newest sort option','Newest'],
    ['sortPriceAsc','Price low to high sort option','Price: low to high'],
    ['sortPriceDesc','Price high to low sort option','Price: high to low'],
    ['sortFeatured','Featured sort option','Featured'],
    ['emptyResults','No products message','No perfumes match this story. Try another collection.'],
  ],
  product_before: [
    ['homeCrumb','Home breadcrumb','Home'], ['collectionCrumb','Collection breadcrumb','Collection'],
    ['galleryLabel','Gallery label','AFSANA /'], ['autoGallery','Automatic gallery button','Auto gallery'], ['stopGallery','Stop gallery button','Stop gallery'],
    ['modelReady','3D model ready label','Interactive 3D bottle'], ['modelLoading','3D model loading label','Loading 3D preview'], ['interactiveView','Product view label','Interactive product view'], ['bottlePreview','Bottle preview label','Bottle preview'],
    ['mediaAlt','Product media accessibility label','View product media'], ['productReference','Product reference label','AFSANA / 01'], ['reviewSingular','Review count singular','review'], ['reviewPlural','Review count plural','reviews'],
    ['quantityLabel','Quantity label','QTY'], ['selectedSize','Selected size label','SELECTED'], ['chooseSize','Choose size label','CHOOSE'],
    ['perk1Title','Product benefit 1 title','Premium'], ['perk1Text','Product benefit 1 subtitle','Fragrance Oils'], ['perk2Title','Product benefit 2 title','Gift Ready'], ['perk2Text','Product benefit 2 subtitle','Luxury Packaging'], ['perk3Title','Product benefit 3 title','Fast'], ['perk3Text','Product benefit 3 subtitle','Nationwide Delivery'],
    ['quantityLabel','Quantity label','QTY'], ['selectedSize','Selected size label','SELECTED'], ['chooseSize','Choose size label','CHOOSE'], ['productDescription','Fallback product description','A fragrance composed to become part of your identity — luminous, sophisticated and designed to leave a trace.'],
    ['ratingEmpty','Empty rating label','NOT RATED YET'], ['noReviews','No reviews message','No approved reviews yet — be the first to share your experience.'],
    ['priceLabel','Price heading','YOUR FRAGRANCE'], ['unavailable','Unavailable message','Currently unavailable'],
    ['limitedStock','Limited stock label','Limited availability'], ['inStock','In stock label','In stock'], ['readyToShip','Ready to ship label','Ready to ship'],
    ['sizeHeading','Size selector heading','Choose your size'], ['selectSize','Size selector placeholder','SELECT SIZE'],
    ['addToBag','Add to bag button','Add to bag'], ['addedToBag','Added to bag confirmation','Added to bag'],
    ['addWishlist','Add to wishlist label','Add to wishlist'], ['removeWishlist','Remove from wishlist label','Remove from wishlist'],
    ['profileHeading','Fragrance profile heading','Fragrance profile'], ['profileDetails','Fragrance profile subheading','THE DETAILS'],
    ['storyKicker','Scent story eyebrow','THE ARCHITECTURE OF A SCENT'], ['storyHeading','Scent story heading','Three chapters.'], ['storyHeadingAccent','Scent story accent','One memory.'],
    ['storyIntro','Scent story introduction','A fragrance reveals itself in its own time. An unforgettable opening, a character at its heart, and a final trace that stays with you.'],
    ['openingOverline','Opening chapter overline','THE FIRST IMPRESSION'], ['openingDescription','Opening chapter description','The opening that draws you in.'],
    ['heartOverline','Heart chapter overline','THE SOUL OF THE SCENT'], ['heartDescription','Heart chapter description','The character that makes it yours.'],
    ['memoryOverline','Memory chapter overline','THE LASTING MEMORY'], ['memoryDescription','Memory chapter description','The warm trail that lingers.'],
    ['openingTitle','Opening chapter title','The opening.'], ['heartTitle','Heart chapter title','The character.'], ['memoryTitle','Memory chapter title','The memory.'],
    ['fallbackNote','Fallback note label','Signature accord'], ['insideBottle','Inside the bottle eyebrow','Inside the bottle'],
    ['moreThan','More than heading','More than'], ['moreThanAccent','More than accent','a fragrance.'],
    ['chapterOpening','Opening banner title','The Opening'], ['chapterHeart','Heart banner title','The Heart'],
    ['chapterMemory','Memory banner title','The Memory'], ['chapterRitual','Ritual banner title','Your Ritual'],
    ['chapterOpeningTitle','Opening banner heading','First impressions matter.'], ['chapterHeartTitle','Heart banner heading','Where the story unfolds.'],
    ['chapterMemoryTitle','Memory banner heading','What remains after you leave.'], ['chapterRitualTitle','Ritual banner heading','Make it unmistakably yours.'],
    ['chapterCaption','Banner caption','Spray. Layer. Wear. Remember.'],
    ['storyTab','Story tab','The Story'], ['detailsTab','Details tab','Details'],
    ['defaultStory','Default story tab content','A fragrance composed to become part of your identity. Spray it close to the skin, let it warm naturally, and allow each layer to reveal itself in its own time.'],
    ['defaultDetails','Default details tab content','Premium fragrance oils, carefully composed and designed for an evolving trail.'],
    ['relatedKicker','Related products eyebrow','CURATED FOR YOU'], ['relatedHeading','Related products heading','Complete'], ['relatedHeadingAccent','Related products accent','the story.'],
  ],
  house: [
    ['heroEyebrow','Hero eyebrow','The House of Afsana'], ['heroTitleLine1','Hero heading line 1','A HOUSE'], ['heroTitleLine2','Hero heading line 2','OF'], ['heroTitleAccent','Hero heading accent','MEMORIES.'],
    ['manifesto','Manifesto statement','We do not create perfumes. We create the moments people remember.'],
    ['story1','Story paragraph 1','Afsana was born from a simple belief: scent has the extraordinary ability to transform ordinary moments into permanent memories.'],
    ['story2','Story paragraph 2','Our approach combines the language of traditional perfumery with a modern understanding of how fragrance fits into contemporary life.'],
    ['story3','Story paragraph 3','Each composition is built around contrast — light against darkness, freshness against warmth, confidence against intimacy.'],
    ['philosophyEyebrow','Philosophy eyebrow','The Afsana philosophy'], ['philosophyTitle','Philosophy heading','Wear the'], ['philosophyAccent','Philosophy accent','story.'],
    ['craftEyebrow','Craft eyebrow','The craft'], ['craftTitle','Craft heading','Created to'], ['craftAccent','Craft accent','leave a trace.'],
    ['craftBody','Craft description','Every Afsana composition is created as a chapter: an opening, a heart and a final impression designed to remain long after the moment has passed.'],
    ['craftButton','Craft button','Explore the collection'],
  ],
  journal: [
    ['heroEyebrow','Journal eyebrow','Afsana Journal'], ['titleStart','Journal heading','Notes on'], ['titleAccent','Journal heading accent','fragrance.'],
    ['post1Category','Story 1 category','Guide / Fragrance'], ['post1Title','Story 1 title','Finding your signature'], ['post1Description','Story 1 description','A practical guide to discovering what really suits your personality.'], ['post1Button','Story 1 link label','Discover'],
    ['post2Category','Story 2 category','Ingredient / Oud'], ['post2Title','Story 2 title','Why oud feels timeless'], ['post2Description','Story 2 description','The history and mystery of one of perfumery’s most fascinating materials.'], ['post2Button','Story 2 link label','Discover'],
    ['post3Category','Story 3 category','Ritual / Lifestyle'], ['post3Title','Story 3 title','The art of layering'], ['post3Description','Story 3 description','Turn one fragrance into a completely personal scent wardrobe.'], ['post3Button','Story 3 link label','Discover'],
  ],
  gifting: [
    ['heroEyebrow','Gifting hero eyebrow','Afsana Gifting'], ['heroTitleStart','Gifting hero heading','GIVE A'], ['heroTitleAccent','Gifting hero accent','MEMORY.'],
    ['storyEyebrow','Story eyebrow','Curated gifting'], ['storyTitleStart','Story heading','Beautifully'], ['storyTitleAccent','Story heading accent','considered.'],
    ['storyBody','Gifting description','From intimate gestures to unforgettable celebrations, Afsana gifting is designed to make the moment feel as beautiful as the gift itself.'],
    ['storyButton','Gifting button','Explore gifting fragrances'], ['finalEyebrow','Final section eyebrow','The art of giving'],
    ['finalTitleStart','Final section heading','Give something'], ['finalTitleAccent','Final section accent','remembered.'],
  ],
  cart_before: [
    ['title','Cart page title','Your cart'], ['subtitle','Cart page subtitle','Review your fragrances before you checkout.'],
    ['emptyCart','Empty cart message','Your cart is empty.'], ['browsePerfumes','Browse button','Browse perfumes'],
    ['couponPlaceholder','Coupon field placeholder','Coupon code'], ['applyCoupon','Apply coupon button','Apply'], ['couponApplied','Coupon applied label','Coupon'], ['removeCoupon','Remove coupon button','Remove'],
    ['subtotal','Subtotal label','Subtotal'], ['discount','Discount label','Discount'], ['delivery','Delivery label','Delivery'], ['free','Free delivery label','Free'], ['total','Total label','Total'],
    ['estimatedDelivery','Estimated delivery label','Estimated delivery'], ['freeShippingRemaining','Free shipping remaining text','more for free delivery'],
    ['checkout','Checkout button','Checkout'], ['fixItems','Fix cart message','Please fix the items marked above to continue.'],
    ['unavailable','Unavailable line message','No longer available.'], ['soldOut','Sold out line message','Sold out.'], ['only','Limited stock prefix','Only'], ['left','Limited stock suffix','left.'], ['setTo','Set quantity action','Set to'], ['remove','Remove action','Remove'],
  ],
  checkout_before: [
    ['title','Checkout title','Checkout'], ['subtitle','Checkout subtitle','Securely complete your fragrance order.'],
    ['emptyCart','Empty cart message','Your cart is empty.'], ['browsePerfumes','Browse button','Browse perfumes'],
    ['fixItems','Cart warning','Some items in your cart need attention.'], ['reviewCart','Review cart link','Review your cart'],
    ['haveAccount','Sign-in prompt','Have an account?'], ['signIn','Sign in link','Sign in'],
    ['signInInfo','Sign-in information','to use your saved addresses and see this order in your account.'],
    ['contactHeading','Contact section heading','Contact'], ['fullName','Full name label','Full name'], ['phone','Phone label','Phone'],
    ['phoneHint','Phone helper text','We call or message this number about your order.'], ['email','Email label','Email'],
    ['deliveryHeading','Delivery section heading','Delivery address'], ['savedAddress','Saved address label','Use a saved address'],
    ['address','Address label','Address'], ['addressPlaceholder','Address placeholder','House, street, area'],
    ['apartment','Apartment label','Apartment, landmark (optional)'], ['city','City label','City'], ['postalCode','Postal code label','Postal code (optional)'],
    ['paymentHeading','Payment section heading','Payment'], ['codNote','Cash on delivery note','Pay in cash when your order arrives.'],
    ['bankTransferNote','Bank transfer note','We will show our bank account right after you place the order.'],
    ['orderSummary','Order summary heading','Order summary'], ['placeOrder','Place order button','Place order'], ['placingOrder','Order in progress button','Placing order…'],
    ['finalPriceNote','Final price note','Final price and stock are confirmed by our server when you place the order.'],
    ['validationError','Validation error','Please fix the highlighted fields.'], ['rateLimitError','Rate limit error','Too many attempts. Please wait a few minutes.'],
  ],
  track_before: [
    ['title','Track order title','Track your order'], ['subtitle','Track order subtitle','Enter your order number and the phone number you used at checkout.'],
    ['orderNumber','Order number label','Order number'], ['orderPlaceholder','Order number placeholder','AFS-000123'],
    ['phoneNumber','Phone number label','Phone number'], ['phonePlaceholder','Phone placeholder','0300 1234567'],
    ['trackButton','Track button','Track order'], ['checking','Checking label','Checking…'], ['payment','Payment label','Payment:'],
    ['rateLimitError','Rate limit error','Too many attempts. Please wait a few minutes.'],
  ],
  order_success: [
    ['title','Success title','Thank you for your order'], ['description','Success description','Your order number is'],
    ['keepToTrack','Tracking helper','Keep it to track your parcel.'], ['total','Total label','Total'], ['payment','Payment label','Payment'],
    ['trackOrder','Track order button','Track this order'], ['continueShopping','Continue shopping button','Continue shopping'],
    ['createAccount','Create account link','Create an account'], ['accountBenefit','Account helper','to check out faster next time.'],
  ],
  site_navigation: [
    ['announcementDefault','Default top announcement','COMPLIMENTARY DELIVERY ON ORDERS ABOVE PKR 7,500'], ['menuLabel','Mobile menu accessibility label','Menu'], ['searchLabel','Search accessibility label','Search'], ['accountLabel','Account accessibility label','My account'], ['loginLabel','Login accessibility label','Login / register'], ['cartLabel','Cart accessibility label','Cart'],
    ['marqueeDiscover','Top marquee message 1','DISCOVER YOUR SIGNATURE'], ['marqueeCrafted','Top marquee message 2','CRAFTED FOR MEMORIES'], ['marqueeCollection','Top marquee message 3','THE AFSANA PRIVATE COLLECTION'],
    ['searchEyebrow','Search eyebrow','The Afsana search'], ['searchTitle','Search heading','Search Afsana'],
    ['searchPlaceholder','Search placeholder','Search fragrances...'], ['searchButton','Search button','Search'],
    ['popularPathsTitle','Popular paths heading','Popular paths'], ['ritualTitle','Discovery panel heading','Find your ritual'],
    ['popularSignature','Popular search 1','Signature'], ['popularOud','Popular search 2','Oud'], ['popularFloral','Popular search 3','Floral'], ['popularFresh','Popular search 4','Fresh'],
    ['discoverCard','Discovery card 1','Discover your signature'], ['giftingCard','Discovery card 2','Choose a gift'], ['collectionCard','Discovery card 3','Explore the collection'],
  ],
  site_footer: [
    ['footerEyebrow','Footer brand eyebrow','THE HOUSE OF AFSANA'], ['footerDisplayBrand','Footer large brand name','AFSANA'],
    ['marquee1','Footer marquee 1','THE ART OF SCENT'], ['marquee2','Footer marquee 2','CRAFTED FOR MEMORIES'], ['marquee3','Footer marquee 3','AFSANA PERFUMES'], ['marquee4','Footer marquee 4','LEAVE A TRACE'], ['marquee5','Footer marquee 5','THE PRIVATE COLLECTION'],
    ['contactLabel','Contact block label','Afsana / Contact'], ['contactDescription','Contact block description','For fragrance questions, gifting help and order support, visit your account or explore the collection.'],
    ['customerCare','Customer care link','Customer care'], ['exploreHeading','Explore links heading','Explore'], ['customerHeading','Customer links heading','Customer'],
    ['collectionLink','Collection link','Collection'], ['houseLink','The House link','The House'], ['journalLink','Journal link','Journal'], ['giftingLink','Gifting link','Gifting'],
    ['trackLink','Track order link','Track order'], ['accountLink','Account link','Account'], ['fragranceCareLink','Fragrance care link','Fragrance care'], ['giftGuideLink','Gift guide link','Gift guide'],
    ['socialHeading','Social links heading','Follow the house'], ['socialHelp','Social links helper','Official links can be connected in the Footer settings in CMS.'],
    ['copyright','Copyright line','© 2026 AFSANA PERFUMES'], ['legalLine','Legal line','PRIVACY · TERMS · COOKIES'], ['footerTagline','Footer tagline','THE ART OF SCENT'],
  ],
};

export function pageCopyDefaults(pageKey) {
  return Object.fromEntries((PAGE_COPY_FIELDS[pageKey] || []).map(([key, , value]) => [key, value]));
}

export function resolvePageCopy(data, pageKey) {
  const defaults = pageCopyDefaults(pageKey);
  const sections = data?.pageSections?.[pageKey] || [];
  const config = [...sections].reverse().find((section) => section?.type === 'page_copy' && section?.isEnabled !== false)?.config || {};
  return { ...defaults, ...(config.copy && typeof config.copy === 'object' ? config.copy : {}) };
}

export function useCmsPageCopy(pageKey) {
  const { data } = useApi(() => cmsPublicApi.content(), [pageKey]);
  return resolvePageCopy(data, pageKey);
}

export function useCmsReferenceAssets() {
  const { data } = useApi(() => cmsPublicApi.content(), []);
  return (data?.homepageSections || []).find((section) => section?.type === 'reference_assets')?.config || {};
}
