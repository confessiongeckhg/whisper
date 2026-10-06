// Renders a message as a branded, Instagram-Story-shaped image (1080x1920)
// and shares it as an actual image FILE via the Web Share API.
//
// Why an image file specifically: when a person picks Instagram from the
// native share sheet after sharing an image FILE (not just a link/text),
// modern iOS/Android open Instagram directly into "Add to Story" with that
// image pre-loaded as the background. Sharing plain text/links does not
// do this — Instagram has no public API for websites to push into Stories
// any other way.

// A handful of moody color palettes — one is picked at random per share so
// repeated shares don't all look identical. All stay dark/ink-toned to
// match the rest of the app.
const THEMES = [
  { bgFrom: '#100E17', bgTo: '#1B1626', glow1: '198,168,255', glow2: '255,115,150', accent: '#C6A8FF', accent2: '#FF7396' },
  { bgFrom: '#1A0E14', bgTo: '#241019', glow1: '255,159,192', glow2: '255,208,138', accent: '#FF9FC0', accent2: '#FFD08A' },
  { bgFrom: '#0B1A1A', bgTo: '#0F2626', glow1: '127,234,209', glow2: '183,156,255', accent: '#7FEAD1', accent2: '#B79CFF' },
  { bgFrom: '#180E22', bgTo: '#26142E', glow1: '255,217,138', glow2: '198,168,255', accent: '#FFD98A', accent2: '#C6A8FF' },
  { bgFrom: '#1A0E0A', bgTo: '#241209', glow1: '255,179,122', glow2: '255,115,150', accent: '#FFB37A', accent2: '#FF7396' },
];

const EYEBROWS = ['ANONYMOUS MESSAGE', 'SOMEONE SAID...', 'SENT WITHOUT A NAME', 'A WHISPER FOR YOU'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Wraps text to fit maxWidth, but first respects any line breaks already in
// the original text (e.g. someone wrote their message across several lines)
// — each paragraph is wrapped independently, so intentional breaks never
// get merged into one continuous flow of text.
function wrapLines(ctx, text, maxWidth) {
  const paragraphs = text.split(/\n+/);
  const lines = [];
  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

// Small decorative shapes, drawn only inside safe margin zones (never over
// the message text or the footer card) so they add texture without hurting
// readability.
function drawStar(ctx, cx, cy, r, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.42;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawSparkle(ctx, cx, cy, size, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - size, cy);
  ctx.lineTo(cx + size, cy);
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx, cy + size);
  ctx.stroke();
  ctx.restore();
}

function drawDot(ctx, cx, cy, r, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRing(ctx, cx, cy, r, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.18;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawDecorations(ctx, W, H, theme) {
  // Safe zones: top strip (above the eyebrow text), bottom strip (below the
  // footer card), and left/right side margins (outside the text's max width).
  // Message text spans roughly x:100-980, footer card spans y:(H-420)-(H-160).
  const zones = [
    { xMin: 40, xMax: W - 40, yMin: 40, yMax: 160 },       // top strip
    { xMin: 40, xMax: W - 40, yMin: H - 130, yMax: H - 40 }, // bottom strip
    { xMin: 20, xMax: 85, yMin: 200, yMax: H - 460 },        // left margin
    { xMin: W - 85, xMax: W - 20, yMin: 200, yMax: H - 460 }, // right margin
  ];
  const shapes = ['star', 'sparkle', 'dot', 'ring'];
  const count = 12 + Math.floor(Math.random() * 8); // 12-19 decorations

  for (let i = 0; i < count; i++) {
    const zone = pick(zones);
    if (zone.yMax <= zone.yMin) continue; // skip degenerate zones on short screens
    const x = zone.xMin + Math.random() * (zone.xMax - zone.xMin);
    const y = zone.yMin + Math.random() * (zone.yMax - zone.yMin);
    const size = 6 + Math.random() * 16;
    const alpha = 0.15 + Math.random() * 0.35;
    const color = Math.random() > 0.5 ? theme.accent : theme.accent2;
    const shape = pick(shapes);

    if (shape === 'star') drawStar(ctx, x, y, size, color, alpha);
    else if (shape === 'sparkle') drawSparkle(ctx, x, y, size, color, alpha);
    else if (shape === 'dot') drawDot(ctx, x, y, size * 0.4, color, alpha);
    else drawRing(ctx, x, y, size * 0.6, color, alpha);
  }
}

export async function generateShareImage({ message, displayName, link }) {
  const W = 1080, H = 1920;
  const theme = pick(THEMES);
  const eyebrowText = pick(EYEBROWS);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // background — randomly picked ink-toned gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, theme.bgFrom);
  bg.addColorStop(1, theme.bgTo);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow1 = ctx.createRadialGradient(W * 0.85, H * 0.08, 0, W * 0.85, H * 0.08, 700);
  glow1.addColorStop(0, `rgba(${theme.glow1},0.22)`);
  glow1.addColorStop(1, `rgba(${theme.glow1},0)`);
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);

  const glow2 = ctx.createRadialGradient(W * 0.1, H * 0.92, 0, W * 0.1, H * 0.92, 700);
  glow2.addColorStop(0, `rgba(${theme.glow2},0.16)`);
  glow2.addColorStop(1, `rgba(${theme.glow2},0)`);
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  // scattered decorative graphics — drawn before text so they sit behind it
  drawDecorations(ctx, W, H, theme);

  // eyebrow (randomly picked phrasing)
  ctx.fillStyle = '#9C8FC2';
  ctx.font = '600 28px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(eyebrowText, W / 2, 300);

  // quote mark
  ctx.fillStyle = theme.accent;
  ctx.font = 'italic 160px Georgia, serif';
  ctx.fillText('"', W / 2, 430);

  // message, wrapped, centered vertically-ish
  ctx.fillStyle = '#F3EFFB';
  ctx.font = 'italic 56px Georgia, serif';
  const maxTextWidth = W - 200;
  let lines = wrapLines(ctx, message, maxTextWidth);
  // shrink font if too many lines
  let fontSize = 56;
  while (lines.length > 9 && fontSize > 32) {
    fontSize -= 4;
    ctx.font = `italic ${fontSize}px Georgia, serif`;
    lines = wrapLines(ctx, message, maxTextWidth);
  }
  const lineHeight = fontSize * 1.35;
  const startY = H / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => {
    ctx.fillText(l, W / 2, startY + i * lineHeight);
  });

  // footer card: "reply anonymously" + link
  const cardY = H - 420;
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  roundRect(ctx, 90, cardY, W - 180, 260, 32);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  roundRect(ctx, 90, cardY, W - 180, 260, 32);
  ctx.stroke();

  ctx.fillStyle = theme.accent2;
  ctx.font = '700 40px Inter, sans-serif';
  ctx.fillText(`Send ${displayName} one too`, W / 2, cardY + 100);

  ctx.fillStyle = theme.accent;
  ctx.font = '500 34px "Courier New", monospace';
  ctx.fillText(shortenLink(link), W / 2, cardY + 170);

  ctx.fillStyle = '#6C6488';
  ctx.font = '400 28px Inter, sans-serif';
  ctx.fillText('tap the link in bio', W / 2, cardY + 220);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1));
}

function shortenLink(link) {
  return link.replace(/^https?:\/\//, '');
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Shares the image file via the native share sheet (opens IG "Add to Story"
// directly if the person picks Instagram there). Falls back to downloading
// the file if file-sharing isn't supported on this browser.
export async function shareImageOrDownload(blob, { filename, title, text }) {
  const file = new File([blob], filename, { type: 'image/png' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text });
      return { method: 'share' };
    } catch {
      return { method: 'cancelled' };
    }
  }

  // Fallback: download the image so the person can add it to their story manually
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { method: 'download' };
}
