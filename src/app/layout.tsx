import type { Metadata } from "next";
import { JetBrains_Mono, Nunito } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const terminalFont = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
  variable: "--font-terminal",
  display: "swap",
});

/** Clay UI face for the whole shell (see `--font-ui` in globals.css). */
const nunito = Nunito({
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

const galmuri7 = localFont({
  src: "./fonts/Galmuri7.woff2",
  variable: "--font-galmuri-7",
  display: "swap",
});

const galmuri9 = localFont({
  src: "./fonts/Galmuri9.woff2",
  variable: "--font-galmuri-9",
  display: "swap",
});

const galmuri11 = localFont({
  src: "./fonts/Galmuri11.woff2",
  variable: "--font-galmuri-11",
  display: "swap",
});

const description =
  "Cuộc sống từ sinh viên IT đến khi trở thành super senior siêu cấp vip pro plus promax ultra fullhd limited";

const ogImage = "/branding/og_1200x630.png";

export const metadata: Metadata = {
  metadataBase: new URL("https://deflife.vercel.app"),
  title: "devlife",
  description,
  applicationName: "devlife",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32" },
      { url: "/branding/logo_16.png", sizes: "16x16", type: "image/png" },
      { url: "/branding/logo_32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/branding/apple-touch-icon_180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "devlife",
    description,
    url: "/",
    siteName: "devlife",
    locale: "vi_VN",
    type: "website",
    images: [{ url: ogImage, width: 1200, height: 630, alt: "devlife" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "devlife",
    description,
    images: [ogImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${galmuri7.variable} ${galmuri9.variable} ${galmuri11.variable} ${terminalFont.variable} ${nunito.variable}`}
    >
      <body className="devlife-page-bg font-galmuri-9 text-galmuri-body antialiased">
        {children}
      </body>
    </html>
  );
}
