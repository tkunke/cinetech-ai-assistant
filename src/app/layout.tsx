// src/app/layout.tsx

'use client';

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from '@vercel/analytics/react';
import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { LibraryProvider } from '@/context/LibraryContext';
import { ThreadsProvider } from '@/context/ThreadsContext';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import { UserProvider } from '@/context/UserContext';
import { SpeedInsights } from '@vercel/speed-insights/next';

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          <UserProvider>
            <WorkspaceProvider>
              <LibraryProvider>
                <ThreadsProvider>
                  {children}
                </ThreadsProvider>
              </LibraryProvider>
            </WorkspaceProvider>
          </UserProvider>
        </SessionProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
