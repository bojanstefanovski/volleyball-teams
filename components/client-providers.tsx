"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import React from "react";
import { ThemeProvider } from "./theme-provider";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <ThemeProvider>{children}</ThemeProvider>
    </ConvexProvider>
  );
}