#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const args = process.argv.slice(2);
const outputIndex = args.indexOf("--out");
const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : "docs/assets/ura-rentals-summary.json";
const inputPaths = (outputIndex >= 0 ? args.slice(0, outputIndex) : args).length
  ? (outputIndex >= 0 ? args.slice(0, outputIndex) : args)
  : ["/tmp/leasekaki-ura-rentals-26q2.json"];

const sources = await Promise.all(inputPaths.map(async (inputPath) => JSON.parse(await readFile(inputPath, "utf8"))));
const districts = new Map();

function districtKey(value) {
  const digits = String(value || "").padStart(2, "0");
  return `D${digits}`;
}

function midpoint(range) {
  const match = String(range || "").match(/(\d+)\s*-\s*(\d+)/);
  if (!match) return null;
  return (Number(match[1]) + Number(match[2])) / 2;
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (index - lo);
}

function leaseMonthOrder(month) {
  const value = String(month || "");
  const mm = Number(value.slice(0, 2));
  const yy = Number(value.slice(2, 4));
  return yy * 12 + mm;
}

for (const source of sources) {
  const rows = Array.isArray(source.result) ? source.result : [];
  for (const project of rows) {
    for (const rental of project.rental || []) {
      const rent = Number(rental.rent);
      if (!Number.isFinite(rent) || rent <= 0) continue;
      const district = districtKey(rental.district);
      const size = midpoint(rental.areaSqm) || midpoint(rental.areaSqft) / 10.764;
      const entry = districts.get(district) || {
        district,
        rents: [],
        byMonth: new Map(),
        scatter: [],
        projects: new Set()
      };
      entry.rents.push(rent);
      entry.projects.add(project.project);
      if (rental.leaseDate) {
        const month = String(rental.leaseDate);
        const values = entry.byMonth.get(month) || [];
        values.push(rent);
        entry.byMonth.set(month, values);
      }
      if (Number.isFinite(size) && entry.scatter.length < 220) {
        entry.scatter.push({
          rent,
          size: Math.round(size),
          project: project.project,
          street: project.street,
          bedrooms: rental.noOfBedRoom || "NA",
          leaseDate: rental.leaseDate
        });
      }
      districts.set(district, entry);
    }
  }
}

const byDistrict = {};
for (const [district, entry] of districts) {
  const rents = entry.rents;
  const months = [...entry.byMonth.entries()].sort(([a], [b]) => leaseMonthOrder(a) - leaseMonthOrder(b)).map(([month, values]) => ({
    month,
    median: Math.round(percentile(values, 0.5)),
    count: values.length
  }));
  byDistrict[district] = {
    district,
    source: "URA PMI_Resi_Rental",
    refPeriods: sources.map((source) => source.refPeriod).filter(Boolean),
    sampleCount: rents.length,
    projectCount: entry.projects.size,
    median: Math.round(percentile(rents, 0.5)),
    p25: Math.round(percentile(rents, 0.25)),
    p75: Math.round(percentile(rents, 0.75)),
    trend: months.slice(-12),
    scatter: entry.scatter
  };
}

const output = {
  generatedAt: new Date().toISOString(),
  service: sources[0]?.service,
  refPeriods: sources.map((source) => source.refPeriod).filter(Boolean),
  note: "Aggregated from URA private residential rental contracts. Use as a private-market benchmark; HDB rooms and HDB whole-unit estimates require separate HDB data or adjustment.",
  byDistrict
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(output, null, 2));
console.log(JSON.stringify({
  outputPath,
  districts: Object.keys(byDistrict).length,
  refPeriods: output.refPeriods,
  sampleDistricts: Object.fromEntries(Object.entries(byDistrict).slice(0, 5).map(([key, value]) => [key, {
    sampleCount: value.sampleCount,
    median: value.median
  }]))
}, null, 2));
