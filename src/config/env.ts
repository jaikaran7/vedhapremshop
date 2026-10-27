function isLocalApiHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') return true;
  if (host.endsWith('.local')) return true;
  const parts = host.split('.');
  if (parts.length !== 4) return false;
  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return false;
  const [first = -1, second = -1] = octets;
  return first === 10 || (first === 192 && second === 168) || (first === 172 && second >= 16 && second <= 31);
}

/** When the configured API is this machine, follow the page hostname so a phone hits this Mac, not its own localhost. */
export function resolveApiBaseUrl(configured: string, pageHostname?: string): string {
  const base = configured.replace(/\/$/, '');
  if (!pageHostname) return base;
  try {
    const url = new URL(base);
    if (!isLocalApiHost(url.hostname)) return base;
    url.hostname = pageHostname;
    return url.toString().replace(/\/$/, '');
  } catch {
    return base;
  }
}

export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';
  const pageHostname = typeof window === 'undefined' ? undefined : window.location.hostname;
  return resolveApiBaseUrl(configured, pageHostname);
}
