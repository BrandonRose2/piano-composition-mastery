import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  // Username/password is the active portal authentication method. Stale OAuth
  // callback URLs are sent safely to the local sign-in screen instead of failing.
  app.get("/api/oauth/callback", redirectLegacyOAuthCallback);
}

export function redirectLegacyOAuthCallback(_req: Request, res: Pick<Response, "redirect">) {
  res.redirect(302, "/login");
}
