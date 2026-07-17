#!/usr/bin/env node

import { writeFile } from "node:fs/promises";

const accessKey = process.env.URA_ACCESS_KEY;
let token = process.env.URA_TOKEN;
const service = process.env.URA_SERVICE || "PMI_Resi_Rental";
const refPeriod = process.env.URA_REF_PERIOD;
const outputPath = process.env.URA_OUTPUT_PATH;

if (!accessKey) {
  console.error("Missing URA_ACCESS_KEY.");
  console.error("Run: URA_ACCESS_KEY=... URA_REF_PERIOD=26q2 npm run ura:rentals");
  process.exit(1);
}

if (!token) {
  const tokenResponse = await fetch("https://eservice.ura.gov.sg/uraDataService/insertNewToken/v1", {
    headers: { AccessKey: accessKey, accept: "application/json" }
  });
  if (!tokenResponse.ok) throw new Error(`URA token endpoint returned HTTP ${tokenResponse.status}`);
  const tokenBody = await tokenResponse.json();
  if (tokenBody.Status !== "Success" || !tokenBody.Result) {
    throw new Error(`URA token status: ${tokenBody.Status || "Unknown"} ${tokenBody.Message || ""}`.trim());
  }
  token = tokenBody.Result;
}

const url = new URL("https://eservice.ura.gov.sg/uraDataService/invokeUraDS/v1");
url.searchParams.set("service", service);
if (refPeriod) url.searchParams.set("refPeriod", refPeriod);

const response = await fetch(url, {
  headers: {
    AccessKey: accessKey,
    Token: token,
    accept: "application/json"
  }
});

if (!response.ok) {
  throw new Error(`URA API returned HTTP ${response.status}`);
}

const body = await response.json();
if (body.Status && body.Status !== "Success") {
  throw new Error(`URA API status: ${body.Status}`);
}

const rows = Array.isArray(body.Result) ? body.Result : [];
const summary = rows.slice(0, 5).map((project) => ({
  project: project.project,
  street: project.street,
  district: project.rentalMedian?.[0]?.district || project.rental?.[0]?.district,
  sampleCount: project.rentalMedian?.length || project.rental?.length || 0
}));

const output = {
  service,
  refPeriod: refPeriod || null,
  count: rows.length,
  summary,
  result: rows
};

if (outputPath) {
  await writeFile(outputPath, JSON.stringify(output, null, 2));
  console.log(JSON.stringify({ service, refPeriod: refPeriod || null, count: rows.length, summary, outputPath }, null, 2));
} else {
  console.log(JSON.stringify(output, null, 2));
}
