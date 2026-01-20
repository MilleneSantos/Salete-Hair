"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const SPLASH_DURATION_MS = 5000;
const STORAGE_KEY = "salete_splash_seen";

export function SplashScreen() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const seen = window.sessionStorage.getItem(STORAGE_KEY);
    if (seen) {
      return;
    }

    setVisible(true);

    const timer = window.setTimeout(() => {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
      setVisible(false);
      if (window.location.pathname !== "/") {
        router.replace("/");
      }
    }, SPLASH_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [router]);

  if (!visible) {
    return null;
  }

  return (
    <div className="splash-screen" role="status" aria-live="polite">
      <Image
        src="/imagens/salete-logo.png"
        alt="Salete Santos"
        width={220}
        height={220}
        priority
        className="splash-logo"
      />
    </div>
  );
}
