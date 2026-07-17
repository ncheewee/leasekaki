#!/usr/bin/env node

const accessKey = process.env.URA_ACCESS_KEY;
const token = process.env.URA_TOKEN;
const service = process.env.URA_SERVICE || "PMI_Resi_Rental_Median";
const refPeriod = process.env.URA_REF_PERIOD;

if (!accessKey || !token) {
  console.error("Missing URA_ACCESS_KEY or URA_TOKEN.");
  console.error("Get an URA data service access key, request the daily token, then run:");
  console.error("URA_ACCESS_KEY=... URA_TOKEN=... node scripts/fetch-ura-rentals.mjs");
  process.exit(1);
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

console.log(JSON.stringify({
  service,
  refPeriod: refPeriod || null,
  count: rows.length,
  summary,
  result: rows
}, null, 2));
