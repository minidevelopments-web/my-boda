export const PRICING_EMAIL = "minidevelopments@gmail.com";
export const SELF_HOST_URL = "https://github.com/minidevelopments-web/my-boda";
export const COMMERCIAL_LICENSE_URL = `${SELF_HOST_URL}/blob/main/COMMERCIAL.md`;

function mailto(subject: string): string {
  return `mailto:${PRICING_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

export const HOSTED_ORDER_HREF = mailto("my-boda Hosted Pro order");
export const COMMERCIAL_LICENSE_HREF = mailto("my-boda commercial license");
