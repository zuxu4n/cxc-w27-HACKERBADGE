# CxC W27 Hacker Badge

A static HTML, CSS, and JavaScript badge lab. Run `npm run dev` from this directory, then open http://127.0.0.1:4173. The QRBTF runtime is prebuilt and stored locally; `npm run build:qr` regenerates it from the included vendor files without installing dependencies.

The badge includes editable full/preferred names, a profile-photo upload, the Hacker role, a team name, a locally generated QR, pointer/touch/keyboard tilt, rainbow foil and sparkles, an accessible scan dialog, and a 1176 × 1776 PNG download. The QR stays above the foil so its contrast is preserved. Motion follows the operating system's reduced-motion preference. Details and uploaded photos stay in the current browser session; there is no backend or attendee database.

The default badge uses Lee Sang-hyeok, the nickname Faker, T1 League of Legends, and the supplied QR destination https://r.mtdv.me/z213yAoKQH. The QR destination remains editable. This prototype does not issue or validate admission credentials.

## QR looks

Use the **QR LOOK** selector above the badge to compare **Classic** (the default), **CxC ’27** (a CxC centerpiece with blue-gray modules), and **Blue rings** (blue rounded finder patterns). The selected look is used in the live badge, scan dialog, and PNG download. Reset restores Classic along with the sample details.

## Credits

- CxC logo and topographic artwork: supplied CxC W27 Figma file, nodes `1169:27070` and `1169:22964`.
- Foil, sparkle texture, and tilt inspiration: https://codepen.io/hoangtu/pen/abJpGJO (sparkle texture hosted at https://assets.codepen.io/13471/sparkles.gif).
- Default portrait: user-supplied image of Lee Sang-hyeok (Faker).
- QR generation: the official `react-qrbtf` 1.2.1 component linked by https://github.com/latentcat/qrbtf, with React / ReactDOMServer 16.14.0. All three looks use H error correction and a four-module quiet zone. The same locally generated SVG appears in the badge, scan dialog, and PNG download. MIT license notices are included in `dist/assets/qrbtf-LICENSES.txt`; pinned source distributions are in `vendor/qrbtf/`.
- Atkinson Hyperlegible Mono: Braille Institute / Google Fonts, SIL Open Font License. The UI uses Arial/Helvetica as a system alternative to the reference's Alte Haas Grotesk.

All runtime assets are stored locally. No external asset services are called by the finished app.
