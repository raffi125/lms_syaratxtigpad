"use client";

import React, { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[Next.js Global Root Error]:", error);
  }, [error]);

  return (
    <html lang="id">
      <head>
        <title>Server Error - SYARAT x TIGPAD</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", backgroundColor: "#0f172a", color: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "1.5rem" }}>
        <div style={{ maxWidth: "480px", width: "100%", background: "rgba(30, 41, 59, 0.8)", backdropFilter: "blur(12px)", padding: "2rem", borderRadius: "1.5rem", border: "1px solid rgba(239, 68, 68, 0.3)", textAlign: "center", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "1rem", background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem", margin: "0 auto 1.25rem auto" }}>
            ⚠
          </div>
          <h1 style={{ fontSize: "1.35rem", fontWeight: "800", margin: "0 0 0.5rem 0", color: "#ffffff" }}>
            Next.js Server Error Terdeteksi
          </h1>
          <p style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: "1.5", margin: "0 0 1.5rem 0" }}>
            Terjadi kendala pada server Next.js. Silakan muat ulang halaman ini atau kembali ke beranda untuk mengajukan tiket bantuan ke Tim IT.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => reset()}
              style={{ padding: "0.75rem 1.25rem", borderRadius: "0.75rem", background: "#0284c7", color: "#ffffff", border: "none", fontWeight: "700", fontSize: "0.85rem", cursor: "pointer" }}
            >
              Muat Ulang (Retry)
            </button>
            <a
              href="/"
              style={{ padding: "0.75rem 1.25rem", borderRadius: "0.75rem", background: "rgba(255, 255, 255, 0.1)", color: "#f8fafc", textDecoration: "none", fontWeight: "700", fontSize: "0.85rem", display: "inline-block" }}
            >
              Beranda
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
