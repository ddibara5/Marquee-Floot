// Labels for the "Also saved" line on Send feedback (October 20).

/** iPhone / iPad / Android / Mac / Windows / Other. iPadOS reports a Mac user agent, so touch points tell them apart. */
export function deviceName(userAgent: string, maxTouchPoints = 0) {
  if (/iPhone|iPod/.test(userAgent)) return "iPhone";
  if (/iPad/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)) return "iPad";
  if (/Android/.test(userAgent)) return "Android";
  if (/Macintosh|Mac OS X/.test(userAgent)) return "Mac";
  if (/Windows/.test(userAgent)) return "Windows";
  return "Other";
}

/** A readable screen name from the route, e.g. "/settings/account" becomes "Settings, Account". */
export function screenName(pathname: string) {
  const parts = pathname.split("/").filter(Boolean).map(part => part.replace(/-/g, " "));
  if (!parts.length) return "Home";
  return parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(", ");
}
