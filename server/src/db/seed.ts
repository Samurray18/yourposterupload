/**
 * Idempotent seed. Safe to run repeatedly: categories are upserted by slug and
 * products by slug, and denominations are fully replaced for seeded products so
 * price edits you make in the admin dashboard are only overwritten when you
 * re-run this with `--force-prices`.
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, withTransaction } from './pool.js';
import { migrate } from './migrate.js';
import { defaultSettings } from '../services/settings.js';

interface SeedDenomination {
  label: string;
  faceValue: string | null;
  priceDzd: number;
  comparePriceDzd?: number;
  stockStatus?: 'in_stock' | 'out_of_stock';
}

interface SeedProduct {
  slug: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  deliverySpeed: 'instant' | 'few_hours' | 'manual';
  isFeatured?: boolean;
  popularity?: number;
  denominations: SeedDenomination[];
}

const categories = [
  {
    slug: 'gaming-topups',
    name: 'Gaming Top-ups',
    nameFr: 'Recharges de jeux',
    description: 'In-game currency and items delivered straight to your account ID.',
  },
  {
    slug: 'gift-cards',
    name: 'Gift Cards',
    nameFr: 'Cartes cadeaux',
    description: 'Store credit for the platforms you already use.',
  },
  {
    slug: 'software-keys',
    name: 'Software Keys',
    nameFr: 'Clés logicielles',
    description: 'Genuine licences for Windows, Office, antivirus and more.',
  },
  {
    slug: 'subscriptions',
    name: 'Subscriptions',
    nameFr: 'Abonnements',
    description: 'Monthly and yearly plans billed in DZD, no foreign card needed.',
  },
];

// Prices are placeholders representing "best verified price" — replace them with
// your real sourced numbers from the admin dashboard.
const products: SeedProduct[] = [
  {
    slug: 'steam-wallet',
    name: 'Steam Wallet Code',
    category: 'gift-cards',
    description:
      'Add funds to any Steam wallet and spend on games, DLC and seasonal sales. The code is region-free and redeemable on any Steam account.',
    imageUrl: '/images/steam.svg',
    deliverySpeed: 'instant',
    isFeatured: true,
    popularity: 98,
    denominations: [
      { label: '5 USD', faceValue: '5', priceDzd: 700, comparePriceDzd: 800 },
      { label: '10 USD', faceValue: '10', priceDzd: 1350, comparePriceDzd: 1500 },
      { label: '25 USD', faceValue: '25', priceDzd: 3250, comparePriceDzd: 3600 },
      { label: '50 USD', faceValue: '50', priceDzd: 6350, comparePriceDzd: 7000 },
      { label: '100 USD', faceValue: '100', priceDzd: 12500, comparePriceDzd: 14000 },
    ],
  },
  {
    slug: 'playstation-store',
    name: 'PlayStation Store Card',
    category: 'gift-cards',
    description:
      'Top up your PlayStation Store balance for PS4 and PS5 games, add-ons and PS Plus subscriptions.',
    imageUrl: '/images/playstation.svg',
    deliverySpeed: 'instant',
    isFeatured: true,
    popularity: 95,
    denominations: [
      { label: '10 USD', faceValue: '10', priceDzd: 1400, comparePriceDzd: 1550 },
      { label: '25 USD', faceValue: '25', priceDzd: 3350, comparePriceDzd: 3700 },
      { label: '50 USD', faceValue: '50', priceDzd: 6550, comparePriceDzd: 7200 },
      { label: '100 USD', faceValue: '100', priceDzd: 12900, comparePriceDzd: 14200 },
    ],
  },
  {
    slug: 'google-play',
    name: 'Google Play Gift Card',
    category: 'gift-cards',
    description:
      'Credit for apps, games, in-app purchases and subscriptions on the Google Play Store.',
    imageUrl: '/images/google-play.svg',
    deliverySpeed: 'instant',
    isFeatured: true,
    popularity: 92,
    denominations: [
      { label: '5 USD', faceValue: '5', priceDzd: 720, comparePriceDzd: 850 },
      { label: '10 USD', faceValue: '10', priceDzd: 1380, comparePriceDzd: 1600 },
      { label: '25 USD', faceValue: '25', priceDzd: 3300, comparePriceDzd: 3800 },
      { label: '50 USD', faceValue: '50', priceDzd: 6450, comparePriceDzd: 7400 },
    ],
  },
  {
    slug: 'xbox-gift-card',
    name: 'Xbox Gift Card',
    category: 'gift-cards',
    description: 'Credit for Xbox, Game Pass and Microsoft Store purchases.',
    imageUrl: '/images/xbox.svg',
    deliverySpeed: 'instant',
    popularity: 78,
    denominations: [
      { label: '10 USD', faceValue: '10', priceDzd: 1420, comparePriceDzd: 1600 },
      { label: '25 USD', faceValue: '25', priceDzd: 3400, comparePriceDzd: 3900 },
      { label: '50 USD', faceValue: '50', priceDzd: 6600, comparePriceDzd: 7500 },
    ],
  },
  {
    slug: 'pubg-mobile-uc',
    name: 'PUBG Mobile UC',
    category: 'gaming-topups',
    description:
      'Unknown Cash delivered straight to your PUBG Mobile player ID. Send us the numeric ID only — never your account password.',
    imageUrl: '/images/pubg.svg',
    deliverySpeed: 'few_hours',
    isFeatured: true,
    popularity: 99,
    denominations: [
      { label: '60 UC', faceValue: '60', priceDzd: 130 },
      { label: '325 UC', faceValue: '325', priceDzd: 690, comparePriceDzd: 750 },
      { label: '660 UC', faceValue: '660', priceDzd: 1380, comparePriceDzd: 1500 },
      { label: '1800 UC', faceValue: '1800', priceDzd: 3700, comparePriceDzd: 4100 },
      { label: '3850 UC', faceValue: '3850', priceDzd: 7800, comparePriceDzd: 8600 },
    ],
  },
  {
    slug: 'free-fire-diamonds',
    name: 'Free Fire Diamonds',
    category: 'gaming-topups',
    description: 'Diamonds credited to your Free Fire account ID, valid on all servers.',
    imageUrl: '/images/free-fire.svg',
    deliverySpeed: 'few_hours',
    popularity: 94,
    denominations: [
      { label: '100 Diamonds', faceValue: '100', priceDzd: 180 },
      { label: '520 Diamonds', faceValue: '520', priceDzd: 900, comparePriceDzd: 1000 },
      { label: '1080 Diamonds', faceValue: '1080', priceDzd: 1850, comparePriceDzd: 2100 },
      { label: '2200 Diamonds', faceValue: '2200', priceDzd: 3700, comparePriceDzd: 4200 },
    ],
  },
  {
    slug: 'mobile-legends-diamonds',
    name: 'Mobile Legends Diamonds',
    category: 'gaming-topups',
    description: 'Diamond top-up for Mobile Legends: Bang Bang via your user ID.',
    imageUrl: '/images/mlbb.svg',
    deliverySpeed: 'few_hours',
    popularity: 85,
    denominations: [
      { label: '86 Diamonds', faceValue: '86', priceDzd: 160 },
      { label: '172 Diamonds', faceValue: '172', priceDzd: 310 },
      { label: '706 Diamonds', faceValue: '706', priceDzd: 1250, comparePriceDzd: 1400 },
      { label: '2195 Diamonds', faceValue: '2195', priceDzd: 3800, comparePriceDzd: 4300 },
    ],
  },
  {
    slug: 'windows-11-pro',
    name: 'Windows 11 Pro Retail Key',
    category: 'software-keys',
    description:
      'Genuine retail activation key delivered to your email. Supports all editions, permanently activated on one machine.',
    imageUrl: '/images/windows.svg',
    deliverySpeed: 'manual',
    popularity: 70,
    denominations: [{ label: 'Retail key', faceValue: null, priceDzd: 4200, comparePriceDzd: 5200 }],
  },
  {
    slug: 'office-home-student',
    name: 'Microsoft 365 Personal',
    category: 'software-keys',
    description:
      '12-month subscription for Word, Excel, PowerPoint and 1 TB of OneDrive storage, redeemable with a fresh Microsoft account.',
    imageUrl: '/images/office.svg',
    deliverySpeed: 'manual',
    popularity: 74,
    denominations: [
      { label: '12 months', faceValue: null, priceDzd: 6800, comparePriceDzd: 8500 },
      { label: '36 months', faceValue: null, priceDzd: 16000, comparePriceDzd: 22000 },
    ],
  },
  {
    slug: 'adobe-creative-cloud',
    name: 'Adobe Creative Cloud (1 month)',
    category: 'subscriptions',
    description:
      'One-month all-apps plan covering Photoshop, Illustrator, Premiere Pro and the full desktop suite.',
    imageUrl: '/images/adobe.svg',
    deliverySpeed: 'manual',
    popularity: 58,
    denominations: [
      { label: '1 month', faceValue: null, priceDzd: 3800, comparePriceDzd: 4500 },
      { label: '3 months', faceValue: null, priceDzd: 10500, comparePriceDzd: 13000 },
    ],
  },
  {
    slug: 'spotify-premium',
    name: 'Spotify Premium',
    category: 'subscriptions',
    description:
      'Ad-free music with offline listening. Activation code lets you claim on any account that has never subscribed before.',
    imageUrl: '/images/spotify.svg',
    deliverySpeed: 'manual',
    popularity: 82,
    denominations: [
      { label: '1 month', faceValue: null, priceDzd: 900, comparePriceDzd: 1100 },
      { label: '3 months', faceValue: null, priceDzd: 2500, comparePriceDzd: 3000 },
      { label: '12 months', faceValue: null, priceDzd: 8500, comparePriceDzd: 11000 },
    ],
  },
  {
    slug: 'canva-pro',
    name: 'Canva Pro',
    category: 'subscriptions',
    description: 'Unlimited premium templates, brand kit and background remover for a whole year.',
    imageUrl: '/images/canva.svg',
    deliverySpeed: 'manual',
    popularity: 66,
    denominations: [
      { label: '1 month', faceValue: null, priceDzd: 800, comparePriceDzd: 950 },
      { label: '12 months', faceValue: null, priceDzd: 7500, comparePriceDzd: 9500 },
    ],
  },
];

export async function seed() {
  await migrate();
  const forcePrices = process.argv.includes('--force-prices');

  await withTransaction(async (client) => {
    const categoryIds = new Map<string, string>();

    for (const [index, category] of categories.entries()) {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO categories (slug, name, name_fr, description, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (slug) DO UPDATE
           SET name = EXCLUDED.name,
               name_fr = EXCLUDED.name_fr,
               description = EXCLUDED.description,
               sort_order = EXCLUDED.sort_order
         RETURNING id`,
        [category.slug, category.name, category.nameFr, category.description, index * 10],
      );
      categoryIds.set(category.slug, rows[0]!.id);
    }

    for (const [index, product] of products.entries()) {
      const categoryId = categoryIds.get(product.category);
      if (!categoryId) throw new Error(`Unknown category: ${product.category}`);

      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO products
           (slug, name, category_id, description, image_url, delivery_speed,
            fulfillment_mode, is_active, is_featured, popularity, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, 'manual', TRUE, $7, $8, $9)
         ON CONFLICT (slug) DO UPDATE
           SET name = EXCLUDED.name,
               category_id = EXCLUDED.category_id,
               description = EXCLUDED.description,
               image_url = EXCLUDED.image_url,
               delivery_speed = EXCLUDED.delivery_speed,
               is_featured = EXCLUDED.is_featured,
               popularity = EXCLUDED.popularity,
               sort_order = EXCLUDED.sort_order
         RETURNING id`,
        [
          product.slug,
          product.name,
          categoryId,
          product.description,
          product.imageUrl,
          product.deliverySpeed,
          product.isFeatured ?? false,
          product.popularity ?? 50,
          index * 10,
        ],
      );
      const productId = rows[0]!.id;

      const { rows: existing } = await client.query<{ count: number }>(
        'SELECT count(*)::int AS count FROM product_denominations WHERE product_id = $1',
        [productId],
      );

      if (forcePrices || (existing[0]?.count ?? 0) === 0) {
        await client.query('DELETE FROM product_denominations WHERE product_id = $1', [productId]);
        for (const [dIndex, denomination] of product.denominations.entries()) {
          await client.query(
            `INSERT INTO product_denominations
               (product_id, label, face_value, price_dzd, compare_price_dzd, stock_status, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              productId,
              denomination.label,
              denomination.faceValue,
              denomination.priceDzd,
              denomination.comparePriceDzd ?? null,
              denomination.stockStatus ?? 'in_stock',
              dIndex * 10,
            ],
          );
        }
        console.log(`[seed] wrote ${product.denominations.length} denominations for ${product.slug}`);
      }
    }

    for (const [key, value] of Object.entries(defaultSettings)) {
      await client.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2::jsonb)
         ON CONFLICT (key) DO NOTHING`,
        [key, JSON.stringify(value)],
      );
    }
  });

  console.log(`[seed] done — ${categories.length} categories, ${products.length} products`);
}

const entrypoint = process.argv[1] ? resolve(process.argv[1]) : '';
if (entrypoint === fileURLToPath(import.meta.url)) {
  seed()
    .catch((err) => {
      console.error('[seed] failed:', err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
