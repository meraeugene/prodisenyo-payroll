"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      );
      if ("caches" in window) {
        void caches.keys().then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith("prodisenyo-"))
              .map((key) => caches.delete(key)),
          ),
        );
      }
      return;
    }

    const registerServiceWorker = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Ignore registration failures to avoid breaking app startup.
      });
    };

    if (document.readyState === "complete") {
      registerServiceWorker();
      return;
    }

    window.addEventListener("load", registerServiceWorker, { once: true });
    return () => {
      window.removeEventListener("load", registerServiceWorker);
    };
  }, []);

  return null;
}
