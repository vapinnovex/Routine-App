import { ScrollViewStyleReset } from "expo-router/html";
import type { ReactNode } from "react";

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>Routine · Tasks &amp; Focus</title>
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#F4EFE8" />
        <meta
          name="description"
          content="Routine helps you plan daily tasks and run focused timer sessions."
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Routine" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/pwa-192.png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/pwa-180.png" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
      <script dangerouslySetInnerHTML={{ __html: serviceWorkerRegistration }} />
    </html>
  );
}

const responsiveBackground = `
body { background-color: #F4EFE8; }
*:focus-visible { outline: 3px solid #2F6F6A; outline-offset: 3px; }
input, textarea { font: inherit; }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
@media (prefers-color-scheme: dark) {
  body { background-color: #12110F; }
}`;

const serviceWorkerRegistration = `
window.addEventListener('beforeinstallprompt', function(event) {
  event.preventDefault(); window.routineInstallPrompt = event;
});
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' }).catch(function() { /* Installation help remains available when registration fails. */ });
  });
}`;
