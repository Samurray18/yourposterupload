/**
 * Identifies this supplier in the database.
 *
 * The value is compared against `product_denominations.supplier` and stored in
 * `order_supplier_transactions.supplier`, so it must be a single shared
 * constant: a mismatch would make every imported denomination look unmapped
 * and silently fall back to manual fulfilment.
 */
export const RELOADLY_SUPPLIER = 'reloadly';
