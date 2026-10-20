import type { Metadata, Viewport } from 'next';
import { getServerConfig } from '@/lib/config';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(getServerConfig().SITE_URL),
  title: { template: '%s | Blog', default: 'Blog' },
  description: 'Latest posts from Blog.',
};

export const viewport: Viewport = {
  colorScheme: 'light dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <div className="wrapper">
            <a className="site-name" href="/posts">
              Blog
            </a>
          </div>
        </header>
        <main id="main" className="wrapper">
          {children}
        </main>
      </body>
    </html>
  );
}
