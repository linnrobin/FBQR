/**
 * Shared types for the analytics dashboard components.
 * Mirrors the shape returned by GET /api/merchant/analytics.
 */

export interface RevenueTrendPoint {
  date: string; // "yyyy-MM-dd"
  total: number;
}

export interface RevenueByType {
  type: string;
  total: number;
}

export interface RevenueByMethod {
  method: string;
  total: number;
}

export interface RevenueData {
  grossRevenue: number;
  taxCollected: number;
  serviceChargeCollected: number;
  estimatedGatewayFees: number;
  netRevenue: number;
  trend: RevenueTrendPoint[];
  byOrderType: RevenueByType[];
  byPaymentMethod: RevenueByMethod[];
}

export interface HourPoint {
  hour: number;
  count: number;
}

export interface DowPoint {
  day: string;
  count: number;
}

export interface OrdersData {
  total: number;
  aov: number;
  cancellationRate: number;
  byHour: HourPoint[];
  byDow: DowPoint[];
}

export interface MenuItemStat {
  name: string;
  total: number;
  count: number;
}

export interface SlowestItem {
  name: string;
  count: number;
  lastOrderedAt: string | null;
}

export interface MenuData {
  topByRevenue: MenuItemStat[];
  topByCount: MenuItemStat[];
  slowest: SlowestItem[];
}

export interface TableData {
  avgTurnoverRate: number;
  avgSpendPerSession: number;
  busiestTableName: string | null;
  busiestTableCount: number;
}

export interface RatingDistPoint {
  rating: number;
  count: number;
}

export interface RecentComment {
  rating: number;
  comment: string;
  date: string;
}

export interface RatingsData {
  avg: number | null;
  count: number;
  distribution: RatingDistPoint[];
  recentComments: RecentComment[];
}

export interface AnalyticsData {
  revenue: RevenueData;
  orders: OrdersData;
  menu: MenuData;
  tables: TableData;
  ratings: RatingsData;
}

export interface Branch {
  id: string;
  name: string;
}
