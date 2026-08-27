import { ScrollViewStyleReset } from "expo-router/html";
import type { ReactNode } from "react";

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
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
@media (prefers-color-scheme: dark) {
  body { background-color: #12110F; }
}`;

const serviceWorkerRegistration = `
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
  });
}`;
