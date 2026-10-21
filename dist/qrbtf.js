'use strict';

// Use the official React QRBTF component without changing the rest of the app.
window.createBadgeQR = (value) => {
  const qrbtf = window['react-qrbtf'];
  const code = qrbtf.encodeData({ text: value, correctLevel: 'H', typeNumber: -1 });
  const component = React.createElement(qrbtf.QRNormal, {
    qrcode: code,
    value,
    level: 'H',
    type: 'rect',
    size: 100,
    opacity: 100,
    posType: 'round',
    otherColor: '#101010',
    posColor: '#1b66ff'
  });
  const markup = ReactDOMServer.renderToStaticMarkup(component);
  const svgDocument = new DOMParser().parseFromString(markup, 'image/svg+xml');
  if (svgDocument.querySelector('parsererror')) throw new Error('QRBTF returned invalid SVG');
  const svg = svgDocument.documentElement;
  const quietZone = 4;
  const size = code.getModuleCount() + quietZone * 2;
  svg.setAttribute('viewBox', `-${quietZone} -${quietZone} ${size} ${size}`);
  svg.setAttribute('width', '256');
  svg.setAttribute('height', '256');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'QR code for your badge destination');
  svg.setAttribute('data-qr-generator', 'react-qrbtf');
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
