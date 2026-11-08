(() => {
  'use strict';

  const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

  window.BOOK_VIGNETTES = Object.freeze({
    rings: svg('<circle cx="60" cy="30" r="19"/><circle cx="84" cy="42" r="19"/><circle cx="88" cy="68" r="19"/><circle cx="70" cy="88" r="19"/><circle cx="43" cy="86" r="19"/><circle cx="29" cy="63" r="19"/><circle cx="35" cy="39" r="19"/>'),
    key: svg('<circle cx="77" cy="42" r="21"/><path d="M62 57 27 92m12-12 10 10m4-25 10 10"/><circle cx="77" cy="42" r="5"/>'),
    bell: svg('<path d="M31 76h58l-8-11V48a21 21 0 0 0-42 0v17zM51 91c2 7 16 7 18 0"/><path d="M60 20v7"/>'),
    footprint: svg('<ellipse cx="64" cy="75" rx="17" ry="31" transform="rotate(19 64 75)"/><circle cx="39" cy="35" r="6"/><circle cx="52" cy="25" r="6"/><circle cx="66" cy="23" r="6"/><circle cx="79" cy="29" r="6"/>'),
    moon: svg('<path d="M83 90a39 39 0 1 1-40-61 31 31 0 0 0 40 61Z"/><path d="m89 29 3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>'),
    compass: svg('<circle cx="60" cy="60" r="39"/><path d="m73 47-8 26-18 7 8-26zM60 21v8m39 31h-8m-31 39v-8M21 60h8"/><circle cx="60" cy="60" r="4"/>'),
    cassette: svg('<rect x="22" y="33" width="76" height="54" rx="6"/><path d="M38 33h44l8 16H30zM39 68h42v19H39z"/><circle cx="49" cy="61" r="8"/><circle cx="71" cy="61" r="8"/><path d="M57 61h6"/>'),
    leaf: svg('<path d="M91 25C48 23 26 44 28 89c37 2 60-20 63-64Z"/><path d="M29 90c16-23 34-39 57-57M48 70l-2-15m19-2-2-15"/>'),
    seal: svg('<path d="M60 18 72 29l16-2 5 15 14 8-7 15 4 16-15 6-10 13-15-7-16 4-6-15-13-10 8-14-3-16 16-4z"/><circle cx="60" cy="61" r="18"/><path d="m52 61 6 6 12-14"/>'),
    mirror: svg('<path d="M37 23h46l7 11v52l-7 11H37l-7-11V34z"/><path d="M42 87V33h36"/><path d="m50 70 9-12 8 7 8-11"/>'),
    stone: svg('<path d="m30 85 7-34 24-21 27 20 5 35z"/><path d="m37 51 26 9 25-10M30 85l33-25 30 25"/><path d="m63 60 1 25"/>'),
    bird: svg('<path d="M19 64c15-24 31-24 41-6 10-18 26-18 41 6-16-7-29-4-41 9-12-13-25-16-41-9Z"/><path d="m60 58 7-16m-7 16-8-15"/>'),
    letter: svg('<rect x="23" y="31" width="74" height="58" rx="4"/><path d="m25 35 35 29 35-29M25 86l26-26m44 26L69 60"/><path d="M35 22h50"/>'),
    umbrella: svg('<path d="M18 59a42 42 0 0 1 84 0H18Z"/><path d="M60 59v34c0 11-16 11-16 1"/><path d="M39 59a21 21 0 0 1 42 0"/>'),
    train: svg('<rect x="26" y="24" width="68" height="66" rx="12"/><path d="M26 49h68M39 24v25m42-25v25M40 64h1m39 0h1M34 102l9-12m43 12-9-12M18 102h84"/>'),
    signal: svg('<path d="M37 104V20h45v50H37zM60 70v34"/><circle cx="60" cy="37" r="9"/><circle cx="60" cy="58" r="9"/>'),
    ticket: svg('<path d="M23 38h74v44H23a9 9 0 0 0 0-18 9 9 0 0 0 0-18Z"/><path d="M70 39v42M78 50h8m-8 10h8m-8 10h8"/>'),
    clock: svg('<circle cx="60" cy="60" r="39"/><path d="M60 35v27l18 11M60 21v8m39 31h-8m-31 39v-8M21 60h8"/>'),
    map: svg('<path d="m22 32 24-10 29 10 23-10v67L75 99 46 89l-24 10z"/><path d="M46 22v67m29-57v67"/><path d="m31 75 13-11 17 7 18-23"/>'),
    station: svg('<path d="M18 91h84M27 91V43l33-22 33 22v48M42 91V60h36v31M18 43h84"/><path d="M60 21v-9"/>'),
    rail: svg('<path d="m20 104 27-88m6 88 20-88m-7 88 28-88"/><path d="M17 35h77M24 61h70M32 87h63"/>'),
    seat: svg('<path d="M29 72V39h43v33M22 72h65v16H22zM31 88v16m47-16v16"/><path d="M29 54h43"/>'),
    line: svg('<path d="M20 88c17-48 30-18 43-43 13-25 21-6 37-28"/><circle cx="20" cy="88" r="6"/><circle cx="63" cy="45" r="6"/><circle cx="100" cy="17" r="6"/>'),
    inspector: svg('<path d="M38 46a22 22 0 1 1 44 0v12H38zM31 104l7-46h44l7 46M49 23l11-10 11 10M50 75h20"/><path d="M35 104h50"/>'),
    sun: svg('<circle cx="60" cy="60" r="20"/><path d="M60 14v12m0 68v12M14 60h12m68 0h12M27 27l9 9m48 48 9 9m0-66-9 9M36 84l-9 9"/>')
  });

  window.makeBookVignette = (name, label) => {
    const selected = window.BOOK_VIGNETTES[name] || window.BOOK_VIGNETTES.moon;
    const figure = document.createElement('figure');
    const image = document.createElement('img');
    const safeName = String(name || 'moon').replace(/[^a-z0-9_-]/gi, '');
    figure.className = `book-vignette book-vignette--${safeName || 'moon'}`;
    image.src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(selected)}`;
    image.alt = String(label || 'Süsleme');
    image.loading = 'lazy';
    image.decoding = 'async';
    image.width = 112;
    image.height = 112;
    figure.append(image);
    return figure;
  };
  window.BOOK_VIGNETTES = Object.freeze({ ...window.BOOK_VIGNETTES,
    train: svg('<path d="M14 83h92V54H55V34H32v49M20 34V20h16v14m20 20V29h35v25M62 36h21M10 95h103"/><circle cx="35" cy="85" r="10"/><circle cx="61" cy="85" r="10"/><circle cx="91" cy="85" r="10"/><path d="M26 14q-10-10 4-17"/>'),
    telescope: svg('<path d="m24 51 63-28 10 23-62 28zM87 23l9-4 11 23-10 4M55 65l-9 38m9-38 20 37M45 104h35M62 61v43"/>'),
    stars: svg('<path d="m35 17 6 18 18 6-18 6-6 18-6-18-18-6 18-6zm48 47 5 14 14 5-14 5-5 14-5-14-14-5 14-5M87 22v13m-7-6h14M25 88v10m-5-5h10"/>')
  });
})();
