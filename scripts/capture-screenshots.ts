/**
 * Playwright screenshot generator for submission assets.
 * Usage: npx ts-node scripts/capture-screenshots.ts [base_url]
 *
 * Captures:
 *   - landing page (OG image crop)
 *   - arena page (full layout)
 *   - leaderboard page
 *   - replay page
 *   - self-correction overlay (triggered via [dev] button)
 */
import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "screenshots");

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // Landing page
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(OUT_DIR, "landing.png"), fullPage: false });
  // OG image crop (1200×630)
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(OUT_DIR, "og-image.png") });

  // Arena
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/arena`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, "arena.png") });

  // Open counter window to show the CTA state
  await page.click("button:has-text('[dev] open counter window')");
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT_DIR, "arena-counter-open.png") });

  // Leaderboard
  await page.goto(`${BASE}/leaderboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "leaderboard.png") });

  // Replay
  await page.goto(`${BASE}/replay`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "replay.png") });

  await browser.close();
  console.log(`✅  Screenshots saved to ${OUT_DIR}/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
