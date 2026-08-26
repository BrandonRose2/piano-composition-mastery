/** The portal uses local username/password accounts; all unauthenticated routes return here. */
export const LOCAL_LOGIN_PATH = "/login";

export function getLocalLoginUrl(): string {
  return LOCAL_LOGIN_PATH;
}

/**
 * Keeps the render path pure: AuthGuard calls this from an effect and only
 * redirects after auth has resolved on a protected route.
 */
export function shouldRedirectToLocalLogin(input: {
  loading: boolean;
  hasUser: boolean;
  hasRedirected: boolean;
  location: string;
}): boolean {
  return !input.loading && !input.hasUser && !input.hasRedirected && input.location !== LOCAL_LOGIN_PATH;
}
