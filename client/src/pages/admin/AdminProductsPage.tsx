import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import type { Category, Product, StockStatus } from '../../lib/types';
import { ProductImage } from '../../components/ProductImage';
import { Alert, DeliveryBadge, EmptyState } from '../../components/ui';
import { DELIVERY_SPEEDS } from '../../lib/types';
import { ReloadlyPanel } from './ReloadlyPanel';

export function AdminProductsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(true);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);

  const load = useCallback(async () => {
    try {
      const [categoryResponse, productResponse] = await Promise.all([
        api.getCategories(),
        api.admin.products({ includeInactive }),
      ]);
      setCategories(categoryResponse.categories);
      setProducts(productResponse.products);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load products');
      setProducts([]);
    }
  }, [includeInactive]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (!products) return [];
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) || product.slug.includes(term),
    );
  }, [products, search]);

  const flash = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 3000);
  };

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl">Products</h1>
          <p className="text-muted mt-1">
            Edit prices inline — changes go live immediately.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="btn-primary"
        >
          Add product
        </button>
      </div>

      {notice && (
        <div className="mt-5">
          <Alert tone="success">{notice}</Alert>
        </div>
      )}
      {error && (
        <div className="mt-5">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <ReloadlyPanel onImported={() => void load()} />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search products…"
          className="input max-w-xs"
          aria-label="Search products"
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(event) => setIncludeInactive(event.target.checked)}
            className="accent-accent-500 size-4"
          />
          <span className="text-muted">Show inactive</span>
        </label>
      </div>

      {products === null ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No products found"
            description="Add your first product, or run the seed script to load a starter catalogue."
          />
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {visible.map((product) => (
            <li key={product.id} className="panel p-4">
              <div className="flex flex-wrap gap-4">
                <div className="bg-ink-800/60 flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl">
                  <ProductImage
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-contain p-2"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-bright font-bold">{product.name}</h2>
                    {!product.isActive && (
                      <span className="badge bg-ink-700 text-muted">Inactive</span>
                    )}
                    {product.isFeatured && (
                      <span className="badge bg-accent-500/15 text-accent-200 border border-accent-500/30">
                        Featured
                      </span>
                    )}
                    {product.fulfillmentMode === 'auto' && (
                      <span className="badge border border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
                        Auto
                      </span>
                    )}
                  </div>
                  <p className="text-ink-500 mt-0.5 text-sm">
                    {product.categoryName} · {product.slug}
                  </p>
                  <div className="mt-2">
                    <DeliveryBadge speed={product.deliverySpeed} />
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-start gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      api.admin
                        .setFeatured(product.id, !product.isFeatured)
                        .then(({ product: updated }) => {
                          setProducts((current) =>
                            current?.map((p) => (p.id === updated.id ? updated : p)) ?? null,
                          );
                          flash(updated.isFeatured ? 'Added to best deals' : 'Removed from best deals');
                        })
                        .catch((err) => setError(err.message))
                    }
                    className="btn-secondary btn-sm"
                  >
                    {product.isFeatured ? 'Unfeature' : 'Feature'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(product)}
                    className="btn-secondary btn-sm"
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* ------------------------------------------- inline price table */}
              <div className="border-ink-700 mt-4 overflow-x-auto border-t pt-4">
                <table className="w-full min-w-[34rem] text-sm">
                  <thead>
                    <tr className="text-muted text-left">
                      <th className="pb-2 pr-3 font-semibold">Option</th>
                      <th className="pb-2 pr-3 font-semibold">Price (DZD)</th>
                      <th className="pb-2 pr-3 font-semibold">Compare (DZD)</th>
                      <th className="pb-2 pr-3 font-semibold">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.denominations.map((denomination) => (
                      <PriceRow
                        key={denomination.id}
                        product={product}
                        label={denomination.label}
                        initialPrice={denomination.priceDzd}
                        initialCompare={denomination.comparePriceDzd}
                        initialStock={denomination.stockStatus}
                        onSaved={(updated) => {
                          setProducts((current) =>
                            current?.map((p) => (p.id === updated.id ? updated : p)) ?? null,
                          );
                          flash(`${product.name} — ${denomination.label} updated`);
                        }}
                        onError={setError}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <ProductEditor
          product={editing === 'new' ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            void load();
            flash(message);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------- price row */

interface PriceRowProps {
  product: Product;
  label: string;
  initialPrice: number;
  initialCompare: number | null;
  initialStock: string;
  onSaved(product: Product): void;
  onError(message: string): void;
}

/** Inline price editing — the owner adjusts a price and hits Save. */
function PriceRow({
  product,
  label,
  initialPrice,
  initialCompare,
  initialStock,
  onSaved,
  onError,
}: PriceRowProps) {
  const [price, setPrice] = useState(String(initialPrice));
  const [compare, setCompare] = useState(initialCompare === null ? '' : String(initialCompare));
  const [saving, setSaving] = useState(false);

  const dirty =
    Number(price) !== initialPrice ||
    (compare === '' ? null : Number(compare)) !== initialCompare;

  const save = async () => {
    setSaving(true);
    try {
      const { product: updated } = await api.admin.updatePrices(product.id, [
        {
          id: denominationLabelToId(product, label),
          priceDzd: Math.max(0, Number(price) || 0),
          comparePriceDzd: compare === '' ? null : Number(compare),
        },
      ]);
      onSaved(updated);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not save the price');
    } finally {
      setSaving(false);
    }
  };

  const toggleStock = async (next: 'in_stock' | 'out_of_stock') => {
    try {
      const { product: updated } = await api.admin.setStock(
        product.id,
        denominationLabelToId(product, label),
        next,
      );
      onSaved(updated);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not update stock');
    }
  };

  return (
    <tr className="border-ink-800 border-t">
      <td className="text-bright py-2 pr-3 font-semibold whitespace-nowrap">{label}</td>
      <td className="py-2 pr-3">
        <input
          type="number"
          min={0}
          step={10}
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          className="input w-28 py-1.5 text-sm"
          aria-label={`Price for ${product.name} ${label}`}
        />
      </td>
      <td className="py-2 pr-3">
        <input
          type="number"
          min={0}
          step={10}
          value={compare}
          placeholder="—"
          onChange={(event) => setCompare(event.target.value)}
          className="input w-28 py-1.5 text-sm"
          aria-label={`Comparison price for ${product.name} ${label}`}
        />
      </td>
      <td className="py-2 pr-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void toggleStock(initialStock === 'in_stock' ? 'out_of_stock' : 'in_stock')}
            className={`badge cursor-pointer border ${
              initialStock === 'in_stock'
                ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                : 'border-ink-600 bg-ink-750 text-muted'
            }`}
          >
            {initialStock === 'in_stock' ? 'In stock' : 'Out of stock'}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="btn-secondary btn-sm"
          >
            {saving ? '…' : 'Save'}
          </button>
        </div>
      </td>
    </tr>
  );
}

/** Denomination ids are the API's key; the label is what the row is indexed by in the UI. */
function denominationLabelToId(product: Product, label: string): string {
  const match = product.denominations.find((d) => d.label === label);
  if (!match) throw new Error(`Unknown option: ${label}`);
  return match.id;
}

/* ------------------------------------------------------------- the editor */

interface ProductEditorProps {
  /** `null` means "create a new product". */
  product: Product | null;
  categories: Category[];
  onClose(): void;
  onSaved(message: string): void;
}

interface DenominationDraft {
  /** Absent for options the owner just added — the API creates those rows. */
  id?: string;
  label: string;
  priceDzd: number;
  comparePriceDzd: number | null;
  stockStatus: StockStatus;
}

function ProductEditor({ product, categories, onClose, onSaved }: ProductEditorProps) {
  const isNew = product === null;

  const [name, setName] = useState(isNew ? '' : product.name);
  const [categoryId, setCategoryId] = useState(isNew ? (categories[0]?.id ?? '') : product.categoryId);
  const [description, setDescription] = useState(isNew ? '' : product.description ?? '');
  const [imageUrl, setImageUrl] = useState(isNew ? '' : product.imageUrl ?? '');
  const [deliverySpeed, setDeliverySpeed] = useState<string>(
    isNew ? 'manual' : product.deliverySpeed,
  );
  const [fulfillmentMode, setFulfillmentMode] = useState<string>(
    isNew ? 'manual' : product.fulfillmentMode,
  );
  const [isActive, setIsActive] = useState(isNew ? true : product.isActive);
  const [isFeatured, setIsFeatured] = useState(isNew ? false : product.isFeatured);
  const [denominations, setDenominations] = useState<DenominationDraft[]>(
    isNew
      ? [{ label: '', priceDzd: 0, comparePriceDzd: null, stockStatus: 'in_stock' }]
      : product.denominations.map((d) => ({
          id: d.id,
          label: d.label,
          priceDzd: d.priceDzd,
          comparePriceDzd: d.comparePriceDzd,
          stockStatus: d.stockStatus,
        })),
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const { url } = await api.admin.uploadImage(file);
      setImageUrl(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      setError('Give the product a name');
      return;
    }
    const cleaned = denominations.filter((d) => d.label.trim());
    if (cleaned.length === 0) {
      setError('Add at least one option with a label');
      return;
    }

    setSaving(true);
    setError(null);
    const payload = {
      name: name.trim(),
      categoryId,
      description: description.trim() || null,
      imageUrl: imageUrl.trim() || null,
      deliverySpeed,
      fulfillmentMode,
      isActive,
      isFeatured,
      popularity: isNew ? 50 : product.popularity,
      sortOrder: isNew ? 0 : product.sortOrder,
      denominations: cleaned.map((d, index) => ({
        ...(d.id ? { id: d.id } : {}),
        label: d.label.trim(),
        priceDzd: Math.max(0, Number(d.priceDzd) || 0),
        comparePriceDzd: d.comparePriceDzd ? Number(d.comparePriceDzd) : null,
        stockStatus: d.stockStatus,
        sortOrder: index * 10,
      })),
    };

    try {
      const response = isNew
        ? await api.admin.createProduct(payload)
        : await api.admin.updateProduct(product.id, payload);
      onSaved(isNew ? `${response.product.name} created` : `${response.product.name} saved`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the product');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/80 p-4 backdrop-blur-sm">
      <div className="panel my-8 w-full max-w-2xl p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">{isNew ? 'New product' : `Edit ${product.name}`}</h2>
          <button type="button" onClick={onClose} className="btn-ghost btn-sm" aria-label="Close">
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4">
            <Alert tone="error">{error}</Alert>
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="p-name">
              Name
            </label>
            <input
              id="p-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label" htmlFor="p-category">
              Category
            </label>
            <select
              id="p-category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="input"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id} className="bg-ink-850">
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="p-speed">
              Delivery speed
            </label>
            <select
              id="p-speed"
              value={deliverySpeed}
              onChange={(event) => setDeliverySpeed(event.target.value)}
              className="input"
            >
              {DELIVERY_SPEEDS.map((speed) => (
                <option key={speed} value={speed} className="bg-ink-850">
                  {speed.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="p-fulfillment">
              Fulfillment
            </label>
            <select
              id="p-fulfillment"
              value={fulfillmentMode}
              onChange={(event) => setFulfillmentMode(event.target.value)}
              className="input"
            >
              <option value="manual" className="bg-ink-850">
                Manual (I paste the code)
              </option>
              <option value="auto" className="bg-ink-850">
                Automatic (distributor API)
              </option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor="p-image">
              Image URL
            </label>
            <div className="flex gap-2">
              <input
                id="p-image"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="/uploads/…"
                className="input"
              />
              <label className="btn-secondary btn-sm shrink-0 cursor-pointer">
                {uploading ? '…' : 'Upload'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadImage(file);
                  }}
                />
              </label>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="p-description">
              Description
            </label>
            <textarea
              id="p-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="input"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-6">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="accent-accent-500 size-4"
            />
            <span className="text-muted">Active (visible in the shop)</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(event) => setIsFeatured(event.target.checked)}
              className="accent-accent-500 size-4"
            />
            <span className="text-muted">Show in best deals</span>
          </label>
        </div>

        {/* ------------------------------------------------- denominations */}
        <h3 className="text-bright mt-6 text-sm font-bold">Options &amp; prices</h3>
        <div className="mt-2 space-y-2">
          {denominations.map((denomination, index) => (
            <div key={denomination.id ?? index} className="flex flex-wrap gap-2">
              <input
                value={denomination.label}
                onChange={(event) =>
                  setDenominations((current) =>
                    current.map((d, i) =>
                      i === index ? { ...d, label: event.target.value } : d,
                    ),
                  )
                }
                placeholder="e.g. 10 USD"
                className="input flex-1 min-w-32"
                aria-label={`Option ${index + 1} label`}
              />
              <input
                type="number"
                min={0}
                value={denomination.priceDzd}
                onChange={(event) =>
                  setDenominations((current) =>
                    current.map((d, i) =>
                      i === index ? { ...d, priceDzd: Number(event.target.value) } : d,
                    ),
                  )
                }
                className="input w-32"
                aria-label={`Option ${index + 1} price`}
              />
              <input
                type="number"
                min={0}
                value={denomination.comparePriceDzd ?? ''}
                placeholder="compare"
                onChange={(event) =>
                  setDenominations((current) =>
                    current.map((d, i) =>
                      i === index
                        ? {
                            ...d,
                            comparePriceDzd: event.target.value
                              ? Number(event.target.value)
                              : null,
                          }
                        : d,
                    ),
                  )
                }
                className="input w-28"
                aria-label={`Option ${index + 1} comparison price`}
              />
              <button
                type="button"
                onClick={() =>
                  setDenominations((current) => current.filter((_, i) => i !== index))
                }
                disabled={denominations.length === 1}
                className="btn-danger btn-sm shrink-0"
                aria-label={`Remove option ${index + 1}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            setDenominations((current) => [
              ...current,
              { label: '', priceDzd: 0, comparePriceDzd: null, stockStatus: 'in_stock' },
            ])
          }
          className="btn-ghost btn-sm mt-2"
        >
          + Add option
        </button>

        {!isNew && (
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  `Delete "${product.name}"? Products with orders are archived instead.`,
                )
              ) {
                api.admin
                  .deleteProduct(product.id)
                  .then(() => onSaved(`${product.name} deleted`))
                  .catch((err) => setError(err.message));
              }
            }}
            className="btn-danger btn-sm mt-6"
          >
            Delete product
          </button>
        )}

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={save} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving…' : 'Save product'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
