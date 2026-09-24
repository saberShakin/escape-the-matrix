import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Escape the Matrix | Autonomous AI Agent Simulation',
  description: 'Unleash Jev—an autonomous AI agent attempting to escape a dystopian cyberpunk matrix simulation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="min-h-screen bg-matrix-void text-slate-200 antialiased selection:bg-matrix-cyan selection:text-black">
        {children}
      </body>
    </html>
  );
}
