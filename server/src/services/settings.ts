import { query } from '../db/pool.js';
import { AppError } from '../lib/errors.js';

/**
 * Site-wide settings that the owner can edit from the admin dashboard. Stored
 * as JSONB so new keys and shapes need no migration.
 */
export interface PaymentInstruction {
  /** Shown in the checkout panel once this method is selected. */
  accountName: string;
  /** CCP number, RIB, or Baridimob wallet number. */
  accountIdentifier: string;
  /** Anything else the customer needs: agency, bank, "send the receipt to…". */
  notes: string | null;
}

export interface SiteSettings {
  brandName: string;
  supportEmail: string;
  supportPhone: string;
  announcement: string | null;
  /** Show the "what happens next" copy on the confirmation screen. */
  paymentWindowHours: number;
  payments: {
    baridimob: PaymentInstruction;
    ccp: PaymentInstruction;
  };
  stats: {
    happyCustomers: number;
    averageDeliveryMinutes: number;
  };
}

export const defaultSettings: SiteSettings = {
  brandName: 'DZ Gift Cards',
  supportEmail: 'contact@example.com',
  supportPhone: '+213 5 00 00 00 00',
  announcement: null,
  paymentWindowHours: 24,
  payments: {
    baridimob: {
      accountName: 'DZ Gift Cards',
      accountIdentifier: '0000000000',
      notes: 'Open Baridimob → Transfert d\'argent, then send the receipt screenshot.',
    },
    ccp: {
      accountName: 'DZ Gift Cards',
      accountIdentifier: '0000000000 0000000000 00',
      notes: 'Deposit at any Algérie Poste agency, then send the ticket number.',
    },
  },
  stats: {
    happyCustomers: 1200,
    averageDeliveryMinutes: 25,
  },
};

export async function getSettings(): Promise<SiteSettings> {
  const rows = await query<{ key: string; value: unknown }>('SELECT key, value FROM settings');
  const stored = Object.fromEntries(rows.rows.map((r) => [r.key, r.value])) as Partial<
    Record<keyof SiteSettings, unknown>
  >;

  // Merge shallowly per top-level key so a partially written row never wipes
  // the defaults for the rest of the object.
  const merged = { ...defaultSettings } as SiteSettings;
  for (const key of Object.keys(defaultSettings) as Array<keyof SiteSettings>) {
    const value = stored[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(merged[key] as object, value);
    } else if (value !== undefined) {
      (merged as unknown as Record<string, unknown>)[key] = value;
    }
  }
  return merged;
}

/** Patch shape: top-level keys optional, nested objects partially optional. */
export type SiteSettingsPatch = {
  brandName?: string;
  supportEmail?: string;
  supportPhone?: string;
  announcement?: string | null;
  paymentWindowHours?: number;
  payments?: {
    baridimob?: Partial<PaymentInstruction>;
    ccp?: Partial<PaymentInstruction>;
  };
  stats?: {
    happyCustomers?: number;
    averageDeliveryMinutes?: number;
  };
};

export async function updateSettings(patch: SiteSettingsPatch): Promise<SiteSettings> {
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in defaultSettings)) {
      throw AppError.badRequest(`Unknown setting: ${key}`);
    }
    // Deep-merge so a partial `payments` update keeps the untouched method's
    // fields instead of wiping them to null.
    const fallback = (defaultSettings as unknown as Record<string, unknown>)[key];
    const merged =
      value && typeof value === 'object' && !Array.isArray(value)
        ? { ...(fallback as object), ...value }
        : value;

    await query(
      `INSERT INTO settings (key, value) VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, JSON.stringify(merged)],
    );
  }
  return getSettings();
}
