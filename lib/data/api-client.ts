export type ApiErrorCode =
  | "NETWORK_ERROR"
  | "REQUEST_ABORTED"
  | "INVALID_RESPONSE"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "HTTP_ERROR";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number | null;
  readonly requestId: string | null;

  constructor(
    code: ApiErrorCode,
    status: number | null,
    requestId: string | null,
    options?: ErrorOptions,
  ) {
    super("Permintaan belum berhasil. Coba lagi atau hubungi administrator sekolah.", options);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

export type Decoder<T> = (value: unknown) => T;
const REQUEST_TIMEOUT_MS = 15_000;
export type ApiRequestOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: unknown;
  headers?: HeadersInit;
  query?: Record<string, string | number | boolean | null | undefined>;
};

export function getApiBaseUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!configured) return null;
  return configured.endsWith("/") ? configured : `${configured}/`;
}

export function createConfiguredApiClient(fetcher?: typeof fetch) {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return null;
  return createApiClient(baseUrl, fetcher);
}

export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Terjadi kendala. Coba lagi beberapa saat.";
  switch (error.code) {
    case "NETWORK_ERROR":
      return "Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.";
    case "REQUEST_ABORTED":
      return "Permintaan dibatalkan.";
    case "UNAUTHENTICATED":
      return "Sesi Anda berakhir. Silakan masuk kembali.";
    case "FORBIDDEN":
      return "Anda tidak memiliki izin untuk melakukan tindakan ini.";
    case "NOT_FOUND":
      return "Data yang diminta tidak ditemukan atau sudah dihapus.";
    case "VALIDATION_ERROR":
      return "Periksa kembali data yang diisi.";
    case "CONFLICT":
      return "Data berubah sejak terakhir dimuat. Muat ulang data lalu coba lagi.";
    case "RATE_LIMITED":
      return "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.";
    case "INVALID_RESPONSE":
      return "Server mengirim data yang belum dapat dibaca. Hubungi administrator sekolah.";
    case "SERVER_ERROR":
      return error.requestId
        ? `Server sedang mengalami kendala. Sampaikan kode ${error.requestId} kepada administrator sekolah.`
        : "Server sedang mengalami kendala. Coba lagi atau hubungi administrator sekolah.";
    case "HTTP_ERROR":
      return "Permintaan belum berhasil. Coba lagi atau hubungi administrator sekolah.";
  }
}

const API_ERROR_CODES: Record<number, ApiErrorCode> = {
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "VALIDATION_ERROR",
  429: "RATE_LIMITED",
};

export function createApiClient(baseUrl: string, fetcher: typeof fetch = fetch) {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  let base: URL;
  try {
    base = new URL(normalizedBase);
  } catch (cause) {
    throw new TypeError("URL backend harus berupa URL absolut yang valid.", { cause });
  }
  if (base.protocol !== "https:" && base.hostname !== "localhost" && base.hostname !== "127.0.0.1") {
    throw new TypeError("URL backend produksi harus menggunakan HTTPS.");
  }
  if (base.username || base.password || base.search || base.hash) {
    throw new TypeError("URL backend tidak boleh berisi kredensial, query, atau fragment.");
  }

  return async function request<T>(path: string, options: ApiRequestOptions, decode: Decoder<T>): Promise<T> {
    if (!path || path.startsWith("/") || path.split("/").some((segment) => {
      try {
        const decodedSegment = decodeURIComponent(segment);
        return decodedSegment === "." || decodedSegment === "..";
      } catch {
        return true;
      }
    })) {
      throw new TypeError("Path API harus relatif terhadap URL dasar dan tidak boleh naik direktori.");
    }

    const url = new URL(path, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) {
      throw new TypeError("Path API harus tetap berada di origin dan direktori URL dasar.");
    }
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== null && value !== undefined) url.searchParams.set(key, String(value));
    }

    const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
    const headers = new Headers(options.headers);
    if (options.body !== undefined) headers.set("Content-Type", "application/json");
    headers.set("Accept", "application/json");
    const requestOptions = { ...options };
    delete requestOptions.body;
    delete requestOptions.query;
    delete requestOptions.headers;

    let response: Response;
    try {
      response = await fetcher(url, {
        ...requestOptions,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        credentials: "include",
        headers,
        signal,
      });
    } catch (cause) {
      if (timeoutSignal.aborted) {
        throw new ApiError("NETWORK_ERROR", null, null, { cause });
      }
      if (options.signal?.aborted || (cause instanceof DOMException && cause.name === "AbortError")) {
        throw new ApiError("REQUEST_ABORTED", null, null, { cause });
      }
      throw new ApiError("NETWORK_ERROR", null, null, { cause });
    }

    const requestId = response.headers.get("x-request-id");
    if (!response.ok) {
      const code = API_ERROR_CODES[response.status] ?? (response.status >= 500 ? "SERVER_ERROR" : "HTTP_ERROR");
      throw new ApiError(code, response.status, requestId);
    }

    if (response.status === 204) {
      try {
        return decode(undefined);
      } catch (cause) {
        throw new ApiError("INVALID_RESPONSE", response.status, requestId, { cause });
      }
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!/application\/(?:[\w.-]+\+)?json\b/i.test(contentType)) {
      throw new ApiError("INVALID_RESPONSE", response.status, requestId);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (cause) {
      if (timeoutSignal.aborted) {
        throw new ApiError("NETWORK_ERROR", response.status, requestId, { cause });
      }
      if (options.signal?.aborted || (cause instanceof DOMException && cause.name === "AbortError")) {
        throw new ApiError("REQUEST_ABORTED", response.status, requestId, { cause });
      }
      throw new ApiError("INVALID_RESPONSE", response.status, requestId, { cause });
    }
    try {
      return decode(payload);
    } catch (cause) {
      if (cause instanceof ApiError) throw cause;
      throw new ApiError("INVALID_RESPONSE", response.status, requestId, { cause });
    }
  };
}
