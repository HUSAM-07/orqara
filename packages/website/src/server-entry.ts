import startEntry from "@tanstack/react-start/server-entry";
import { getCanonicalRedirect } from "~/canonical-url";
import { buildLlmsTxt } from "~/llms";

function withoutSharedCaching(response: Response): Response {
  const result = new Response(response.body, response);
  result.headers.set("cache-control", "private, no-store");
  result.headers.set("vary", "user-agent");
  return result;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const redirect = getCanonicalRedirect(url, import.meta.env.DEV ? "development" : "production");
    if (redirect) return Response.redirect(redirect, 301);
    if (url.pathname === "/llms.txt") {
      return new Response(buildLlmsTxt(), {
        headers: { "content-type": "text/markdown; charset=utf-8" },
      });
    }
    const response = await startEntry.fetch(request);
    return response.headers.get("content-type")?.includes("text/html")
      ? withoutSharedCaching(response)
      : response;
  },
};
