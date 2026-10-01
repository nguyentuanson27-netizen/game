import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize } from "node:path";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
  ".json": "application/json",
};

export interface StaticServer {
  url: string;
  /** Stops the server and drops open connections, so later requests truly fail. */
  stop: () => Promise<void>;
}

/** Serves a built `dist/` directory under `basePath`, like GitHub Pages project hosting. */
export async function startStaticServer(root: string, basePath: string): Promise<StaticServer> {
  const server = createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
    if (!pathname.startsWith(basePath)) {
      res.writeHead(404).end();
      return;
    }
    const rest = pathname.slice(basePath.length);
    const relative = normalize(
      rest === "" || rest.endsWith("/") ? `${rest}index.html` : rest,
    ).replace(/^(\.\.[/\\])+/, "");
    const file = join(root, relative);
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}${basePath}`,
    stop: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  };
}
