import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config.js';
import type { Order, PaymentMethod } from '../types.js';
import { formatDzd } from './format.js';
import { getSettings } from './settings.js';

/**
 * If SMTP is not configured, emails are printed to the console instead of
 * being sent. That keeps local development useful without an SMTP account.
 */
const transport: Transporter | null = config.smtp.host
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    })
  : null;

const isConfigured = transport !== null;

if (!isConfigured && !config.isProd) {
  console.warn('[mail] SMTP_HOST is not set — emails will be logged instead of sent');
}

interface MailResult {
  delivered: boolean;
  reason?: string;
}

export async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<MailResult> {
  if (!transport) {
    console.info(
      `\n──── EMAIL (not sent, SMTP unconfigured) ────\nTo: ${options.to}\nSubject: ${options.subject}\n${options.text}\n─────────────────────────────────────────────\n`,
    );
    return { delivered: false, reason: 'smtp_not_configured' };
  }
  try {
    await transport.sendMail({ from: config.smtp.from, ...options });
    return { delivered: true };
  } catch (err) {
    // A failed email must never fail the order it was about.
    console.error('[mail] send failed:', err);
    return { delivered: false, reason: 'smtp_error' };
  }
}

function layout(title: string, bodyHtml: string, orderNumber: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#0b0e14;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#141a26;border:1px solid #232c3d;border-radius:16px;overflow:hidden">
    <div style="padding:24px 28px;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff">
      <div style="font-size:20px;font-weight:700;letter-spacing:-0.01em">${escapeHtml(brandName)}</div>
      <div style="font-size:13px;opacity:0.9;margin-top:4px">Order ${escapeHtml(orderNumber)}</div>
    </div>
    <div style="padding:28px;color:#e6eaf2">
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#fff">${title}</h1>
      ${bodyHtml}
      <p style="margin:28px 0 0;font-size:14px;color:#8b95a8">
        Need help? Reply to this email or reach us on
        <a href="mailto:${support.email}" style="color:#a78bfa">${support.email}</a>${support.phone ? ` / ${support.phone}` : ''}.
      </p>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #232c3d;font-size:12px;color:#5f6b80">
      You are receiving this because you placed order ${escapeHtml(orderNumber)} at ${config.publicStorefrontUrl}.
    </div>
  </div>
</body></html>`;
}

function textLayout(title: string, body: string, orderNumber: string): string {
  return `${title}\n\n${body}\n\nOrder: ${orderNumber}\n\nNeed help? ${support.email}${support.phone ? ` / ${support.phone}` : ''}\n${config.publicStorefrontUrl}`;
}

let brandName = 'DZ Gift Cards';
let support = { email: 'contact@example.com', phone: '' };

export async function loadMailContext(): Promise<void> {
  const settings = await getSettings();
  brandName = settings.brandName;
  support = { email: settings.supportEmail, phone: settings.supportPhone };
}

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  baridimob: 'Baridimob',
  ccp: 'CCP (Algérie Poste)',
};

export async function sendOrderPlacedEmail(order: Order): Promise<MailResult> {
  if (!order.email) return { delivered: false, reason: 'no_email' };

  const lines = order.items
    .map(
      (item) =>
        `• ${item.productName} — ${item.denominationLabel} × ${item.quantity} = ${formatDzd(item.lineTotalDzd)}`,
    )
    .join('\n');

  const payment = order.paymentMethod;
  const htmlBody = `
    <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#c3cbdb">
      Hi ${escapeHtml(order.fullName)}, we received your order. Here is what to do next.
    </p>
    <div style="background:#0f1520;border:1px solid #232c3d;border-radius:12px;padding:16px;margin-bottom:20px">
      <div style="font-size:13px;color:#8b95a8;margin-bottom:10px">Order summary</div>
      ${lines
        .split('\n')
        .map(
          (l) =>
            `<div style="font-size:14px;color:#e6eaf2;padding:3px 0">${escapeHtml(l.replace(/^• /, ''))}</div>`,
        )
        .join('')}
      <div style="border-top:1px solid #232c3d;margin-top:12px;padding-top:12px;font-size:16px;font-weight:700;color:#fff">
        Total: ${formatDzd(order.totalDzd)}
      </div>
    </div>
    <h2 style="margin:0 0 10px;font-size:17px;color:#fff">Pay with ${escapeHtml(PAYMENT_LABEL[payment])}</h2>
    <ol style="margin:0 0 20px;padding-left:20px;font-size:15px;line-height:1.7;color:#c3cbdb">
      <li>Send <strong style="color:#fff">${formatDzd(order.totalDzd)}</strong> to the account shown at checkout.</li>
      <li>Put your order number <strong style="color:#fff">${escapeHtml(order.orderNumber)}</strong> in the transfer reference.</li>
      <li>Send us the receipt on WhatsApp or by email.</li>
    </ol>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#c3cbdb">
      <a href="${config.publicStorefrontUrl}/track?order=${encodeURIComponent(order.orderNumber)}"
         style="display:inline-block;background:#7c5cff;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">
        Track this order
      </a>
    </p>`;

  return sendMail({
    to: order.email,
    subject: `Order ${order.orderNumber} received — ${formatDzd(order.totalDzd)} to pay`,
    text: textLayout(
      `Thanks ${order.fullName}, we received order ${order.orderNumber}.`,
      `${lines}\n\nTotal: ${formatDzd(order.totalDzd)}\n\nPay with ${PAYMENT_LABEL[payment]} and put your order number as the reference, then send us the receipt.`,
      order.orderNumber,
    ),
    html: layout(
      `Thanks ${escapeHtml(order.fullName)}, we received your order.`,
      htmlBody,
      order.orderNumber,
    ),
  });
}

export async function sendPaymentConfirmedEmail(order: Order): Promise<MailResult> {
  if (!order.email) return { delivered: false, reason: 'no_email' };
  const body = `<p style="margin:0;font-size:16px;line-height:1.6;color:#c3cbdb">
    Payment received — thank you. We are sourcing your code now and it will appear on your
    tracking page (and in this email) as soon as it is ready.
  </p>`;
  return sendMail({
    to: order.email,
    subject: `Payment confirmed for ${order.orderNumber}`,
    text: textLayout(
      'Payment confirmed',
      'Payment received. We are preparing your code now.',
      order.orderNumber,
    ),
    html: layout('Payment confirmed', body, order.orderNumber),
  });
}

export async function sendDeliveredEmail(order: Order, codes: string[]): Promise<MailResult> {
  if (!order.email) return { delivered: false, reason: 'no_email' };
  const codeHtml = codes
    .map(
      (code) =>
        `<div style="background:#0f1520;border:1px solid #7c5cff;border-radius:10px;padding:14px 16px;margin-bottom:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:16px;color:#fff;word-break:break-all">${escapeHtml(code)}</div>`,
    )
    .join('');

  const body = `
    <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#c3cbdb">
      Your order is ready. Here ${codes.length === 1 ? 'is your code' : `are your ${codes.length} codes`}:
    </p>
    ${codeHtml}
    <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#8b95a8">
      ${escapeHtml(order.items.map((i) => `${i.productName} (${i.denominationLabel})`).join(', '))}
    </p>`;

  return sendMail({
    to: order.email,
    subject: `Your code for order ${order.orderNumber}`,
    text: textLayout(
      'Your order is delivered',
      `Your code${codes.length > 1 ? 's' : ''}:\n\n${codes.join('\n')}`,
      order.orderNumber,
    ),
    html: layout('Your order is delivered', body, order.orderNumber),
  });
}

export async function sendOrderCancelledEmail(order: Order): Promise<MailResult> {
  if (!order.email) return { delivered: false, reason: 'no_email' };
  return sendMail({
    to: order.email,
    subject: `Order ${order.orderNumber} cancelled`,
    text: textLayout(
      'Order cancelled',
      'This order has been cancelled. If you already paid, contact us and we will refund.',
      order.orderNumber,
    ),
    html: layout(
      'Order cancelled',
      `<p style="margin:0;font-size:16px;line-height:1.6;color:#c3cbdb">
        This order has been cancelled. If you already made a payment, contact us and we will refund it.
      </p>`,
      order.orderNumber,
    ),
  });
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export { isConfigured as mailIsConfigured };
