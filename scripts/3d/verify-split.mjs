/**
 * Verify the ?3d=1 split: the plain 2D page must not fetch any .glb (three
 * stays code-split; production first-load stays ~274 kB), while /?3d=1 loads
 * the room models. Also sanity-checks the fan GLB keeps a "blades" node for
 * the spin animation. Dev server on :4317 must be running.
 *
 *   node scripts/3d/verify-split.mjs
 */
import pwCore from "/home/quivo/node/tbh-website-v3/node_modules/playwright-core/index.js";
import fs from "node:fs";

const chromium = pwCore.chromium;
const baseUrl = "http://127.0.0.1:4317";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

async function glbRequests(path) {
  const urls = [];
  const onResponse = (res) => {
    if (res.url().endsWith(".glb")) urls.push(res.url());
  };
  page.on("response", onResponse);
  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  page.off("response", onResponse);
  return urls;
}

const glb2d = await glbRequests("/");
console.log(`2D /: ${glb2d.length} .glb requests ${glb2d.length ? glb2d : ""}`);
const glb3d = await glbRequests("/?3d=1");
console.log(`3D /?3d=1: ${glb3d.length} .glb requests`);

// fan_standing must keep a child node named "blades" (spin target).
const glb = fs.readFileSync("public/models/items/fan_standing.glb");
const jsonLen = glb.readUInt32LE(12);
const gltf = JSON.parse(glb.subarray(20, 20 + jsonLen).toString("utf8"));
const names = (gltf.nodes ?? []).map((n) => n.name);
console.log("fan_standing nodes:", names.join(", "));

await browser.close();

const fail =
  glb2d.length !== 0 || glb3d.length < 15 || !names.includes("blades");
console.log("checks:", {
  noGlbIn2d: glb2d.length === 0,
  glbsIn3d: glb3d.length >= 15,
  fanBladesNode: names.includes("blades"),
});
console.log(fail ? "VERIFY FAILED" : "VERIFY OK");
process.exit(fail ? 1 : 0);
