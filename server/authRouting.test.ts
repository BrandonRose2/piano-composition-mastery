import { describe, expect, it } from "vitest";
import { LOCAL_LOGIN_PATH, getLocalLoginUrl, shouldRedirectToLocalLogin } from "@shared/authRouting";

describe("local authentication routing", () => {
  it("keeps unauthenticated users on the in-app login route", () => {
    expect(getLocalLoginUrl()).toBe("/login");
    expect(LOCAL_LOGIN_PATH).toBe("/login");
  });

  it("redirects only after auth resolves on a protected route", () => {
    expect(shouldRedirectToLocalLogin({
      loading: false,
      hasUser: false,
      hasRedirected: false,
      location: "/auto-import",
    })).toBe(true);
    expect(shouldRedirectToLocalLogin({
      loading: true,
      hasUser: false,
      hasRedirected: false,
      location: "/auto-import",
    })).toBe(false);
    expect(shouldRedirectToLocalLogin({
      loading: false,
      hasUser: false,
      hasRedirected: false,
      location: "/login",
    })).toBe(false);
  });
});
