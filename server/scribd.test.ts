/**
 * Validates that the SCRIBD_SESSION_COOKIE env var is set and that
 * a lightweight authenticated request to Scribd succeeds (HTTP 200).
 */
import { describe, it, expect } from "vitest";

describe("Scribd session cookie", () => {
  it("should have SCRIBD_SESSION_COOKIE set", () => {
    const cookie = process.env.SCRIBD_SESSION_COOKIE;
    expect(cookie, "SCRIBD_SESSION_COOKIE env var must be set").toBeTruthy();
    expect(cookie!.length, "Cookie value seems too short").toBeGreaterThan(20);
  });

  it("should authenticate successfully against Scribd", async () => {
    const cookie = process.env.SCRIBD_SESSION_COOKIE;
    if (!cookie) throw new Error("SCRIBD_SESSION_COOKIE not set");

    const res = await fetch("https://www.scribd.com/search?query=piano+sheet+music&content_type=documents", {
      headers: {
        "Cookie": `_scribd_session=${cookie}`,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,*/*",
      },
      redirect: "follow",
    });

    // 200 = authenticated, 302 to login = cookie expired
    expect(res.status, `Scribd returned ${res.status} — cookie may be expired`).toBe(200);
  }, 15000);
});
