// Renders a message as a branded, Instagram-Story-shaped image (1080x1920)
// and shares it as an actual image FILE via the Web Share API.
//
// Why an image file specifically: when a person picks Instagram from the
// native share sheet after sharing an image FILE (not just a link/text),
// modern iOS/Android open Instagram directly into "Add to Story" with that
// image pre-loaded as the background. Sharing plain text/links does not
// do this — Instagram has no public API for websites to push into Stories
// any other way.

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
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
  return lines;
}

export async function generateShareImage({ message, displayName, link }) {
  const W = 1080, H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // background — same ink/violet gradient as the app
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#100E17');
  bg.addColorStop(1, '#1B1626');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow1 = ctx.createRadialGradient(W * 0.85, H * 0.08, 0, W * 0.85, H * 0.08, 700);
  glow1.addColorStop(0, 'rgba(198,168,255,0.22)');
  glow1.addColorStop(1, 'rgba(198,168,255,0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);

  const glow2 = ctx.createRadialGradient(W * 0.1, H * 0.92, 0, W * 0.1, H * 0.92, 700);
  glow2.addColorStop(0, 'rgba(255,115,150,0.16)');
  glow2.addColorStop(1, 'rgba(255,115,150,0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  // eyebrow
  ctx.fillStyle = '#9C8FC2';
  ctx.font = '600 28px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ANONYMOUS MESSAGE', W / 2, 300);

  // quote mark
  ctx.fillStyle = '#C6A8FF';
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

  ctx.fillStyle = '#FF7396';
  ctx.font = '700 40px Inter, sans-serif';
  ctx.fillText(`Send ${displayName} one too`, W / 2, cardY + 100);

  ctx.fillStyle = '#C6A8FF';
  ctx.font = '500 34px "Courier New", monospace';
  ctx.fillText(shortenLink(link), W / 2, cardY + 170);

  ctx.fillStyle = '#6C6488';
  ctx.font = '400 28px Inter, sans-serif';
  ctx.fillText('tap the link in bio, or paste it above', W / 2, cardY + 220);

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
