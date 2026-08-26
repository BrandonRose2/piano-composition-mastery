import { describe, expect, it, vi } from "vitest";
import { redirectLegacyOAuthCallback } from "./_core/oauth";

describe("legacy OAuth callback", () => {
  it("redirects stale OAuth callback URLs safely to local login", () => {
    const redirect = vi.fn();
    redirectLegacyOAuthCallback({} as any, { redirect } as any);
    expect(redirect).toHaveBeenCalledWith(302, "/login");
  });
});
