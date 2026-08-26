/**
 * Stroke-order path data for Japanese characters, from KanjiVG.
 *
 * KanjiVG covers hiragana, katakana and kanji. The previous source,
 * hanzi-writer-data, is built from a Chinese dataset and has no kana at all —
 * every kana request 404'd, which is why the Writing screen could never
 * animate.
 *
 * Each KanjiVG path is the centre line the pen travels, so a path can be
 * stroked and revealed directly with a dash offset. No median or clip-path
 * reconstruction is needed.
 *
 * Data is CC BY-SA 3.0 and requires attribution — see the About screen.
 * https://kanjivg.tagaini.net
 */

import { readCache, writeCache } from "@/lib/offline-cache";

/** KanjiVG authors every glyph on a 109x109 grid. */
export const STROKE_VIEWBOX = 109;

/** Namespace for persisted stroke data, keyed by KanjiVG file name. */
const STROKE_CACHE_PREFIX = "strokes-";

export interface StrokePath {
  /** SVG path data for one stroke, in stroke order. */
  d: string;
  /** Approximate length, used to drive the dash offset. */
  length: number;
}

const cache = new Map<string, StrokePath[] | null>();

function fileNameFor(character: string): string | null {
  const codePoint = character.codePointAt(0);
  if (codePoint === undefined) return null;
  return codePoint.toString(16).padStart(5, "0");
}

/** Length of a cubic bezier, approximated by sampling. */
function cubicLength(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number
): number {
  const SAMPLES = 16;
  let length = 0;
  let px = x0;
  let py = y0;

  for (let i = 1; i <= SAMPLES; i += 1) {
    const t = i / SAMPLES;
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    const x = a * x0 + b * x1 + c * x2 + d * x3;
    const y = a * y0 + b * y1 + c * y2 + d * y3;
    length += Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }

  return length;
}

/**
 * Measures an SVG path. KanjiVG uses only M, C and c, but the other common
 * commands are handled so an unexpected glyph cannot silently measure as zero.
 */
export function measurePath(d: string): number {
  const tokens = d.match(/[MmLlHhVvCcSsZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  let i = 0;
  let command = "";
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;
  // Last cubic control point, needed to reflect for S/s.
  let lastCx = 0;
  let lastCy = 0;
  let total = 0;

  const num = () => parseFloat(tokens[i++]);
  const line = (x: number, y: number) => {
    total += Math.hypot(x - cx, y - cy);
    cx = x;
    cy = y;
  };
  const cubic = (x1: number, y1: number, x2: number, y2: number, x: number, y: number) => {
    total += cubicLength(cx, cy, x1, y1, x2, y2, x, y);
    lastCx = x2;
    lastCy = y2;
    cx = x;
    cy = y;
  };

  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) command = tokens[i++];
    if (i >= tokens.length && !/[Zz]/.test(command)) break;

    switch (command) {
      case "M":
        cx = num();
        cy = num();
        startX = cx;
        startY = cy;
        // A repeated coordinate pair after M is an implicit lineto.
        command = "L";
        break;
      case "m":
        cx += num();
        cy += num();
        startX = cx;
        startY = cy;
        command = "l";
        break;
      case "L":
        line(num(), num());
        break;
      case "l":
        line(cx + num(), cy + num());
        break;
      case "H":
        line(num(), cy);
        break;
      case "h":
        line(cx + num(), cy);
        break;
      case "V":
        line(cx, num());
        break;
      case "v":
        line(cx, cy + num());
        break;
      case "C": {
        const x1 = num();
        const y1 = num();
        const x2 = num();
        const y2 = num();
        cubic(x1, y1, x2, y2, num(), num());
        break;
      }
      case "c": {
        const x1 = cx + num();
        const y1 = cy + num();
        const x2 = cx + num();
        const y2 = cy + num();
        cubic(x1, y1, x2, y2, cx + num(), cy + num());
        break;
      }
      case "S": {
        const x1 = 2 * cx - lastCx;
        const y1 = 2 * cy - lastCy;
        const x2 = num();
        const y2 = num();
        cubic(x1, y1, x2, y2, num(), num());
        break;
      }
      case "s": {
        const x1 = 2 * cx - lastCx;
        const y1 = 2 * cy - lastCy;
        const x2 = cx + num();
        const y2 = cy + num();
        cubic(x1, y1, x2, y2, cx + num(), cy + num());
        break;
      }
      case "Z":
      case "z":
        line(startX, startY);
        i = tokens.length;
        break;
      default:
        // Unrecognised command — stop rather than loop forever.
        i = tokens.length;
        break;
    }
  }

  // A zero length would make the dash maths degenerate and hide the stroke.
  return Math.max(total, 1);
}

/**
 * Fetches the ordered stroke paths for a character, or null when KanjiVG has
 * no entry for it. Results are memoised for the session, including misses.
 */
export async function fetchStrokePaths(character: string): Promise<StrokePath[] | null> {
  const cached = cache.get(character);
  if (cached !== undefined) return cached;

  const fileName = fileNameFor(character);
  if (!fileName) {
    cache.set(character, null);
    return null;
  }

  let response: Response;
  try {
    response = await fetch(
      `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${fileName}.svg`
    );
  } catch (networkError) {
    // Offline. A character studied before is still on the device, so the
    // animation keeps working in a tunnel rather than falling back to a
    // static glyph.
    const stored = await readCache<StrokePath[]>(`${STROKE_CACHE_PREFIX}${fileName}`);
    if (stored) {
      cache.set(character, stored.data);
      return stored.data;
    }
    throw networkError;
  }

  if (!response.ok) {
    cache.set(character, null);
    return null;
  }

  const svg = await response.text();

  // Paths appear in stroke order. Stroke-number labels are <text>, not <path>,
  // so they are naturally excluded.
  const paths: StrokePath[] = [];
  const pattern = /<path[^>]*\sd="([^"]+)"/g;
  let match = pattern.exec(svg);
  while (match !== null) {
    paths.push({ d: match[1], length: measurePath(match[1]) });
    match = pattern.exec(svg);
  }

  const result = paths.length > 0 ? paths : null;
  cache.set(character, result);
  // Persist so the next launch, and any launch without a connection, can draw
  // this character without reaching the network.
  if (result) void writeCache(`${STROKE_CACHE_PREFIX}${fileName}`, result);
  return result;
}
