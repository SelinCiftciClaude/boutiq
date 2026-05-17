// URL regex — http/https ile başlayan, boşluk içermeyen URL'leri yakalar
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
// URL sonundaki noktalama temizle
const TRAILING_PUNCT = /[.,;!?)\]'"»›»]+$/;

/**
 * Paylaşılan içerikten (text veya webUrl) ilk geçerli HTTP/HTTPS URL'yi çıkarır.
 * - webUrl: iOS share extension'dan gelen temiz URL (öncelikli)
 * - text: Android SEND intent'ten gelen metin (URL içerebilir)
 */
export function extractUrlFromSharedContent(
  text?: string | null,
  webUrl?: string | null,
): string | null {
  // 1. iOS share extension — temiz doğrudan URL
  if (webUrl) {
    const cleaned = cleanUrl(webUrl);
    if (isValidHttpUrl(cleaned)) return cleaned;
  }

  // 2. Android SEND text/plain — metin içinden URL yakala
  if (text) {
    const matches = text.match(URL_REGEX);
    if (matches && matches.length > 0) {
      const url = cleanUrl(matches[0]);
      if (isValidHttpUrl(url)) return url;
    }
    // Metnin kendisi boşluksuz bir URL olabilir (protokolsüz)
    const trimmed = text.trim();
    if (!trimmed.includes(' ') && trimmed.includes('.') && !trimmed.startsWith('http')) {
      const withProtocol = `https://${trimmed}`;
      if (isValidHttpUrl(withProtocol)) return withProtocol;
    }
  }

  return null;
}

function isValidHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function cleanUrl(url: string): string {
  return url.replace(TRAILING_PUNCT, '');
}
