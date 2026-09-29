import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import type { DashboardStats } from '../../lib/types';
import { STATUS_TONE, formatDzd, formatDzdCompact, timeAgo } from '../../lib/format';

export function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.admin
      .stats()
      .then((response) => setStats(response.stats))
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="container-page py-10">
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container-page py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...stats.revenueByDay.map((d) => d.revenueDzd), 1);

  const tiles = [
    { label: "Revenue today", value: formatDzd(stats.revenueTodayDzd), sub: `${stats.ordersToday} orders` },
    {
      label: 'Revenue this week',
      value: formatDzd(stats.revenueThisWeekDzd),
      sub: `${stats.ordersThisWeek} orders`,
    },
    {
      label: 'Awaiting payment',
      value: String(stats.ordersPendingPayment),
      sub: 'Pending customer transfer',
      tone: stats.ordersPendingPayment > 0 ? 'amber' : undefined,
    },
    {
      label: 'Needs fulfilment',
      value: String(stats.ordersAwaitingFulfillment),
      sub: 'Paid, code not delivered',
      tone: stats.ordersAwaitingFulfillment > 0 ? 'accent' : undefined,
    },
  ];

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl">Overview</h1>
      <p className="text-muted mt-2">
        Lifetime revenue {formatDzd(stats.lifetimeRevenueDzd)} across {stats.totalOrders} orders ·{' '}
        {stats.productCount} active products
      </p>

      {/* ------------------------------------------------------------ tiles */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className={`rounded-2xl border p-5 ${
              tile.tone === 'amber'
                ? 'border-amber-500/30 bg-amber-500/5'
                : tile.tone === 'accent'
                  ? 'border-accent-500/30 bg-accent-500/5'
                  : 'border-ink-700 bg-ink-850'
            }`}
          >
            <p className="text-muted text-sm font-semibold">{tile.label}</p>
            <p className="text-gradient mt-2 text-2xl font-extrabold">{tile.value}</p>
            <p className="text-ink-500 mt-1 text-xs">{tile.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        {/* --------------------------------------------------------- chart */}
        <div className="panel p-6">
          <h2 className="text-lg">Revenue, last 14 days</h2>
          <div className="mt-6 flex h-40 items-end gap-1.5">
            {stats.revenueByDay.map((day) => (
              <div key={day.day} className="group flex flex-1 flex-col items-center gap-2">
                <div className="relative flex w-full flex-1 items-end">
                  <div
                    className="from-accent-500/60 to-violet-glow/60 group-hover:from-accent-400 group-hover:to-violet-glow w-full rounded-t bg-gradient-to-t transition-all duration-200"
                    style={{
                      height: `${Math.max(3, (day.revenueDzd / maxRevenue) * 100)}%`,
                    }}
                    title={`${day.day}: ${formatDzd(day.revenueDzd)} · ${day.orders} orders`}
                  />
                </div>
                <span className="text-ink-500 text-[10px]">{day.day.slice(8)}</span>
              </div>
            ))}
          </div>
          <p className="text-ink-500 mt-3 text-xs">
            Total {formatDzdCompact(stats.revenueByDay.reduce((sum, d) => sum + d.revenueDzd, 0))} over
            the period
          </p>
        </div>

        {/* ----------------------------------------------------- best sellers */}
        <div className="panel p-6">
          <h2 className="text-lg">Best sellers</h2>
          {stats.bestSellers.length === 0 ? (
            <p className="text-muted mt-4 text-sm">No sales yet.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {stats.bestSellers.map((item, index) => (
                <li key={item.productName} className="flex items-center gap-3 text-sm">
                  <span className="bg-ink-700 text-muted flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-bright block truncate font-semibold">
                      {item.productName}
                    </span>
                    <span className="text-ink-500 text-xs">
                      {item.unitsSold} sold · {formatDzd(item.revenueDzd)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------ recent orders */}
      <div className="panel mt-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg">Recent orders</h2>
          <Link to="/admin/orders" className="btn-ghost btn-sm">
            View all →
          </Link>
        </div>
        {stats.recentOrders.length === 0 ? (
          <p className="text-muted mt-4 text-sm">No orders yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-ink-700 text-muted border-b text-left">
                  <th className="pb-2 pr-4 font-semibold">Order</th>
                  <th className="pb-2 pr-4 font-semibold">Customer</th>
                  <th className="pb-2 pr-4 font-semibold">Total</th>
                  <th className="pb-2 pr-4 font-semibold">Status</th>
                  <th className="pb-2 font-semibold">When</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order) => (
                  <tr key={order.orderNumber} className="border-ink-800 border-b last:border-0">
                    <td className="py-3 pr-4">
                      <Link
                        to={`/admin/orders?search=${order.orderNumber}`}
                        className="text-accent-300 font-mono font-semibold hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="text-bright py-3 pr-4">{order.fullName}</td>
                    <td className="text-bright py-3 pr-4 font-semibold">
                      {formatDzd(order.totalDzd)}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`badge border ${STATUS_TONE[order.status]}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-ink-500 py-3 whitespace-nowrap">{timeAgo(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
