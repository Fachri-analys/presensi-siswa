import { createConfiguredApiClient } from "./api-client";
import type { AuthRepository, LoginCredentials, SessionUser } from "./contracts";
import { decodeSessionUser } from "./decoders";

export function createApiAuthRepository(fetcher?: typeof fetch): AuthRepository | null {
  const request = createConfiguredApiClient(fetcher);
  if (!request) return null;

  return {
    async login(credentials: LoginCredentials, signal?: AbortSignal): Promise<SessionUser> {
      return request(
        "auth/login",
        {
          method: "POST",
          body: {
            email: credentials.identifier,
            password: credentials.password,
          },
          signal,
        },
        decodeSessionUser,
      );
    },

    async logout(signal?: AbortSignal): Promise<void> {
      return request(
        "auth/logout",
        {
          method: "POST",
          signal,
        },
        () => undefined,
      );
    },

    async getSession(signal?: AbortSignal): Promise<SessionUser | null> {
      try {
        return await request(
          "auth/me",
          {
            method: "GET",
            signal,
          },
          decodeSessionUser,
        );
      } catch (error: unknown) {
        if (typeof error === "object" && error !== null && "status" in error && error.status === 401) {
          return null;
        }
        throw error;
      }
    },
  };
}
