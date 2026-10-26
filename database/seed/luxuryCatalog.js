const bcrypt = require('bcryptjs');
const { connectDB } = require('../connection');
const C = require('../constants');
const M = require('../models');

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function seedEverything() {
  await connectDB();

  // 1) Permissions
  const perms = [];
  for (const module of C.MODULES) for (const action of C.ACTIONS) {
    const key = `${module}.${action}`;
    perms.push({ updateOne: { filter: { key }, update: { $set: { key, module, action, isHighRisk: C.HIGH_RISK.includes(key) } }, upsert: true } });
  }
  await M.Permission.bulkWrite(perms);

  // 2) System Roles
  const all = (actions = C.ACTIONS, mods = C.MODULES) => mods.map((module) => ({ module, actions, scope: { kind: 'all' } }));
  const sensitive = ['roles', 'permissions', 'security', 'backup', 'accessScope', 'temporaryAccess', 'settings', 'payments'];
  const ops = ['dashboard', 'products', 'inventory', 'orders', 'shipping', 'returns', 'customers', 'reviews', 'coupons', 'notifications'];
  const roles = [
    { key: 'owner', name: 'Owner', level: C.ROLE_LEVEL.owner, isUnrestricted: true, grants: [] },
    { key: 'super_admin', name: 'Super Admin', level: C.ROLE_LEVEL.superAdmin, grants: all() },
    { key: 'admin', name: 'Admin', level: C.ROLE_LEVEL.admin, grants: all(C.ACTIONS, C.MODULES.filter((x) => !sensitive.includes(x))) },
    { key: 'manager', name: 'Manager', level: C.ROLE_LEVEL.manager, deniedFields: ['product.costPrice', 'order.profit'], grants: all(['view', 'create', 'edit', 'changeStatus'], ops) },
    { key: 'staff', name: 'Staff', level: C.ROLE_LEVEL.staff, deniedFields: ['product.costPrice', 'order.profit', 'customer.address'], grants: all(['view'], ['dashboard', 'orders', 'products']) },
  ];
  for (const r of roles) await M.Role.updateOne({ key: r.key }, { $set: { ...r, isSystem: true } }, { upsert: true });

  // 3) Owner Login (Admin)
  const ownerEmail = (process.env.ADMIN_EMAIL || 'admin@afsana.pk').toLowerCase();
  const ownerPw = process.env.ADMIN_PASSWORD || 'Admin@Afsana2026!';
  let ownerUser = await M.User.findOne({ email: ownerEmail });
  if (!ownerUser) {
    ownerUser = await M.User.create({
      kind: 'staff',
      email: ownerEmail,
      passwordHash: await bcrypt.hash(ownerPw, 12),
      status: 'Active',
      mustChangePassword: false,
    });
  }
  const ownerRole = await M.Role.findOne({ key: 'owner' });
  await M.Staff.updateOne(
    { userId: ownerUser._id },
    { $set: { userId: ownerUser._id, name: 'Afsana Creative Director', roleId: ownerRole._id, status: 'Active' } },
    { upsert: true }
  );

  // 4) Demo Customer Account
  const custEmail = 'customer@afsana.pk';
  let custUser = await M.User.findOne({ email: custEmail });
  let customerDoc = null;
  if (!custUser) {
    custUser = await M.User.create({
      kind: 'customer',
      email: custEmail,
      phone: '03001234567',
      passwordHash: await bcrypt.hash('Customer@2026!', 12),
      status: 'Active',
    });
  }
  customerDoc = await M.Customer.findOneAndUpdate(
    { userId: custUser._id },
    {
      $set: {
        userId: custUser._id,
        name: 'Zoya Al-Mansoor',
        email: custEmail,
        phone: '03001234567',
        group: 'VIP',
        shippingAddresses: [
          {
            label: 'Home',
            recipientName: 'Zoya Al-Mansoor',
            phone: '03001234567',
            streetAddress: 'House 42, Block G, Phase 5, DHA',
            city: 'Lahore',
            postalCode: '54000',
            isDefault: true,
          },
        ],
      },
    },
    { upsert: true, new: true }
  );

  // 5) Brands
  const brandPrive = await M.Brand.findOneAndUpdate(
    { slug: 'afsana-prive' },
    { $set: { name: 'Afsana Privé', slug: 'afsana-prive', description: 'Haute Parfumerie Artisanal Collection' } },
    { upsert: true, new: true }
  );

  // 6) Categories
  const categoriesData = [
    { name: 'Extrait de Parfum', slug: 'extrait-de-parfum', image: { url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1200&q=80' } },
    { name: 'Men', slug: 'men', image: { url: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1200&q=80' } },
    { name: 'Women', slug: 'women', image: { url: 'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=1200&q=80' } },
    { name: 'Unisex', slug: 'unisex', image: { url: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=1200&q=80' } },
    { name: 'Discovery Sets', slug: 'discovery-sets', image: { url: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1200&q=80' } },
  ];
  const catMap = {};
  for (const c of categoriesData) {
    const doc = await M.Category.findOneAndUpdate({ slug: c.slug }, { $set: c }, { upsert: true, new: true });
    catMap[c.slug] = doc;
  }

  // 7) Fragrance Families
  const familiesData = [
    { name: 'Oriental & Amber', slug: 'oriental-amber' },
    { name: 'Woody & Smoky', slug: 'woody-smoky' },
    { name: 'Floral & Rose', slug: 'floral-rose' },
    { name: 'Fresh & Citrus', slug: 'fresh-citrus' },
    { name: 'Leather & Tobacco', slug: 'leather-tobacco' },
  ];
  const famMap = {};
  for (const f of familiesData) {
    const doc = await M.FragranceFamily.findOneAndUpdate({ slug: f.slug }, { $set: f }, { upsert: true, new: true });
    famMap[f.slug] = doc;
  }

  // 8) Collections
  const colRoyal = await M.Collection.findOneAndUpdate(
    { slug: 'royal-heritage' },
    { $set: { name: 'Royal Heritage', slug: 'royal-heritage', description: 'Reinventing ancient imperial Arabian formulas' } },
    { upsert: true, new: true }
  );
  const colNuit = await M.Collection.findOneAndUpdate(
    { slug: 'nuit-noire' },
    { $set: { name: 'Nuit Noire', slug: 'nuit-noire', description: 'Hypnotic nocturnal extraits for black-tie soirees' } },
    { upsert: true, new: true }
  );

  // 9) Products
  const productsToSeed = [
    {
      name: "Sultan de L'Oud",
      slug: 'sultan-de-l-oud',
      sku: 'AFS-OUD-01',
      category: 'men',
      family: 'oriental-amber',
      gender: 'Men',
      collectionIds: [colRoyal._id],
      tags: ['Best Seller', 'Prestige Extrait', 'Winter Favorite'],
      concentration: 'Extrait de Parfum (32% Oil)',
      longevity: '16+ Hours',
      projection: 'Radiating & Seductive',
      seasons: ['Autumn', 'Winter', 'Evenings'],
      occasions: ['Gala Evenings', 'Weddings', 'Signature Statement'],
      notes: {
        top: ['Rare Kashmiri Saffron', 'Green Cardamom', 'Bergamot of Calabria'],
        heart: ['Royal Cambodian Aged Oud', 'Taif Rose Petals', 'Grated Nutmeg'],
        base: ['Smoked Birch Leather', 'Golden Ambergris', 'Indonesian Patchouli', 'Oakmoss'],
      },
      profile: { woody: 92, spicy: 84, sweetness: 35, freshness: 20, floral: 30 },
      media: [
        { kind: 'main', url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1000&q=85', alt: "Sultan de L'Oud Bottle" },
        { kind: 'gallery', url: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=1000&q=85', alt: "Sultan de L'Oud Essence" },
      ],
      content: {
        shortDescription: 'An imposing imperial Oud macerated for 18 months, crowned with saffron and warmed by smoky ambergris.',
        fullDescription: "Sultan de L'Oud represents the zenith of Afsana Haute Parfumerie. Sourced from ancient wild agarwood groves in Cambodia, this Extrait de Parfum marries intense animalic depth with the sublime sweetness of Taif rose and royal saffron. Designed for the connoisseur who commands the room without speaking a word.",
      },
      sizes: [
        { label: '50ml', sizeMl: 50, price: 8500, salePrice: 7900, costPrice: 3800, stock: 35 },
        { label: '100ml', sizeMl: 100, price: 14200, salePrice: 12900, costPrice: 6200, stock: 20 },
      ],
      ratingAvg: 4.9,
      ratingCount: 38,
    },
    {
      name: 'Velvet Rose & Santal',
      slug: 'velvet-rose-santal',
      sku: 'AFS-ROSE-02',
      category: 'women',
      family: 'floral-rose',
      gender: 'Women',
      collectionIds: [colNuit._id],
      tags: ['Most Loved', 'New Arrival', 'Signature'],
      concentration: 'Extrait de Parfum (28% Oil)',
      longevity: '14 Hours',
      projection: 'Enchanting & Elegant',
      seasons: ['All Seasons', 'Evenings'],
      occasions: ['Romantic Dinners', 'Celebrations', 'Luxury Daily'],
      notes: {
        top: ['Bulgarian Rosewater', 'Pink Baies Pepper', 'Frosted Lychee'],
        heart: ['Damascena Rose Absolute', 'Grasse Peony', 'Dewy Magnolia'],
        base: ['Mysore Sandalwood', 'Bourbon Vanilla Bean', 'Crystalline Amber', 'Cashmere Musk'],
      },
      profile: { floral: 95, sweetness: 68, woody: 55, freshness: 45, spicy: 25 },
      media: [
        { kind: 'main', url: 'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=1000&q=85', alt: 'Velvet Rose & Santal' },
        { kind: 'gallery', url: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1000&q=85', alt: 'Rose Detail' },
      ],
      content: {
        shortDescription: 'Lush Damascena roses enveloped in creamy sandalwood and intoxicating Bourbon vanilla.',
        fullDescription: 'Velvet Rose & Santal is pure sensory poetry. Opening with effervescent pink pepper and sparkling lychee, it quickly reveals a velvety heart of hand-harvested roses. The dry-down settles into warm, creamy Mysore sandalwood that leaves an unforgettable sillage behind you.',
      },
      sizes: [
        { label: '50ml', sizeMl: 50, price: 7200, salePrice: 6800, costPrice: 3200, stock: 40 },
        { label: '100ml', sizeMl: 100, price: 11900, salePrice: 10900, costPrice: 5200, stock: 25 },
      ],
      ratingAvg: 4.95,
      ratingCount: 42,
    },
    {
      name: 'Amber Nuit Impérial',
      slug: 'amber-nuit-imperial',
      sku: 'AFS-AMB-03',
      category: 'unisex',
      family: 'oriental-amber',
      gender: 'Unisex',
      collectionIds: [colRoyal._id, colNuit._id],
      tags: ['Best Seller', 'Prestige Extrait'],
      concentration: 'Extrait de Parfum (30% Oil)',
      longevity: '15 Hours',
      projection: 'Magnetic & Enveloping',
      seasons: ['Autumn', 'Winter', 'Spring Evenings'],
      occasions: ['Formal Evenings', 'Cocktails', 'Night Outs'],
      notes: {
        top: ['Sun-warmed Bergamot', 'Coriander Seed', 'Bitter Almond'],
        heart: ['Golden Amber Resin', 'Benzoin Tears of Siam', 'Incense Labdanum'],
        base: ['Madagascar Tonka Bean', 'Dark Vanilla Infusion', 'Atlas Cedarwood'],
      },
      profile: { sweetness: 72, woody: 68, spicy: 60, freshness: 30, floral: 20 },
      media: [
        { kind: 'main', url: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1000&q=85', alt: 'Amber Nuit Imperial' },
        { kind: 'gallery', url: 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=1000&q=85', alt: 'Amber Bottle' },
      ],
      content: {
        shortDescription: 'Golden liquid amber crystallized with tears of benzoin, roasted tonka, and spiced cedar.',
        fullDescription: 'Amber Nuit Impérial is warm, opulent, and dangerously addictive. It captures the essence of velvet twilight over majestic palatial courtyards. Golden resins harmonize with toasted tonka and warm spices to create an aura of pure luxury.',
      },
      sizes: [
        { label: '50ml', sizeMl: 50, price: 7800, salePrice: 7200, costPrice: 3500, stock: 30 },
        { label: '100ml', sizeMl: 100, price: 12800, salePrice: 11800, costPrice: 5800, stock: 18 },
      ],
      ratingAvg: 4.88,
      ratingCount: 29,
    },
    {
      name: 'Tobacco Vanille Intense',
      slug: 'tobacco-vanille-intense',
      sku: 'AFS-TOB-04',
      category: 'men',
      family: 'leather-tobacco',
      gender: 'Men',
      collectionIds: [colNuit._id],
      tags: ['Iconic', 'Bold'],
      concentration: 'Extrait de Parfum (30% Oil)',
      longevity: '16 Hours',
      projection: 'Room-Filling & Rich',
      seasons: ['Winter', 'Chilly Autumn'],
      occasions: ['Private Lounge', 'VIP Events', 'Black Tie'],
      notes: {
        top: ['Sun-cured Tobacco Leaf', 'Spiced Ginger', 'Star Anise'],
        heart: ['Criollo Cacao Pod', 'Rich Tonka', 'Tobacco Blossom', 'Sweet Prunes'],
        base: ['Pure Bourbon Vanilla', 'Cedarwood Sap', 'Smoked Honey Accord'],
      },
      profile: { spicy: 88, woody: 75, sweetness: 65, freshness: 15, floral: 15 },
      media: [
        { kind: 'main', url: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1000&q=85', alt: 'Tobacco Vanille' },
        { kind: 'gallery', url: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=1000&q=85', alt: 'Tobacco Notes' },
      ],
      content: {
        shortDescription: 'Rich cured Cuban tobacco leaves steeped in cacao, spiced honey, and smoked vanilla.',
        fullDescription: 'Tobacco Vanille Intense is an intoxicating olfactory tour-de-force. Rich, aromatic tobacco leaves blend effortlessly with roasted tonka beans, bitter cocoa, and unctuous Madagascar vanilla. Warm, commanding, and timeless.',
      },
      sizes: [
        { label: '50ml', sizeMl: 50, price: 8200, costPrice: 3600, stock: 25 },
        { label: '100ml', sizeMl: 100, price: 13800, costPrice: 6100, stock: 15 },
      ],
      ratingAvg: 4.92,
      ratingCount: 31,
    },
    {
      name: 'Blanc de Musc & Poire',
      slug: 'blanc-de-musc-poire',
      sku: 'AFS-MUSC-05',
      category: 'women',
      family: 'fresh-citrus',
      gender: 'Women',
      collectionIds: [],
      tags: ['Fresh Signature', 'Office Scent', 'Under 7000'],
      concentration: 'Eau de Parfum Intense',
      longevity: '10 Hours',
      projection: 'Soft & Radiantly Clean',
      seasons: ['Spring', 'Summer', 'Daily'],
      occasions: ['Daily Signature', 'High Tea', 'Boardroom Elegance'],
      notes: {
        top: ['Crisp Nashi Pear', 'Bergamot Zest', 'Morning White Tea'],
        heart: ['Florentine Iris Concrete', 'Wild Lily of the Valley', 'Freesia'],
        base: ['Silken White Musk', 'Cashmeran Wood', 'Blonde Cedar'],
      },
      profile: { freshness: 85, floral: 75, sweetness: 45, woody: 40, spicy: 10 },
      media: [
        { kind: 'main', url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1000&q=85', alt: 'Blanc de Musc' },
      ],
      content: {
        shortDescription: 'Crystalline white musk softened by juicy Asian pear nectar and powdery Florentine iris.',
        fullDescription: 'An angelic aura of pure cleanliness and refined sensuality. Blanc de Musc floats on the skin like sheer silk satin, providing effortless grace that lingers softly throughout the entire day.',
      },
      sizes: [
        { label: '50ml', sizeMl: 50, price: 6400, salePrice: 5800, costPrice: 2800, stock: 45 },
        { label: '100ml', sizeMl: 100, price: 10800, salePrice: 9800, costPrice: 4700, stock: 25 },
      ],
      ratingAvg: 4.85,
      ratingCount: 22,
    },
    {
      name: 'Cuir Noir & Iris',
      slug: 'cuir-noir-iris',
      sku: 'AFS-CUIR-06',
      category: 'unisex',
      family: 'woody-smoky',
      gender: 'Unisex',
      collectionIds: [colRoyal._id],
      tags: ['Limited Edition', 'Connoisseur Pick'],
      concentration: 'Extrait de Parfum (32% Oil)',
      longevity: '15 Hours',
      projection: 'Dark & Magnetic',
      seasons: ['Autumn', 'Winter'],
      occasions: ['Gallery Openings', 'Cocktail Soirees', 'Night Travel'],
      notes: {
        top: ['French Violet Leaf', 'Wild Mountain Thyme', 'Cardamom Pod'],
        heart: ['Tuscan Black Suede', 'Orris Butter', 'Dark Raspberry'],
        base: ['Smoked Birch Tar', 'Frankincense Tears', 'Bourbon Vetiver'],
      },
      profile: { woody: 88, spicy: 70, floral: 40, sweetness: 30, freshness: 25 },
      media: [
        { kind: 'main', url: 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=1000&q=85', alt: 'Cuir Noir Bottle' },
      ],
      content: {
        shortDescription: 'Velvety Tuscan leather draped over noble orris butter, shaded with tart wild raspberry.',
        fullDescription: 'Cuir Noir is unapologetic luxury. The fragrance contrasts the butter-soft texture of black glove leather against the powdery majesty of Italian orris root and a touch of tart wild berries.',
      },
      sizes: [
        { label: '50ml', sizeMl: 50, price: 8900, costPrice: 3900, stock: 20 },
        { label: '100ml', sizeMl: 100, price: 14800, costPrice: 6500, stock: 12 },
      ],
      ratingAvg: 4.96,
      ratingCount: 19,
    },
    {
      name: 'Neroli Riviera Royale',
      slug: 'neroli-riviera-royale',
      sku: 'AFS-NER-07',
      category: 'unisex',
      family: 'fresh-citrus',
      gender: 'Unisex',
      collectionIds: [],
      tags: ['Summer Sensation', 'Citrus Masterpiece'],
      concentration: 'Eau de Parfum Concentrée',
      longevity: '10 Hours',
      projection: 'Sparkling & Effervescent',
      seasons: ['Spring', 'Summer'],
      occasions: ['Daytime Casual', 'Brunch', 'Summer Vacation'],
      notes: {
        top: ['Calabrian Bergamot', 'Primofiore Lemon', 'Blood Orange'],
        heart: ['Tunisian Neroli Blossoms', 'Orange Flower Absolute', 'Sambac Jasmine'],
        base: ['Crisp Ambergris Accord', 'Driftwood', 'Solar White Musk'],
      },
      profile: { freshness: 95, floral: 65, citrus: 90, sweetness: 30, woody: 35 },
      media: [
        { kind: 'main', url: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=1000&q=85', alt: 'Neroli Riviera' },
      ],
      content: {
        shortDescription: 'Sun-drenched Mediterranean neroli blossoms infused with sparkling Italian citrus and salty sea amber.',
        fullDescription: 'A breath of fresh sea air over coastal citrus groves. Neroli Riviera Royale sparkles with joyful optimism, capturing the essence of golden hour over turquoise waters.',
      },
      sizes: [
        { label: '50ml', sizeMl: 50, price: 6200, salePrice: 5600, costPrice: 2600, stock: 40 },
        { label: '100ml', sizeMl: 100, price: 10200, salePrice: 9400, costPrice: 4400, stock: 20 },
      ],
      ratingAvg: 4.86,
      ratingCount: 24,
    },
    {
      name: 'The Imperial Discovery Set',
      slug: 'the-imperial-discovery-set',
      sku: 'AFS-SET-08',
      category: 'discovery-sets',
      family: 'oriental-amber',
      gender: 'Unisex',
      collectionIds: [colRoyal._id],
      tags: ['Gift Ready', 'Sampler Set', 'Best Value'],
      concentration: 'Extrait de Parfum (5x 10ml Coffret)',
      longevity: '14+ Hours',
      projection: 'Various',
      seasons: ['All Seasons'],
      occasions: ['Gifting', 'Travel Companion', 'Fragrance Discovery'],
      notes: {
        top: ['Includes Sultan de L\'Oud', 'Velvet Rose & Santal', 'Amber Nuit Impérial'],
        heart: ['Plus Tobacco Vanille Intense', 'and Cuir Noir & Iris'],
        base: ['Presented in bespoke lacquered wooden coffret'],
      },
      profile: { woody: 80, spicy: 80, floral: 60, sweetness: 60, freshness: 60 },
      media: [
        { kind: 'main', url: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1000&q=85', alt: 'Discovery Set Coffret' },
      ],
      content: {
        shortDescription: 'Five 10ml travel extraits in a hand-crafted presentation coffret with voucher towards your first full bottle.',
        fullDescription: 'The ultimate luxury introduction to Afsana Haute Parfumerie. Experience our five most legendary creations in travel-friendly 10ml spray vials. Includes a PKR 2,000 certificate redeemable against your first 100ml flacon.',
      },
      sizes: [
        { label: '5x10ml Coffret', sizeMl: 50, price: 6900, costPrice: 2900, stock: 50 },
      ],
      ratingAvg: 4.98,
      ratingCount: 52,
    },
  ];

  const createdProducts = [];
  for (const item of productsToSeed) {
    const cat = catMap[item.category] || catMap['extrait-de-parfum'];
    const fam = famMap[item.family] || famMap['oriental-amber'];

    let p = await M.Product.findOne({ slug: item.slug });
    const productData = {
      name: item.name,
      slug: item.slug,
      sku: item.sku,
      brandId: brandPrive._id,
      categoryId: cat._id,
      collectionIds: item.collectionIds,
      status: 'Active',
      fragrance: {
        familyId: fam._id,
        gender: item.gender,
        concentration: item.concentration,
        longevity: item.longevity,
        projection: item.projection,
        seasons: item.seasons,
        occasions: item.occasions,
      },
      notes: item.notes,
      profile: item.profile,
      media: item.media,
      content: item.content,
      seo: {
        title: `${item.name} | Afsana Haute Parfumerie`,
        metaDescription: item.content.shortDescription,
        keywords: [item.name, 'perfume', 'luxury fragrance', 'extrait de parfum', item.gender],
      },
      tags: item.tags,
      priceFrom: Math.min(...item.sizes.map((s) => s.salePrice || s.price)),
      ratingAvg: item.ratingAvg,
      ratingCount: item.ratingCount,
    };

    if (!p) {
      p = await M.Product.create(productData);
    } else {
      await M.Product.updateOne({ _id: p._id }, { $set: productData });
    }
    createdProducts.push(p);

    // Variants and stock
    for (const vData of item.sizes) {
      const vSku = `${p.sku}-${vData.sizeMl}`;
      let variant = await M.ProductVariant.findOne({ sku: vSku });
      const variantPayload = {
        productId: p._id,
        sku: vSku,
        label: vData.label,
        sizeMl: vData.sizeMl,
        price: vData.price,
        salePrice: vData.salePrice,
        costPrice: vData.costPrice,
        isActive: true,
      };
      if (!variant) {
        variant = await M.ProductVariant.create(variantPayload);
      } else {
        await M.ProductVariant.updateOne({ _id: variant._id }, { $set: variantPayload });
      }

      await M.Inventory.findOneAndUpdate(
        { variantId: variant._id },
        {
          $set: {
            variantId: variant._id,
            productId: p._id,
            current: vData.stock,
            reserved: 0,
            lowStockThreshold: 5,
          },
        },
        { upsert: true }
      );
    }
  }

  // 10) Settings
  const defaultSettings = [
    {
      key: 'store',
      value: {
        name: 'Afsana Haute Parfumerie',
        tagline: 'Artisanal Extraits de Parfum & Haute Fragrances',
        phone: '+92 300 123 4567',
        whatsapp: '+92 300 123 4567',
        email: 'concierge@afsana.pk',
        address: 'Flagship Salon: Gulberg Galleria, Main Boulevard, Gulberg III, Lahore, Pakistan',
        instagram: 'https://instagram.com/afsanaperfumes',
        facebook: 'https://facebook.com/afsanaperfumes',
      },
    },
    {
      key: 'bank',
      value: {
        enabled: true,
        bankName: 'Meezan Bank Limited',
        accountTitle: 'Afsana Luxury Goods Private Limited',
        accountNumber: '02010108927162',
        iban: 'PK45MEZN0002010108927162',
        branch: 'Gulberg Galleria Branch, Lahore',
        instructions: 'Please transfer the exact amount within 24 hours and share transaction receipt with Order Number on WhatsApp: +92 300 123 4567.',
      },
    },
    {
      key: 'shipping',
      value: { flatRate: 250, freeAbove: 5000 },
    },
    {
      key: 'returns',
      value: { windowDays: 7 },
    },
  ];
  for (const s of defaultSettings) {
    await M.Setting.updateOne({ key: s.key }, { $set: { key: s.key, value: s.value } }, { upsert: true });
  }

  // 11) Coupons
  const coupons = [
    {
      code: 'WELCOME10',
      type: 'percentage',
      value: 10,
      minOrder: 2000,
      maxDiscount: 1500,
      usageLimit: 1000,
      startsAt: new Date(Date.now() - 86400000),
      expiresAt: new Date(Date.now() + 90 * 86400000),
      isActive: true,
    },
    {
      code: 'LUXURY500',
      type: 'fixed',
      value: 500,
      minOrder: 4000,
      usageLimit: 500,
      startsAt: new Date(Date.now() - 86400000),
      expiresAt: new Date(Date.now() + 60 * 86400000),
      isActive: true,
    },
    {
      code: 'FREESHIP',
      type: 'free_shipping',
      value: 0,
      minOrder: 3000,
      usageLimit: 2000,
      startsAt: new Date(Date.now() - 86400000),
      expiresAt: new Date(Date.now() + 180 * 86400000),
      isActive: true,
    },
  ];
  for (const c of coupons) {
    await M.Coupon.updateOne({ code: c.code }, { $set: c }, { upsert: true });
  }

  // 12) CMS Banners
  await M.Banner.deleteMany({});
  await M.Banner.create({
    heading: 'The Art of Haute Parfumerie',
    subtitle: 'Hand-crafted Extraits de Parfum with rare French Taif rose, Cambodian wild agarwood, and crystallised ambergris.',
    buttonText: 'Explore Collection',
    buttonLink: '/shop',
    desktopImage: { url: 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=1920&q=85', alt: 'Afsana Perfume Bottle' },
    mobileImage: { url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1080&q=85', alt: 'Afsana Fragrance' },
    startsAt: new Date(Date.now() - 86400000),
    endsAt: new Date(Date.now() + 365 * 86400000),
    isActive: true,
    sortOrder: 1,
  });

  // 13) CMS Announcement
  await M.Announcement.deleteMany({});
  await M.Announcement.create({
    text: 'Complimentary Express Courier Across Pakistan & 2 Luxury Discovery Samples with Every Flacon',
    link: '/shop',
    isActive: true,
    startsAt: new Date(Date.now() - 86400000),
    endsAt: new Date(Date.now() + 365 * 86400000),
  });

  // 14) CMS FAQs
  await M.Faq.deleteMany({});
  const faqs = [
    {
      question: 'What is the oil concentration of Afsana Extraits de Parfum?',
      answer: 'Our flagship creations are Extrait de Parfum concentration (28% to 32% pure fragrant oils and absolutes), which delivers an exceptional 12 to 16+ hours of longevity and radiating projection.',
      sortOrder: 1,
      isActive: true,
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept Cash on Delivery (COD) anywhere in Pakistan, as well as Direct Bank Transfer (Meezan Bank, HBL, Allied Bank). All bank transfer orders receive immediate priority handling.',
      sortOrder: 2,
      isActive: true,
    },
    {
      question: 'How long does delivery take across Pakistan?',
      answer: 'Orders for Lahore, Karachi, and Islamabad / Rawalpindi are delivered within 24 to 48 hours via premium express couriers. Other cities and regions are delivered within 2 to 4 business days in tamper-evident luxury packaging.',
      sortOrder: 3,
      isActive: true,
    },
    {
      question: 'What is your return and satisfaction policy?',
      answer: 'Every full bottle is shipped with a complimentary 2ml sample vial of the same scent. We invite you to test the sample first. If you decide the fragrance is not for you, you may return the unopened full flacon within 7 days for a 100% full refund.',
      sortOrder: 4,
      isActive: true,
    },
  ];
  for (const f of faqs) await M.Faq.create(f);

  // 15) Verified Reviews
  if (createdProducts.length > 0 && customerDoc) {
    await M.Review.deleteMany({});
    const sampleReviews = [
      {
        product: createdProducts[0],
        rating: 5,
        title: 'Masterpiece of modern Oud',
        text: 'The Cambodian Oud is dark, majestic and velvety. I received compliments from colleagues hours after application. Truly rivals Roja and Clive Christian.',
      },
      {
        product: createdProducts[1],
        rating: 5,
        title: 'Most compliments I have ever received',
        text: 'Velvet Rose & Santal is breathtaking. The rose is fresh and dewy, and the sandalwood dry-down is utterly intoxicating. My new signature scent.',
      },
      {
        product: createdProducts[2],
        rating: 5,
        title: 'Pure liquid gold',
        text: 'Rich, warming amber with subtle vanilla nuances. It leaves a magnetic trail behind you that lasts well past midnight.',
      },
      {
        product: createdProducts[3],
        rating: 5,
        title: 'Rich, masculine and aristocratic',
        text: 'Reminds me of Tom Ford Tobacco Vanille but smoother with darker cacao and spiced honey. Fantastic longevity on woolen blazers.',
      },
    ];
    for (const r of sampleReviews) {
      await M.Review.create({
        productId: r.product._id,
        customerId: customerDoc._id,
        rating: r.rating,
        title: r.title,
        text: r.text,
        status: 'Approved',
        moderatedBy: ownerUser._id,
      });
    }
  }

  // 16) Shipping Couriers & Zones
  await M.Courier.deleteMany({});
  await M.Courier.create([
    { name: 'TCS Express', trackingUrlTemplate: 'https://www.tcsexpress.com/track/{trackingNumber}', defaultForCOD: true, isActive: true },
    { name: 'Leopards Courier', trackingUrlTemplate: 'https://leopardscourier.com/tracking/{trackingNumber}', defaultForCOD: false, isActive: true },
  ]);

  await M.ShippingRate.deleteMany({});
  await M.ShippingRate.create([
    {
      zone: {
        name: 'Major Metros (Lahore, Karachi, Islamabad, Rawalpindi)',
        cities: ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi'],
      },
      method: 'Standard Express',
      baseRate: 200,
      freeAbove: 4000,
      estDays: '1-2 Days',
      isActive: true,
    },
    {
      zone: {
        name: 'Nationwide All Cities',
        cities: ['Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala', 'Hyderabad', 'Abbottabad'],
      },
      method: 'Standard Express',
      baseRate: 250,
      freeAbove: 5000,
      estDays: '2-4 Days',
      isActive: true,
    },
  ]);

  console.log('[Seed] Luxury Afsana Catalog & System seeded successfully.');
}

module.exports = { seedEverything };
if (require.main === module) {
  seedEverything().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
}
