import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seedance 2.0 Prompt Generator",
  description: "Tạo prompt video AI chuyên nghiệp cho Seedance 2.0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
