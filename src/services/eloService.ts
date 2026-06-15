import type { EloData } from '../types';

// ELO data is now fetched by the server (which caches it and has no CORS issues).
// The frontend just calls the proxy endpoint.
export async function fetchTeamEloData(teamId: string): Promise<EloData | null> {
  try {
    const res = await fetch(`/api/elo/${teamId}`);
    if (!res.ok) return null;
    return await res.json() as EloData;
  } catch {
    return null;
  }
}
