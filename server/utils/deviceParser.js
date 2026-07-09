// utils/deviceParser.js
// Small dependency-free UA parser — good enough for a "device · browser"
// label in the sessions UI. Not exhaustive; falls back to "Unknown" cleanly.

export function parseDevice(userAgent = "") {
  const ua = userAgent.toLowerCase();

  let device = "Unknown device";
  if (/ipad/.test(ua)) device = "iPad";
  else if (/iphone/.test(ua)) device = "iPhone";
  else if (/android/.test(ua)) device = /mobile/.test(ua) ? "Android phone" : "Android tablet";
  else if (/macintosh|mac os/.test(ua)) device = "Mac";
  else if (/windows/.test(ua)) device = "Windows PC";
  else if (/linux/.test(ua)) device = "Linux PC";

  let browser = "Unknown browser";
  if (/edg\//.test(ua)) browser = "Edge";
  else if (/opr\/|opera/.test(ua)) browser = "Opera";
  else if (/chrome\//.test(ua) && !/edg\//.test(ua)) browser = "Chrome";
  else if (/firefox\//.test(ua)) browser = "Firefox";
  else if (/safari\//.test(ua) && !/chrome\//.test(ua)) browser = "Safari";

  return { device, browser };
}
