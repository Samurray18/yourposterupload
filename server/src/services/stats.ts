import { query, queryOne } from '../db/pool.js';
import type { DashboardStats, OrderStatus } from '../types.js';

interface SummaryRow {
  orders_today: number;
  revenue_today: number;
  orders_week: number;
  revenue_week: number;
  lifetime_revenue: number;
  lifetime_orders: number;
  product_count: number;
}

/**
 * Everything the admin overview needs, in a handful of parallel queries rather
 * than one query per dashboard card.
 */
export async function getStats(): Promise<DashboardStats & { productCount: number }> {
  const [summary, statusCounts, bestSellers, recentOrders, revenueByDay] = await Promise.all([
    queryOne<SummaryRow>(`
      SELECT
        count(*) FILTER (WHERE created_at >= date_trunc('day', now()))::int               AS orders_today,
        COALESCE(sum(total_dzd) FILTER (WHERE created_at >= date_trunc('day', now())), 0)  AS revenue_today,
        count(*) FILTER (WHERE created_at >= date_trunc('week', now()))::int              AS orders_week,
        COALESCE(sum(total_dzd) FILTER (WHERE created_at >= date_trunc('week', now())), 0) AS revenue_week,
        COALESCE(sum(total_dzd) FILTER (WHERE status <> 'cancelled'), 0)                  AS lifetime_revenue,
        count(*)::int                                                                      AS lifetime_orders,
        (SELECT count(*)::int FROM products WHERE is_active = TRUE)                       AS product_count
      FROM orders
    `),
    queryOne<Record<string, number>>(`
      SELECT
        count(*) FILTER (WHERE status = 'pending_payment')::int  AS pending_payment,
        count(*) FILTER (WHERE status = 'payment_confirmed')::int AS payment_confirmed,
        count(*) FILTER (WHERE status = 'processing')::int        AS processing,
        count(*) FILTER (WHERE status = 'delivered')::int        AS delivered,
        count(*) FILTER (WHERE status = 'cancelled')::int        AS cancelled
      FROM orders
    `),
    query<{ product_name: string; units_sold: number; revenue_dzd: number }>(`
      SELECT oi.product_name,
             sum(oi.quantity)::int AS units_sold,
             sum(oi.line_total_dzd) AS revenue_dzd
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
       WHERE o.status <> 'cancelled'
       GROUP BY oi.product_name
       ORDER BY units_sold DESC
       LIMIT 5
    `),
    query<{
      order_number: string;
      full_name: string;
      total_dzd: number;
      status: OrderStatus;
      created_at: Date;
    }>(`
      SELECT order_number, full_name, total_dzd, status, created_at
        FROM orders
       ORDER BY created_at DESC
       LIMIT 8
    `),
    // `generate_series` over the last 14 days, zero-filled by the LEFT JOIN, so
    // the sparkline has one point per day even on quiet days.
    query<{ day: string; revenue_dzd: number; orders: number }>(`
      SELECT to_char(d.day, 'YYYY-MM-DD')                              AS day,
             COALESCE(sum(o.total_dzd) FILTER (WHERE o.status <> 'cancelled'), 0) AS revenue_dzd,
             count(o.id)::int                                          AS orders
        FROM generate_series(
               date_trunc('day', now()) - INTERVAL '13 days',
               date_trunc('day', now()),
               INTERVAL '1 day'
             ) AS d(day)
        LEFT JOIN orders o ON o.created_at::date = d.day::date
       GROUP BY d.day
       ORDER BY d.day
    `),
  ]);

  const counts = statusCounts ?? ({} as Record<string, number>);

  return {
    ordersToday: summary?.orders_today ?? 0,
    revenueTodayDzd: Number(summary?.revenue_today ?? 0),
    ordersThisWeek: summary?.orders_week ?? 0,
    revenueThisWeekDzd: Number(summary?.revenue_week ?? 0),
    ordersPendingPayment: counts.pending_payment ?? 0,
    ordersAwaitingFulfillment: (counts.payment_confirmed ?? 0) + (counts.processing ?? 0),
    lifetimeRevenueDzd: Number(summary?.lifetime_revenue ?? 0),
    totalOrders: summary?.lifetime_orders ?? 0,
    productCount: summary?.product_count ?? 0,
    bestSellers: bestSellers.rows.map((r) => ({
      productName: r.product_name,
      unitsSold: r.units_sold,
      revenueDzd: Number(r.revenue_dzd),
    })),
    recentOrders: recentOrders.rows.map((r) => ({
      orderNumber: r.order_number,
      fullName: r.full_name,
      totalDzd: Number(r.total_dzd),
      status: r.status,
      createdAt: r.created_at.toISOString(),
    })),
    revenueByDay: revenueByDay.rows.map((r) => ({
      day: r.day,
      revenueDzd: Number(r.revenue_dzd),
      orders: r.orders,
    })),
  };
}
