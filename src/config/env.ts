export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
}

export function isMockApi(): boolean {
  return getApiBaseUrl().length === 0;
}
