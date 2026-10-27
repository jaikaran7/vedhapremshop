/** Mandi floor session used by dashboards, today's sales, and new bills. Today in India; the server stamps the same day on bills. */
export const TRADING_SESSION_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
