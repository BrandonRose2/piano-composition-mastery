export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getLocalLoginUrl } from "@shared/authRouting";

// Compatibility export retained for existing call sites. Authentication is local.
export const getLoginUrl = () => {
  return getLocalLoginUrl();
};
