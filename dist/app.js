'use strict';

const $ = (selector) => document.querySelector(selector);
const defaults = { fullName: 'Alex Morgan', preferredName: 'Alex', teamName: 'Ctrl Alt Elite', qrUrl: 'https://example.com/badge/CXC-042' };
const form = $('#badge-form');
const badge = $('#badge');
const stage = $('#badge-stage');
const dialog = $('#scan-dialog');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const state = { ...defaults, photo: 'assets/profile.jpg', holo: !reducedMotion.matches };
let qrSVG = '';
let toastTimeout;
let qrTimeout;

function toast(message) {
  clearTimeout(toastTimeout);
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  toastTimeout = setTimeout(() => $('#toast').classList.remove('visible'), 3500);
}

function nameLines(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts;
  const split = parts.length > 2 ? Math.ceil(parts.length / 2) : 1;
  return [parts.slice(0, split).join(' '), parts.slice(split).join(' ')];
}

function renderIdentity() {
  const fullName = state.fullName.trim() || 'Your name';
  const nameNode = $('#badge-name');
  nameNode.replaceChildren();
  nameLines(fullName).forEach((line, index) => {
    if (index) nameNode.append(document.createElement('br'));
    nameNode.append(document.createTextNode(line));
  });
  nameNode.classList.toggle('long-name', fullName.length > 18);
  nameNode.style.fontSize = fullName.length > 30 ? '25px' : '';
  $('#badge-preferred').textContent = state.preferredName.trim().toUpperCase() || fullName.split(' ')[0].toUpperCase();
  $('#badge-team').textContent = state.teamName.trim() || 'Finding my people';
  $('#badge-photo').alt = `Profile photo of ${fullName}`;
  $('#editor-photo').alt = `Profile photo of ${fullName}`;
  $('#scan-name').textContent = `${fullName} · Hacker`;
  badge.setAttribute('aria-label', `Holographic hacker badge for ${fullName}. Use arrow keys to tilt.`);
}

function renderQR(value) {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Unsupported protocol');
    const qr = qrcode(0, 'M');
    qr.addData(url.href);
    qr.make();
    qrSVG = qr.createSvgTag({ cellSize: 5, margin: 20, scalable: true }).replace('<svg ', '<svg role="img" aria-label="QR code for your badge destination" ');
    $('#badge-qr').innerHTML = qrSVG;
    $('#large-qr').innerHTML = qrSVG;
    $('#scan-link').href = url.href;
    $('#qr-error').hidden = true;
    $('#qr-url').setAttribute('aria-invalid', 'false');
    const sample = value === defaults.qrUrl;
    $('.scan-demo-note').hidden = !sample;
    state.qrUrl = value;
    return true;
  } catch {
    $('#qr-error').hidden = false;
    $('#qr-url').setAttribute('aria-invalid', 'true');
    return false;
  }
}

form.addEventListener('submit', (event) => event.preventDefault());
['fullName', 'preferredName', 'teamName'].forEach((name) => {
  form.elements[name].addEventListener('input', (event) => {
    state[name] = event.target.value;
    renderIdentity();
  });
});
form.elements.qrUrl.addEventListener('input', (event) => {
  clearTimeout(qrTimeout);
  qrTimeout = setTimeout(() => renderQR(event.target.value.trim()), 200);
});

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image could not be loaded'));
    image.src = src;
  });
}

$('#photo-input').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    toast('Choose a JPG, PNG, or WebP image.');
    event.target.value = '';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    toast('Choose a photo smaller than 5 MB.');
    event.target.value = '';
    return;
  }
  const objectURL = URL.createObjectURL(file);
  try {
    const photo = await loadImage(objectURL);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 384;
    const ctx = canvas.getContext('2d');
    const size = Math.min(photo.width, photo.height);
    ctx.drawImage(photo, (photo.width - size) / 2, (photo.height - size) / 2, size, size, 0, 0, 384, 384);
    state.photo = canvas.toDataURL('image/jpeg', .92);
    $('#badge-photo').src = state.photo;
    $('#editor-photo').src = state.photo;
    toast('Photo updated. Looking good.');
  } catch { toast('That image could not be opened. Try another photo.'); }
  finally { URL.revokeObjectURL(objectURL); event.target.value = ''; }
});

function setHolo(enabled) {
  state.holo = enabled;
  badge.classList.toggle('holo-off', !enabled);
  $('#holo-toggle').setAttribute('aria-pressed', String(enabled));
  $('#holo-toggle>span').textContent = enabled ? 'Holo on' : 'Holo off';
  if (!enabled) { activePointer = false; target.x = target.y = 0; animate(); }
  else if (!reducedMotion.matches) { demoUntil = performance.now() + 4000; animate(); }
}
$('#holo-toggle').addEventListener('click', () => setHolo(!state.holo));

function openScan() {
  clearTimeout(qrTimeout);
  if (!renderQR(form.elements.qrUrl.value.trim())) { toast('Add a valid QR destination first.'); return; }
  activePointer = false;
  target.x = target.y = 0;
  animate();
  dialog.showModal();
}
$('#scan-button').addEventListener('click', openScan);
$('#qr-tile').addEventListener('click', openScan);
$('#close-scan').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  const bounds = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
});

$('#reset-button').addEventListener('click', () => {
  clearTimeout(qrTimeout);
  Object.assign(state, defaults, { photo: 'assets/profile.jpg' });
  for (const [key, value] of Object.entries(defaults)) form.elements[key].value = value;
  $('#badge-photo').src = state.photo;
  $('#editor-photo').src = state.photo;
  renderIdentity();
  renderQR(state.qrUrl);
  toast('Sample details restored.');
});

// Spring-smoothed tilt and the moving foil/sparkle layers follow the pointer.
const target = { x: 0, y: 0, mx: 62, my: 33 };
const current = { x: 0, y: 0, mx: 62, my: 33 };
let activePointer = false;
let frame = 0;
let demoUntil = 0;

function animate() {
  if (frame || document.hidden) return;
  frame = requestAnimationFrame(tick);
}

function tick(time) {
  frame = 0;
  const demo = !activePointer && time < demoUntil && state.holo && !reducedMotion.matches && !dialog.open;
  if (demo) {
    const t = time / 1300;
    target.x = Math.sin(t) * 3;
    target.y = Math.cos(t) * 4;
    target.mx = 50 + Math.cos(t) * 29;
    target.my = 45 + Math.sin(t) * 25;
  } else if (!activePointer) {
    target.x = target.y = 0;
    target.mx = 62;
    target.my = 33;
  }
  let moving = false;
  for (const key of Object.keys(current)) {
    current[key] += (target[key] - current[key]) * .12;
    if (Math.abs(target[key] - current[key]) > .015) moving = true;
  }
  badge.style.setProperty('--rx', `${current.x.toFixed(3)}deg`);
  badge.style.setProperty('--ry', `${current.y.toFixed(3)}deg`);
  badge.style.setProperty('--mx', `${current.mx.toFixed(2)}%`);
  badge.style.setProperty('--my', `${current.my.toFixed(2)}%`);
  badge.style.setProperty('--bx', `${(100 - current.mx).toFixed(2)}%`);
  badge.style.setProperty('--by', `${(100 - current.my).toFixed(2)}%`);
  if (moving || demo) animate();
}

stage.addEventListener('pointermove', (event) => {
  if (!state.holo || reducedMotion.matches || dialog.open) return;
  const bounds = stage.getBoundingClientRect();
  const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
  const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
  activePointer = true;
  demoUntil = 0;
  target.x = (0.5 - y) * 17;
  target.y = (x - 0.5) * 20;
  target.mx = x * 100;
  target.my = y * 100;
  animate();
});
stage.addEventListener('pointerleave', () => { activePointer = false; animate(); });
stage.addEventListener('pointerup', (event) => { if (event.pointerType === 'touch') { activePointer = false; animate(); } });
badge.addEventListener('keydown', (event) => {
  if (!state.holo || reducedMotion.matches) return;
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape'].includes(event.key)) return;
  event.preventDefault();
  activePointer = event.key !== 'Escape';
  demoUntil = 0;
  const delta = 3;
  if (event.key === 'ArrowUp') target.x = Math.min(9, target.x + delta);
  if (event.key === 'ArrowDown') target.x = Math.max(-9, target.x - delta);
  if (event.key === 'ArrowLeft') target.y = Math.max(-10, target.y - delta);
  if (event.key === 'ArrowRight') target.y = Math.min(10, target.y + delta);
  target.mx = 50 + target.y * 4;
  target.my = 50 - target.x * 4;
  animate();
});
badge.addEventListener('blur', () => { activePointer = false; animate(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else animate(); });
reducedMotion.addEventListener('change', (event) => { if (event.matches) setHolo(false); });

// Canvas export keeps the QR crisp and embeds all artwork in a portable PNG.
function wrapText(ctx, text, width) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (ctx.measureText(word).width > width) {
      if (line) { lines.push(line); line = ''; }
      for (const char of word) {
        if (line && ctx.measureText(line + char).width > width) { lines.push(line); line = ''; }
        line += char;
      }
    } else if (line && ctx.measureText(line + ' ' + word).width > width) { lines.push(line); line = word; }
    else line = line ? line + ' ' + word : word;
  }
  if (line) lines.push(line);
  return lines;
}

async function exportBadge() {
  clearTimeout(qrTimeout);
  if (!renderQR(form.elements.qrUrl.value.trim())) { toast('Add a valid QR destination before downloading.'); return; }
  const button = $('#download-button');
  button.disabled = true;
  button.querySelector('span').textContent = 'Preparing your badge…';
  let qrURL;
  try {
    await document.fonts.ready;
    qrURL = URL.createObjectURL(new Blob([qrSVG], { type: 'image/svg+xml' }));
    const [logo, terrain, photo, qr] = await Promise.all([loadImage('assets/cxc-logo.svg'), loadImage('assets/cxc-terrain.png'), loadImage(state.photo), loadImage(qrURL)]);
    const canvas = document.createElement('canvas');
    canvas.width = 1176; canvas.height = 1776;
    const ctx = canvas.getContext('2d');
    ctx.scale(3, 3);
    ctx.beginPath(); ctx.roundRect(0, 0, 392, 592, 16); ctx.clip();
    ctx.fillStyle = '#e8e8e8'; ctx.fillRect(0, 0, 392, 592);
    ctx.strokeStyle = '#10101006'; ctx.lineWidth = .6;
    for (let n = 0; n < 592; n += 31) { ctx.beginPath(); ctx.moveTo(0, n); ctx.lineTo(392, n); ctx.stroke(); ctx.beginPath(); ctx.moveTo(n, 0); ctx.lineTo(n, 592); ctx.stroke(); }
    ctx.drawImage(logo, 26, 24, 113, 33);
    function text(value, x, y, size, color = '#101010', font = 'Arial', weight = 400) {
      ctx.fillStyle = color; ctx.font = `${weight} ${size}px ${font}`; ctx.fillText(value, x, y);
    }
    ctx.textAlign = 'right';
    text('WINTER 2027', 366, 34, 8, '#101010', 'Atkinson, monospace');
    text('HACKATHON / W27', 366, 48, 7, '#82827c', 'Atkinson, monospace');
    ctx.textAlign = 'left';
    text('HELLO, WORLD. I’M', 26, 102, 7, '#101010', 'Atkinson, monospace');
    const fullName = state.fullName.trim() || 'Your name';
    const fontSize = fullName.length > 30 ? 25 : fullName.length > 18 ? 32 : 45;
    ctx.font = `800 ${fontSize}px Arial`;
    const lines = nameLines(fullName).flatMap(line => wrapText(ctx, line, 223));
    lines.forEach((line, i) => text(line, 24, 146 + i * fontSize * .96, fontSize, '#101010', 'Arial', 800));
    const preferredY = Math.min(239, 165 + (lines.length - 1) * fontSize * .96);
    text('CALL ME', 26, preferredY, 8, '#101010', 'Atkinson, monospace');
    text((state.preferredName.trim() || fullName.split(' ')[0]).toUpperCase(), 72, preferredY, 10, '#1b66ff', 'Atkinson, monospace', 600);
    ctx.save(); ctx.filter = 'grayscale(1)';
    const photoRatio = 94 / 113;
    let sw = photo.width, sh = photo.height;
    if (sw / sh > photoRatio) sw = sh * photoRatio; else sh = sw / photoRatio;
    ctx.drawImage(photo, (photo.width - sw) / 2, (photo.height - sh) / 2, sw, sh, 272, 113, 94, 113);
    ctx.restore();
    ctx.strokeStyle = '#1b66ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(357, 109); ctx.lineTo(370, 109); ctx.lineTo(370, 122); ctx.stroke();
    text('H / 042', 336, 239, 6, '#85857f', 'Atkinson, monospace');
    ctx.fillStyle = '#1b66ff'; ctx.fillRect(0, 260, 392, 45);
    text('✳', 26, 293, 32, '#ffffff'); text('HACKER', 68, 291, 25, '#ffffff', 'Arial', 800); text('≪', 325, 294, 36, '#ffffff');
    text('BUILDING WITH', 26, 330, 6, '#686863', 'Atkinson, monospace');
    ctx.save(); ctx.beginPath(); ctx.rect(107, 315, 237, 22); ctx.clip(); text(state.teamName.trim() || 'Finding my people', 107, 332, 12, '#101010', 'Arial', 600); ctx.restore();
    text('↗', 354, 332, 16);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 343, 392, 249); ctx.clip();
    const terrainHeight = 525 * terrain.height / terrain.width;
    ctx.drawImage(terrain, -66, 592 + 180 - terrainHeight, 525, terrainHeight);
    const fade = ctx.createLinearGradient(0, 343, 0, 410); fade.addColorStop(0, '#e8e8e8'); fade.addColorStop(1, '#e8e8e800'); ctx.fillStyle = fade; ctx.fillRect(0, 343, 392, 80);
    ctx.restore();
    text('+', 264, 408, 24, '#e8e8e8');
    ['CURIOUS MINDS.', 'UNCHARTED', 'TERRITORY.'].forEach((line, i) => text(line, 264, 441 + i * 16.5, 11, '#f7f7f7', 'Arial', 600));
    text('43.4723° N', 264, 508, 6, '#c2c2c2', 'Atkinson, monospace'); text('80.5449° W', 264, 519, 6, '#c2c2c2', 'Atkinson, monospace');
    if (state.holo) {
      const foil = ctx.createLinearGradient(0, 0, 392, 592);
      foil.addColorStop(0, '#bcb2f04a'); foil.addColorStop(.25, '#8ee7ef26'); foil.addColorStop(.5, '#f3dfb826'); foil.addColorStop(.75, '#e0a2d929'); foil.addColorStop(1, '#c0cef033');
      ctx.globalCompositeOperation = 'color-burn'; ctx.fillStyle = foil; ctx.fillRect(0, 0, 392, 592); ctx.globalCompositeOperation = 'source-over';
      const glare = ctx.createRadialGradient(290, 80, 0, 290, 80, 440); glare.addColorStop(0, '#ffffff36'); glare.addColorStop(1, '#ffffff00'); ctx.fillStyle = glare; ctx.fillRect(0, 0, 392, 592);
    }
    ctx.fillStyle = '#e8e8e8'; ctx.fillRect(22, 351, 185, 192); ctx.fillStyle = '#fff'; ctx.fillRect(26, 355, 177, 184);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(qr, 37, 365, 154, 154); ctx.imageSmoothingEnabled = true;
    text('SCAN TO CONNECT', 37, 532, 6, '#101010', 'Atkinson, monospace'); text('↗', 180, 532, 11);
    ctx.strokeStyle = '#1b66ff'; ctx.lineWidth = .8;
    for (const [x, y, dx, dy] of [[21, 350, 1, 1], [208, 350, -1, 1], [21, 544, 1, -1], [208, 544, -1, -1]]) { ctx.beginPath(); ctx.moveTo(x, y + dy * 10); ctx.lineTo(x, y); ctx.lineTo(x + dx * 10, y); ctx.stroke(); }
    ctx.fillStyle = '#101010'; ctx.fillRect(0, 555, 392, 37);
    ctx.strokeStyle = '#ffffff40'; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(26, 558); ctx.lineTo(366, 558); ctx.stroke();
    text('CXC—W27—042', 26, 576, 6, '#eee', 'Atkinson, monospace'); ctx.textAlign = 'right'; text('GO MAKE SOMETHING. ↗', 366, 576, 6, '#eee', 'Atkinson, monospace'); ctx.textAlign = 'left';
    ctx.strokeStyle = '#ffffffa0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(.75, .75, 390.5, 590.5, 15); ctx.stroke();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Could not create PNG');
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `cxc-w27-${fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'hacker'}.png`;
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    toast('Your badge is ready. Go make something.');
  } catch (error) { console.error('Badge export failed:', error); toast('The download could not be created. Please try again.'); }
  finally { if (qrURL) URL.revokeObjectURL(qrURL); button.disabled = false; button.querySelector('span').textContent = 'Download badge'; }
}
$('#download-button').addEventListener('click', exportBadge);

renderIdentity();
renderQR(state.qrUrl);
setHolo(state.holo);
