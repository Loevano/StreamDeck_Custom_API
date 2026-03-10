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

function wrapTitle(title: string, maxLineLength = 11): string[] {
  const words = title.trim().split(/\s+/);
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

    if (lines.length === 3) {
      break;
    }
  }

  if (lines.length === 0) {
    lines.push("");
  }

  return lines;
}

export function buildKeyImage(options: {
  title: string;
  state: KeyVisualState;
  color?: string;
  subtitle?: string;
}): string {
  const titleLines = wrapTitle(options.title || " ");
  const subtitle = options.subtitle?.trim();
  const background = options.color ?? DEFAULT_COLORS[options.state];

  const titleYStart = subtitle ? 40 : 50;
  const titleLineHeight = 24;

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
    text { font-size: 21px; font-family: Arial, Helvetica, sans-serif; fill: #fff; font-weight: 700; }
    .sub { font-size: 14px; fill: rgba(255,255,255,0.78); font-weight: 500; }
  </style>
  ${titleSvg}
  ${subtitleSvg}
</svg>`.trim();

  const encoded = Buffer.from(svg, "utf8").toString("base64");
  return `data:image/svg+xml;base64,${encoded}`;
}
