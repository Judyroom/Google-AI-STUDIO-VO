import { UILanguage } from '../types';

/**
 * Parse a JSON API response and throw a readable error when the request failed.
 * Handles non-JSON bodies (e.g. an HTML error page while the Render instance is
 * waking up) instead of surfacing "Unexpected token '<'".
 */
export async function parseApiResponse<T = any>(res: Response, uiLang: UILanguage): Promise<T> {
  const raw = await res.text();
  let data: any;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(
      uiLang === 'zh'
        ? `服务器暂时不可用（HTTP ${res.status}），可能正在唤醒，请等几十秒再试。`
        : `The server is temporarily unavailable (HTTP ${res.status}). It may be waking up, please retry in a few seconds.`
    );
  }
  if (!res.ok || data?.success === false) {
    throw new Error(data?.error || (uiLang === 'zh' ? `请求失败（HTTP ${res.status}）` : `Request failed (HTTP ${res.status})`));
  }
  return data as T;
}

/** Max characters accepted for a single synthesis request (mirrored on the server). */
export const MAX_TEXT_LENGTH = 3000;
