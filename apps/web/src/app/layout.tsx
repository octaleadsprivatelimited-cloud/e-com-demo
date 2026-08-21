import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#071f3d",
};



export const metadata: Metadata = {
  title: "Poltica Systems | Campaign SaaS Platform by octaleads Private Limited",
  description: "Enterprise-grade campaign infrastructure brand by octaleads Private Limited.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground min-h-screen flex flex-col">
        <noscript>
          <div style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
            <h1>JavaScript Required</h1>
            <p>Please enable JavaScript to use the Poltica platform.</p>
          </div>
        </noscript>
        {children}
      </body>
    </html>
  );
}
