# CxC W27 Hacker Badge

A buildless HTML, CSS, and JavaScript badge lab. Run `npm run dev` from this directory, then open http://127.0.0.1:4173.

The badge includes editable full/preferred names, a profile-photo upload, the Hacker role, a team name, a locally generated QR, pointer/touch/keyboard tilt, rainbow foil and sparkles, an accessible scan dialog, and a 1176 × 1776 PNG download. The QR stays above the foil so its contrast is preserved. Motion follows the operating system's reduced-motion preference. Details and uploaded photos stay in the current browser session; there is no backend or attendee database.

Lee Sang-hyeok, T1 League of Legends, and the example.com QR destination are sample data. Set the QR destination to a real profile or check-in URL before using the badge at an event. This prototype does not issue or validate admission credentials.

## Credits

- CxC logo and topographic artwork: supplied CxC W27 Figma file, nodes `1169:27070` and `1169:22964`.
- Foil, sparkle texture, and tilt inspiration: https://codepen.io/hoangtu/pen/abJpGJO (sparkle texture hosted at https://assets.codepen.io/13471/sparkles.gif).
- Default portrait: user-supplied image of Lee Sang-hyeok (Faker).
- QR generation: qrcode-generator 1.4.4, Kazuhiko Arase, MIT license (license preserved in `dist/assets/qrcode.js`).
- Atkinson Hyperlegible Mono: Braille Institute / Google Fonts, SIL Open Font License. The UI uses Arial/Helvetica as a system alternative to the reference's Alte Haas Grotesk.

All runtime assets are stored locally. No external asset services are called by the finished app.
