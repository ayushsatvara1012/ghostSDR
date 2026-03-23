import type { Metadata } from 'next';
import { Inter, Barlow_Condensed, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import Script from 'next/script'; // 1. Import the Next.js Script component
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600'],
});

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  variable: '--font-barlow',
  display: 'swap',
  weight: ['600', '700', '800'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Ghost SDR — AI Sales Intelligence',
  description: 'Intent-based AI Lead Generation for B2B Sales Teams',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${barlowCondensed.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>

        <Script
          src="http://ghost-sdr.vercel.app/widget.js"
          strategy="lazyOnload"
          data-api-key="sb_live_llWxw0Xrbphz5UQfZNyyQhkKmu7IpaUlHlu60F7n3g4"
          data-api-url="https://sapyai.onrender.com"
        />
      </body>
    </html>
  );
}
