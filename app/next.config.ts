import type { NextConfig } from "next";

// En modo público la app se embebe como iframe en GHL, así que hay que permitir
// que la enmarquen. Por defecto (workspace privado) se restringe a 'self'.
// Se puede acotar a dominios concretos con EMAILBUILDER_FRAME_ANCESTORS.
const frameAncestors =
  process.env.EMAILBUILDER_FRAME_ANCESTORS ||
  (process.env.EMAILBUILDER_OPEN_ACCESS === "true" ? "*" : "'self'");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: `frame-ancestors ${frameAncestors};` },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
