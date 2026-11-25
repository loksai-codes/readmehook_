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
  title: 'ReadmeHook — would a developer clone your repo?',
  description:
    'Paste a GitHub repo, get a shareable landing card, and let a live A/B test find the hero that makes developers clone.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <div className="flex-1">{children}</div>
        <footer className="px-6 py-6 text-center text-xs text-zinc-500">
          ReadmeHook uses an anonymous visitor id only. No accounts, no IP addresses stored.
        </footer>
      </body>
    </html>
  );
}
