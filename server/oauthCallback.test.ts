import { describe, expect, it, vi } from "vitest";
import { LOCAL_LOGIN_PATH } from "@shared/authRouting";
import { COOKIE_NAME } from "@shared/const";
import { createOAuthCallbackHandler } from "./_core/oauth";

describe("Manus OAuth callback routing", () => {
  it("uses the local login route for a callback error destination", () => {
    const callbackErrorDestination = `${LOCAL_LOGIN_PATH}?authError=manus_sign_in_failed`;
    expect(callbackErrorDestination).toBe("/login?authError=manus_sign_in_failed");
  });

  it("exchanges a valid callback, creates a session, and returns the user to their library", async () => {
    const exchangeCodeForToken = vi.fn().mockResolvedValue({ accessToken: "access-token" });
    const getUserInfo = vi.fn().mockResolvedValue({
      openId: "manus-user-1",
      name: "Brandon Rose",
      email: "brandon@apartmentcorp.com",
      loginMethod: "email",
    });
    const upsertUser = vi.fn().mockResolvedValue(undefined);
    const createSessionToken = vi.fn().mockResolvedValue("signed-session-token");
    const getSessionCookieOptions = vi.fn().mockReturnValue({ httpOnly: true, path: "/" });
    const redirect = vi.fn();
    const cookie = vi.fn();

    await createOAuthCallbackHandler({
      exchangeCodeForToken,
      getUserInfo,
      upsertUser,
      createSessionToken,
      getSessionCookieOptions,
    })(
      { query: { code: "valid-code", state: "valid-state" } } as any,
      { redirect, cookie },
    );

    expect(exchangeCodeForToken).toHaveBeenCalledWith("valid-code", "valid-state");
    expect(upsertUser).toHaveBeenCalledWith(expect.objectContaining({
      openId: "manus-user-1",
      email: "brandon@apartmentcorp.com",
    }));
    expect(createSessionToken).toHaveBeenCalledWith("manus-user-1", expect.objectContaining({ name: "Brandon Rose" }));
    expect(cookie).toHaveBeenCalledWith(COOKIE_NAME, "signed-session-token", expect.objectContaining({ httpOnly: true }));
    expect(redirect).toHaveBeenCalledWith(302, "/");
  });
});
