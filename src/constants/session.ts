import { isMockApi } from '@/config/env';

/**
 * Mandi floor session used by dashboards, today's sales, and new bills.
 * The mock data is frozen on 2026-10-01; against the API it is today in India, the day the server stamps on bills.
 */
export const TRADING_SESSION_DATE = isMockApi()
  ? '2026-10-01'
  : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
