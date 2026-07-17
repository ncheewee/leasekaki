import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: path.startsWith("/api/") ? "application/json" : "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
      IMAGES: {
        input() {
          throw new Error("Image optimization is not expected in this smoke test.");
        },
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the LeaseKaki prototype shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /LeaseKaki/);
  assert.match(html, /Find a place/);
  assert.match(html, /Snap to list/);
  assert.doesNotMatch(html, /RentalGuru|react-loading-skeleton|Your site is taking shape/);
});

test("reports missing Neon configuration without failing the app", async () => {
  const response = await render("/api/health");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/i);

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.database, "not_configured");
});
