import { KeyVisualState } from "../types";

const DEFAULT_COLORS: Record<KeyVisualState, string> = {
  active: "#2E9F45",
  inactive: "#23333D",
  mixed: "#A77A12",
  disabled: "#6D7176"
};

function sanitizeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function chunkWord(word: string, maxChunkLength: number): string[] {
  if (word.length <= maxChunkLength) {
    return [word];
  }

  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < word.length) {
    chunks.push(word.slice(cursor, cursor + maxChunkLength));
    cursor += maxChunkLength;
  }
  return chunks;
}

function trimWithEllipsis(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  if (maxLength <= 3) {
    return value.slice(0, maxLength);
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

function wrapTitle(title: string, maxLineLength: number, maxLines: number): string[] {
  const normalizedTitle = title.trim().replace(/\s+/g, " ");
  if (!normalizedTitle) {
    return [""];
  }

  const words = normalizedTitle.split(" ").flatMap((word) => chunkWord(word, maxLineLength));
  const lines: string[] = [];

  for (const word of words) {
    const previous = lines[lines.length - 1];
    if (!previous) {
      lines.push(word);
      continue;
    }

    if ((previous + " " + word).length <= maxLineLength) {
      lines[lines.length - 1] = `${previous} ${word}`;
    } else {
      lines.push(word);
    }

    if (lines.length === maxLines) {
      break;
    }
  }

  if (words.length > 0 && lines.length > 0) {
    const usedWords = lines.join(" ").split(" ").filter(Boolean).length;
    if (usedWords < words.length) {
      lines[lines.length - 1] = trimWithEllipsis(lines[lines.length - 1], maxLineLength);
    }
  }

  return lines;
}

function encodeSvg(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

export function buildEmptyKeyImage(): string {
  return encodeSvg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
  <rect x="0" y="0" width="144" height="144" fill="rgba(0,0,0,0)" />
</svg>`
  );
}

export function buildKeyImage(options: {
  title: string;
  state: KeyVisualState;
  color?: string;
  subtitle?: string;
}): string {
  const subtitle = options.subtitle?.trim();
  const hasSubtitle = Boolean(subtitle);
  const maxTitleLines = hasSubtitle ? 2 : 3;
  const maxLineLength = hasSubtitle ? 10 : 12;
  const titleLines = wrapTitle(options.title || " ", maxLineLength, maxTitleLines);
  const background = options.color ?? DEFAULT_COLORS[options.state];
  const longestTitleLine = Math.max(...titleLines.map((line) => line.length), 0);

  let titleFontSize = 23;
  if (titleLines.length >= 3) {
    titleFontSize = 18;
  } else if (titleLines.length === 2) {
    titleFontSize = 20;
  }
  if (longestTitleLine >= 12) {
    titleFontSize = Math.min(titleFontSize, 17);
  } else if (longestTitleLine >= 10) {
    titleFontSize = Math.min(titleFontSize, 19);
  }

  const titleYStart = hasSubtitle ? 42 : 36;
  const titleLineHeight = titleFontSize + 4;

  const titleSvg = titleLines
    .map((line, index) => {
      const y = titleYStart + index * titleLineHeight;
      return `<text x=\"72\" y=\"${y}\" text-anchor=\"middle\">${sanitizeText(line)}</text>`;
    })
    .join("");

  const subtitleSvg = subtitle
    ? `<text x=\"72\" y=\"126\" class=\"sub\" text-anchor=\"middle\">${sanitizeText(subtitle)}</text>`
    : "";

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
  <defs>
    <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${background}" stop-opacity="0.98" />
      <stop offset="100%" stop-color="#111" stop-opacity="0.88" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="144" height="144" rx="18" fill="url(#g)" />
  <rect x="4" y="4" width="136" height="136" rx="14" fill="none" stroke="rgba(255,255,255,0.15)" />
  <style>
    text { font-size: ${titleFontSize}px; font-family: Arial, Helvetica, sans-serif; fill: #fff; font-weight: 700; }
    .sub { font-size: 13px; fill: rgba(255,255,255,0.82); font-weight: 600; }
  </style>
  ${titleSvg}
  ${subtitleSvg}
</svg>`.trim();

  return encodeSvg(svg);
}
