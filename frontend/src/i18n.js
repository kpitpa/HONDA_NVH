/**
 * Translation system with MarianMT backend + local cache.
 *
 * Usage in components:
 *   const t = useTranslate();
 *   <span>{t('Main NVH Workspace')}</span>
 *
 * When langMode === 'en', returns the English string as-is.
 * When langMode === 'ja', fetches Japanese from /api/translate (cached).
 * When langMode === 'both', returns "English / 日本語".
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from './context/AppContext';
import api from './api';

// ── Persistent translation cache (survives re-renders) ──
const cache = {};          // { "en_to_ja:Hello": "こんにちは" }
const pending = new Set(); // texts currently being fetched

// Queue + debounce for batching
let queue = [];
let queueTimer = null;
const BATCH_DELAY = 80;    // ms — collect texts for 80ms then fire one request

function getCacheKey(text, src, tgt) {
  return `${src}_to_${tgt}:${text}`;
}

// Try to restore cache from localStorage
try {
  const saved = localStorage.getItem('nvh-tl-cache');
  if (saved) Object.assign(cache, JSON.parse(saved));
} catch {}

function persistCache() {
  try { localStorage.setItem('nvh-tl-cache', JSON.stringify(cache)); } catch {}
}

function flushQueue(onUpdate) {
  if (queue.length === 0) return;
  const batch = [...new Set(queue)]; // deduplicate
  queue = [];

  api.post('/api/translate', { texts: batch, source: 'en', target: 'ja' })
    .then(({ data }) => {
      data.translations.forEach((tr, i) => {
        const key = getCacheKey(batch[i], 'en', 'ja');
        cache[key] = tr;
        pending.delete(batch[i]);
      });
      persistCache();
      onUpdate(); // trigger re-render
    })
    .catch(() => {
      batch.forEach(t => pending.delete(t));
    });
}

/**
 * Legacy helper kept for backward compatibility.
 * Usage: tr(langMode, 'English text', '日本語テキスト')
 */
export function tr(langMode, en, ja) {
  if (langMode === 'ja') return ja;
  if (langMode === 'both') return `${en} / ${ja}`;
  return en;
}

/**
 * React hook: returns a `t(englishString)` function.
 * Automatically translates to Japanese via the MarianMT backend.
 */
export function useTranslate() {
  const { langMode } = useApp();
  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick(t => t + 1), []);

  const t = useCallback((en) => {
    if (!en) return '';
    if (langMode === 'en') return en;

    const key = getCacheKey(en, 'en', 'ja');
    const ja = cache[key];

    if (ja !== undefined) {
      return langMode === 'both' ? `${en} / ${ja}` : ja;
    }

    // Not cached — queue for batch fetch
    if (!pending.has(en)) {
      pending.add(en);
      queue.push(en);
      clearTimeout(queueTimer);
      queueTimer = setTimeout(() => flushQueue(forceUpdate), BATCH_DELAY);
    }

    // Return English while loading
    return en;
  }, [langMode, forceUpdate]);

  return t;
}

export default tr;
