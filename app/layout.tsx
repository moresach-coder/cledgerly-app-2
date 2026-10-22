import './globals.css';
import { Inter } from 'next/font/google';
import { ToastProvider } from '@/components/Toast';
import { BottomNav } from '@/components/NavTabs';
import { ThemeProvider } from '@/components/ThemeProvider';

// Self-hosted by next/font at build time. Without this the `font-sans` utility silently
// fell back to system-ui, which is why headings never looked crisp.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata = {
  title: 'Ledgerly',
  description: 'Personal financial truth engine — local, private, yours.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-bg text-ink font-sans min-h-screen antialiased">
        {/* Bottom bar owns navigation on mobile; the pages render the desktop tab strip.
            The column is capped so wide screens read as a centred app, not a stretched page. */}
        <ThemeProvider>
          <ToastProvider>
            <div className="mx-auto w-full max-w-[760px] pb-[68px] md:pb-0">{children}</div>
            <BottomNav />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
