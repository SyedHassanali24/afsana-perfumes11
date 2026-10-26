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

const homepageSectionSchema = new Schema({
  type: { type: String, enum: ['hero', 'featured_collection', 'best_sellers', 'new_arrivals', 'under_2000', 'gift_boxes', 'testimonials', 'instagram', 'newsletter'], required: true },
  title: String, config: Schema.Types.Mixed, // e.g. { collectionId, limit }
  sortOrder: { type: Number, default: 0, index: true }, isEnabled: { type: Boolean, default: true },
}, { timestamps: true });
storeScoped(homepageSectionSchema);

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

const faqSchema = new Schema({ question: String, answer: String, sortOrder: { type: Number, default: 0 }, isActive: { type: Boolean, default: true } }, { timestamps: true });
const announcementSchema = new Schema({ text: String, link: String, startsAt: Date, endsAt: Date, isActive: { type: Boolean, default: true } }, { timestamps: true });
const emailTemplateSchema = new Schema({
  event: { type: String, required: true, unique: true }, // order_confirmation, order_shipped...
  subject: String, bodyHtml: String, isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = {
  Banner: model('Banner', bannerSchema), HomepageSection: model('HomepageSection', homepageSectionSchema),
  Menu: model('Menu', menuSchema), Page: model('Page', pageSchema), Faq: model('Faq', faqSchema),
  Announcement: model('Announcement', announcementSchema), EmailTemplate: model('EmailTemplate', emailTemplateSchema),
};
