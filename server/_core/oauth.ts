import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

type OAuthCallbackDependencies = {
  exchangeCodeForToken: (code: string, state: string) => Promise<{ accessToken: string }>;
  getUserInfo: (accessToken: string) => Promise<{ openId?: string; name?: string | null; email?: string | null; loginMethod?: string | null; platform?: string | null }>;
  upsertUser: typeof db.upsertUser;
  createSessionToken: typeof sdk.createSessionToken;
  getSessionCookieOptions: typeof getSessionCookieOptions;
};

const oauthCallbackDependencies: OAuthCallbackDependencies = {
  exchangeCodeForToken: (code, state) => sdk.exchangeCodeForToken(code, state),
  getUserInfo: (accessToken) => sdk.getUserInfo(accessToken),
  upsertUser: db.upsertUser,
  createSessionToken: (openId, options) => sdk.createSessionToken(openId, options),
  getSessionCookieOptions,
};

export function createOAuthCallbackHandler(dependencies: OAuthCallbackDependencies = oauthCallbackDependencies) {
  return async (req: Request, res: Pick<Response, "redirect" | "cookie">) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.redirect(302, "/login?authError=missing_callback_data");
      return;
    }

    try {
      const tokenResponse = await dependencies.exchangeCodeForToken(code, state);
      const userInfo = await dependencies.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        throw new Error("Manus account response did not include an account identity");
      }

      const displayName = userInfo.name || userInfo.email || "Pianist";
      await dependencies.upsertUser({
        openId: userInfo.openId,
        name: displayName,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? "manus",
        lastSignedIn: new Date(),
      });

      const sessionToken = await dependencies.createSessionToken(userInfo.openId, {
        name: displayName,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = dependencies.getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[OAuth] Callback failed", { message });
      res.redirect(302, "/login?authError=manus_sign_in_failed");
    }
  };
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", createOAuthCallbackHandler());
}
