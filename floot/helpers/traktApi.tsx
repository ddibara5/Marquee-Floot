import { importHttp } from "./marqueeImportHttp";
const AUTH_BASE = "https://auth.trakt.tv/oauth";
const API_BASE = "https://api.trakt.tv";

const getClientId = () => {
  const value = process.env.TRAKT_CLIENT_ID;
  if (!value) throw new Error("TRAKT_CLIENT_ID is not configured");
  return value;
};

const getClientSecret = () => {
  const value = process.env.TRAKT_CLIENT_SECRET;
  if (!value) throw new Error("TRAKT_CLIENT_SECRET is not configured");
  return value;
};

const baseHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "User-Agent": "MarqueeTraktSync/1.0 (github.com/ddibara5/marquee)",
};

export type TraktDeviceChallenge = {
  device_code: string;
  user_code: string;
  verification_url: string;
  expires_in: number;
  interval: number;
};

export type TraktTokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
  created_at?: number;
};

export type TraktHistoryItem = {
  id: number;
  watched_at: string;
  action?: string;
  episode?: {
    season: number;
    number: number;
    title?: string;
    ids: {
      trakt?: number;
      tmdb?: number;
      tvdb?: number;
      imdb?: string;
    };
  };
  show?: {
    title: string;
    year?: number;
    ids: {
      trakt?: number;
      tmdb?: number;
      tvdb?: number;
      imdb?: string;
    };
  };
  movie?: {
    title: string;
    year?: number;
    ids: {
      trakt?: number;
      tmdb?: number;
      imdb?: string;
    };
  };
};

const parseJson = async <T,>(response: Response): Promise<T> => {
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
};

export const requestTraktDeviceCode = async () => {
  const response = await fetch(AUTH_BASE + "/device/code", {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({ client_id: getClientId() }),
  });

  if (!response.ok) {
    throw new Error("Trakt device-code request failed (" + response.status + ")");
  }

  return parseJson<TraktDeviceChallenge>(response);
};

export const pollTraktDeviceToken = async (deviceCode: string) => {
  const response = await fetch(AUTH_BASE + "/device/token", {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({
      code: deviceCode,
      client_id: getClientId(),
      client_secret: getClientSecret(),
    }),
  });

  if (response.status === 400 || response.status === 429) {
    return { status: "pending" as const, httpStatus: response.status };
  }
  if (response.status === 410) {
    return { status: "expired" as const, httpStatus: response.status };
  }
  if (response.status === 418) {
    return { status: "denied" as const, httpStatus: response.status };
  }
  if (!response.ok) {
    throw new Error("Trakt authorization failed (" + response.status + ")");
  }

  return {
    status: "connected" as const,
    token: await parseJson<TraktTokenResponse>(response),
  };
};

export const refreshTraktToken = async (refreshToken: string) => {
  const response = await importHttp(AUTH_BASE + "/token", {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({
      refresh_token: refreshToken,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: "urn:ietf:wg:oauth:2.0:oob",
      grant_type: "refresh_token",
    }),
  }, "TRAKT_REFRESH", false).catch(error => {
    if (error instanceof Error && /HTTP_(400|401|403)$/.test(error.message)) throw new Error("TRAKT_CREDENTIAL_RECONNECT_REQUIRED");
    throw error;
  });

  if (!response.ok) {
    throw new Error("Trakt token refresh failed (" + response.status + ")");
  }

  return parseJson<TraktTokenResponse>(response);
};

const apiHeaders = (accessToken: string) => ({
  Accept: "application/json",
  Authorization: "Bearer " + accessToken,
  "trakt-api-version": "2",
  "trakt-api-key": getClientId(),
  "User-Agent": baseHeaders["User-Agent"],
});

export const fetchTraktHistory = async (
  accessToken: string,
  type: "episodes" | "movies",
  startAt: Date
) => {
  const all: TraktHistoryItem[] = [];
  let page = 1;
  let pageCount = 1;
  let expectedCount: number | null = null;

  do {
    const params = new URLSearchParams({
      start_at: startAt.toISOString(),
      page: String(page),
      limit: "100",
    });

    const response = await fetch(
      API_BASE + "/sync/history/" + type + "?" + params.toString(),
      { headers: apiHeaders(accessToken) }
    );

    if (!response.ok) {
      throw new Error(
        "Trakt " + type + " history request failed (" + response.status + ")"
      );
    }

    const rows = await parseJson<TraktHistoryItem[]>(response);
    if (!Array.isArray(rows)) throw new Error("Invalid Trakt history snapshot");
    all.push(...rows);

    const rawPageCount = Number(
      response.headers.get("x-pagination-page-count") ?? "1"
    );
    if (!Number.isInteger(rawPageCount) || rawPageCount < 0 || rawPageCount > 500 ||
        (rawPageCount === 0 && rows.length !== 0))
      throw new Error("Invalid Trakt history pagination");
    pageCount = rawPageCount;
    const count = response.headers.get("x-pagination-item-count");
    if (count !== null) {
      const parsed = Number(count);
      if (!Number.isInteger(parsed) || parsed < 0)
        throw new Error("Invalid Trakt history item count");
      expectedCount = parsed;
    }
    page += 1;
  } while (page <= pageCount);

  if (expectedCount !== null && all.length !== expectedCount)
    throw new Error("Incomplete Trakt history snapshot");
  return all;
};

export const traktTokenExpiry = (token: TraktTokenResponse) => {
  const createdMs = token.created_at
    ? token.created_at * 1000
    : Date.now();
  const expiresSeconds =
    typeof token.expires_in === "number" && token.expires_in > 0
      ? token.expires_in
      : 7 * 24 * 60 * 60;
  return new Date(createdMs + expiresSeconds * 1000);
};