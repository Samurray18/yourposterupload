import { useState } from 'react';

interface ProductImageProps {
  src: string | null;
  alt: string;
  className?: string;
}

/**
 * Renders the product image, falling back to a monogram tile when there is no
 * artwork or the upload 404s. Brands in this catalogue often have no freely
 * licensed logo, so the fallback is the common case, not an error state.
 */
export function ProductImage({ src, alt, className = '' }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`bg-gradient-to-br from-ink-750 to-ink-850 flex items-center justify-center ${className}`}
        aria-label={alt}
        role="img"
      >
        <span className="text-accent-300/80 text-3xl font-extrabold tracking-tight select-none">
          {alt
            .split(/\s+/)
            .slice(0, 2)
            .map((word) => word[0]?.toUpperCase() ?? '')
            .join('')}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
