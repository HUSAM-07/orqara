import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import type { VisitorPlatform } from "~/platform";
import { getVisitorPlatform } from "~/platform";

const PlatformCtx = createContext<VisitorPlatform>("mac");

/** The platform the visitor is browsing from, resolved from the request user agent during SSR. */
export function useVisitorPlatform(): VisitorPlatform {
  return useContext(PlatformCtx);
}

export const Route = createRootRoute({
  loader: async () => {
    const platform = await getVisitorPlatform();
    return { platform };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#101615" },
      { property: "og:site_name", content: "Orqara" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
      { rel: "icon", href: "/logo.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  const data = Route.useLoaderData();
  return (
    <PlatformCtx value={data.platform}>
      <RootDocument>
        <Outlet />
      </RootDocument>
    </PlatformCtx>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
