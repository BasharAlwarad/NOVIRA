import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: {
    default: 'NOVIRA | Study and work guidance in Germany',
    template: '%s | NOVIRA',
  },
  description:
    'NOVIRA helps people in Germany find study and work opportunities with specialists, experts, and AI-powered guidance.',
  keywords: [
    'NOVIRA',
    'study in Germany',
    'work in Germany',
    'AI guidance',
    'specialists',
    'experts',
    'education support',
    'career support',
  ],
  openGraph: {
    title: 'NOVIRA | Study and work guidance in Germany',
    description:
      'NOVIRA helps people find study and work opportunities in Germany with specialists, experts, and AI-assisted support.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NOVIRA | Study and work guidance in Germany',
    description:
      'AI-assisted study and work guidance in Germany with specialists and experts.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-theme="emerald"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
