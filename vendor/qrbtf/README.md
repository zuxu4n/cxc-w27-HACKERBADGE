# QRBTF runtime sources

The QRBTF project links to this reusable component package:
https://github.com/latentcat/qrbtf#react-component

These files are unmodified published distributions:

- `react-qrbtf-1.2.1.umd.js`: `dist/index.js` from https://registry.npmjs.org/react-qrbtf/-/react-qrbtf-1.2.1.tgz (MIT).
- React 16.14.0: https://cdn.jsdelivr.net/npm/react@16.14.0/umd/react.production.min.js (MIT).
- ReactDOMServer 16.14.0: https://cdn.jsdelivr.net/npm/react-dom@16.14.0/umd/react-dom-server.browser.production.min.js (MIT).

Run `npm run build:qr` to regenerate the checked-in browser runtime and combined license notices. No dependency installation is required. The build supplies the lowercase React global expected by the upstream UMD wrapper. The app adapter uses `QRNormal` with black square modules, CxC blue rounded finder patterns, H error correction, and a four-module quiet zone. It generates SVG locally and uses the same SVG for the badge, enlarged scan view, and PNG export.
