import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import LegacyMigrator from "@/components/LegacyMigrator";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Email Builder — AD Media Solution",
  description: "Generador de emails HTML profesionales para más de 250 marcas. Crea, personaliza y exporta emails compatibles con todos los clientes de correo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${plusJakarta.variable} h-full antialiased`}>
      <body className="min-h-full">
        <LegacyMigrator />
        {children}
      </body>
    </html>
  );
}
