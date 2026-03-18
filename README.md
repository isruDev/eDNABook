# eDNA Metadata Logger

A Progressive Web App for field technicians to log environmental DNA (eDNA) sample metadata. Set up projects with custom metadata fields, scan sample QR codes in the field (offline), capture GPS coordinates, and export data as CSV or SQLite.

## Features

- Offline-first PWA -- works with zero network after install
- QR code scanning for sample IDs
- Auto-capture GPS coordinates
- Custom metadata fields per project
- Export to CSV or SQLite (.db)
- Native sharing via Web Share API

## Tech Stack

- Vanilla JS + HTML/CSS (no build step)
- IndexedDB for local storage (via `idb`)
- html5-qrcode for QR scanning
- sql.js (WASM) for SQLite export
- Service Worker for offline caching

## Development

Serve over HTTPS (or localhost) for service worker, camera, and GPS access.

## Deployment

Deploy as static files to GitHub Pages, Netlify, or any HTTPS-capable static host.
