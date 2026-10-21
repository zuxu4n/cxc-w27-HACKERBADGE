'use strict';

// All looks share QRBTF's encoder, high error correction, and a four-module quiet zone.
window.createBadgeQR = (value, style = 'classic') => {
  const qrbtf = window['react-qrbtf'];
  const code = qrbtf.encodeData({ text: value, correctLevel: 'H', typeNumber: -1 });
  const branded = style === 'cxc';
  const component = React.createElement(qrbtf.QRNormal, {
    qrcode: code,
    value,
    level: 'H',
    type: 'rect',
    size: 100,
    opacity: 100,
    posType: style === 'rings' ? 'round' : 'rect',
    otherColor: '#101010',
    posColor: style === 'rings' ? '#1b66ff' : '#101010'
  });
  const markup = ReactDOMServer.renderToStaticMarkup(component);
  const svgDocument = new DOMParser().parseFromString(markup, 'image/svg+xml');
  if (svgDocument.querySelector('parsererror')) throw new Error('QRBTF returned invalid SVG');
  const svg = svgDocument.documentElement;
  const ns = 'http://www.w3.org/2000/svg';
  const element = (tag, attributes) => {
    const node = svgDocument.createElementNS(ns, tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  };
  if (branded) {
    svg.replaceChildren();
    const count = code.getModuleCount();
    const types = qrbtf.getTypeTable(code);
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (!code.isDark(row, col)) continue;
        // Keep finder, alignment, timing and format patterns solid for scanning.
        const data = types[row][col] === qrbtf.QRPointType.DATA;
        const moduleSize = data ? .8 : 1;
        svg.append(element('rect', {
          x: col + (1 - moduleSize) / 2, y: row + (1 - moduleSize) / 2,
          width: moduleSize, height: moduleSize, fill: data ? '#71869f' : '#101010'
        }));
      }
    }
    // A short central band leaves the surrounding data and all location markers intact.
    const markWidth = count * .38;
    const markHeight = markWidth * 100.188 / 342.983;
    const yearWidth = markHeight * 1.05;
    const bandWidth = markWidth + yearWidth + 1.4;
    const bandHeight = markHeight + 1.8;
    const left = (count - bandWidth) / 2;
    const top = (count - bandHeight) / 2;
    svg.append(element('rect', { x: left, y: top, width: bandWidth, height: bandHeight, fill: '#fff' }));
    const mark = element('g', { transform: `translate(${left + .6} ${top + .9}) scale(${markWidth / 342.983})` });
    mark.innerHTML = window.badgeQRLogoPaths;
    svg.append(mark);
    const year = element('text', {
      x: left + markWidth + 1, y: count / 2 + markHeight * .13,
      fill: '#1b66ff', 'font-family': 'Arial, Helvetica, sans-serif',
      'font-size': markHeight * .68, 'font-weight': 800, 'font-style': 'italic'
    });
    year.textContent = '’27';
    svg.append(year);
  }
  const quietZone = 4;
  const size = code.getModuleCount() + quietZone * 2;
  svg.setAttribute('viewBox', `-${quietZone} -${quietZone} ${size} ${size}`);
  svg.setAttribute('width', '256');
  svg.setAttribute('height', '256');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'QR code for your badge destination');
  svg.setAttribute('data-qr-generator', 'react-qrbtf');
  svg.setAttribute('data-qr-style', style);
  svg.style.shapeRendering = 'geometricPrecision';

  const background = svgDocument.createElementNS('http://www.w3.org/2000/svg', 'rect');
  background.setAttribute('x', String(-quietZone));
  background.setAttribute('y', String(-quietZone));
  background.setAttribute('width', String(size));
  background.setAttribute('height', String(size));
  background.setAttribute('fill', '#ffffff');
  svg.insertBefore(background, svg.firstChild);
  return new XMLSerializer().serializeToString(svg);
};
