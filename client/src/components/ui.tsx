import { useState, type ReactNode } from 'react';
import { STATUS_LABEL, STATUS_TONE } from '../lib/format';
import type { OrderStatus } from '../lib/types';
import { DELIVERY_LABEL } from '../lib/format';
import type { DeliverySpeed } from '../lib/types';

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`badge border ${STATUS_TONE[status]}`}>{STATUS_LABEL[status]}</span>
  );
}

/** Green when fast, amber when manual — sets expectations honestly. */
export function DeliveryBadge({ speed }: { speed: DeliverySpeed }) {
  const tone =
    speed === 'instant'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : speed === 'few_hours'
        ? 'bg-accent-500/15 text-accent-300 border-accent-500/30'
        : 'bg-amber-500/15 text-amber-300 border-amber-500/30';

  return (
    <span className={`badge border ${tone}`}>
      <svg viewBox="0 0 20 20" className="size-3.5" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .27.14.52.37.65l3.5 2a.75.75 0 10.76-1.3L10.75 9.6V5z"
          clipRule="evenodd"
        />
      </svg>
      {DELIVERY_LABEL[speed]}
    </span>
  );
}

export function DiscountBadge({ percent }: { percent: number }) {
  return <span className="badge bg-mint/90 text-ink-950">Save {percent}%</span>;
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="panel flex flex-col items-center gap-3 px-6 py-14 text-center">
      {icon && <div className="text-ink-500">{icon}</div>}
      <h3 className="text-lg">{title}</h3>
      {description && <p className="text-muted max-w-md text-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Alert({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: ReactNode;
}) {
  const tones = {
    info: 'border-accent-500/30 bg-accent-500/10 text-accent-100',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
    error: 'border-red-500/30 bg-red-500/10 text-red-100',
  } as const;

  return (
    <div role="status" className={`rounded-xl border p-4 ${tones[tone]}`}>
      {title && <p className="mb-1 font-bold">{title}</p>}
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

/** Monospaced block for codes, with a copy-to-clipboard affordance. */
export function CodeBlock({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context / permissions) — the code is still
      // selectable, so silently do nothing rather than showing a false failure.
    }
  };

  return (
    <div className="border-accent-500/40 bg-ink-950 flex items-center gap-3 rounded-xl border p-4">
      <code className="text-bright flex-1 font-mono text-base break-all select-all">
        {value}
      </code>
      <button type="button" onClick={copy} className="btn-secondary btn-sm shrink-0">
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
