import type { AnalysisResult, CompanyRef, QueryPlan, ScreenResult } from '@santara/shared';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(body?.message ?? `Request failed (${response.status})`, response.status);
  }

  return (await response.json()) as T;
}

export const api = {
  health: () => request<{ status: string; usesFixtures: boolean }>('/health'),
  companies: () => request<CompanyRef[]>('/companies'),
  plan: (query: string) =>
    request<QueryPlan>('/queries/plan', { method: 'POST', body: JSON.stringify({ query }) }),
  screen: (query: string) =>
    request<ScreenResult>('/screener', { method: 'POST', body: JSON.stringify({ query }) }),
  analyze: (input: { ticker?: string; query?: string }) =>
    request<AnalysisResult>('/analyses', { method: 'POST', body: JSON.stringify(input) }),
  recent: (limit = 8) => request<AnalysisResult[]>(`/analyses?limit=${limit}`),
};
