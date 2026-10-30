const mongoose = require('mongoose');
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;
const { storeScoped, softDelete, model: m } = require('./_plugins');
const model = (n, s) => m(mongoose, n, s);

const bannerSchema = new Schema({
  desktopImage: { url: String, alt: String }, mobileImage: { url: String, alt: String }, // 1920x700 / 1080x1350
  heading: String, subtitle: String, buttonText: String, buttonLink: String,
  startsAt: Date, endsAt: Date, isActive: { type: Boolean, default: true }, sortOrder: { type: Number, default: 0 },
}, { timestamps: true });
storeScoped(bannerSchema); softDelete(bannerSchema);
bannerSchema.index({ isDeleted: 1, isActive: 1, sortOrder: 1, createdAt: -1 });

const homepageSectionSchema = new Schema({
  type: { type: String, enum: ['hero','featured_collection','best_sellers','new_arrivals','under_2000','gift_boxes','testimonials','instagram','newsletter','video_banner','video_grid','image_banner','split_story','benefits','category_tiles','marquee','trust_grid','cinematic_statement','lookbook','values_grid','blog_grid','post_grid','promo_timer','offer_timer','community_pulse','footer_showcase','muse_scene','product_3d_showcase','fragrance_dna','interactive_gallery','scent_finder','rich_text','faq','spacer','whatsapp_float','ai_concierge'], required: true },
  title: String, pageKey: { type: String, enum: ['home','site_navigation','site_header_after','collection_before','collection_after','product_before','product_after','house','journal','gifting','cart_before','cart_after','checkout_before','checkout_after','track_before','track_after','site_footer_before'], default: 'home', index: true }, config: Schema.Types.Mixed, // e.g. { collectionId, limit }
  sortOrder: { type: Number, default: 0, index: true }, isEnabled: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false }, deletedAt: Date, deletedBy: ObjectId,
}, { timestamps: true });
storeScoped(homepageSectionSchema);
homepageSectionSchema.index({ storeId: 1, isEnabled: 1, sortOrder: 1, createdAt: 1 });

const menuItemSchema = new Schema({ label: String, url: String, visible: { type: Boolean, default: true }, position: Number }, { _id: true });
menuItemSchema.add({ children: [new Schema({ label: String, url: String, visible: { type: Boolean, default: true }, position: Number })] });
const menuSchema = new Schema({
  key: { type: String, required: true, unique: true }, // 'main', 'footer', 'mega'
  items: [menuItemSchema],
}, { timestamps: true });

const pageSchema = new Schema({
  slug: { type: String, required: true, unique: true }, title: String, body: String,
  seo: { title: String, description: String }, isPublished: { type: Boolean, default: false },
}, { timestamps: true });
softDelete(pageSchema);

const faqSchema = new Schema({ question: String, answer: String, sortOrder: { type: Number, default: 0, index: true }, isActive: { type: Boolean, default: true } }, { timestamps: true });
faqSchema.index({ isActive: 1, sortOrder: 1, createdAt: 1 });

const announcementSchema = new Schema({ text: String, link: String, startsAt: Date, endsAt: Date, isActive: { type: Boolean, default: true } }, { timestamps: true });
announcementSchema.index({ isActive: 1, createdAt: -1 });

const emailTemplateSchema = new Schema({
  event: { type: String, required: true, unique: true }, // order_confirmation, order_shipped...
  subject: String, bodyHtml: String, isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = {
  Banner: model('Banner', bannerSchema), HomepageSection: model('HomepageSection', homepageSectionSchema),
  Menu: model('Menu', menuSchema), Page: model('Page', pageSchema), Faq: model('Faq', faqSchema),
  Announcement: model('Announcement', announcementSchema), EmailTemplate: model('EmailTemplate', emailTemplateSchema),
};
