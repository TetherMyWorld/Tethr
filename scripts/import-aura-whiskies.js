import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { importAuraWhiskies } from "../src/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

loadLocalEnvFile();

const args = process.argv.slice(2);
const replaceMode = args.includes("--replace");
const csvArg = args.find((value) => !value.startsWith("--")) || "";
const csvPath = csvArg ? path.resolve(process.cwd(), csvArg) : "";

if (!csvPath) {
  console.error("Usage: node scripts/import-aura-whiskies.js [--replace] path\\to\\whiskies.csv");
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error(`CSV file not found: ${csvPath}`);
  process.exit(1);
}

const parsedRows = loadRows(csvPath);
if (!parsedRows.length) {
  console.error("The input file did not contain any rows.");
  process.exit(1);
}

const imported = importAuraWhiskies(parsedRows, { replace: replaceMode });
console.log(
  `${replaceMode ? "Replaced" : "Imported"} ${imported.length} whisky catalog row(s) into local SQLite.`
);

if (process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY) {
  let existingRemoteRows = await fetchSupabaseRows(
    "aura_whiskies",
    "?select=id,name,canonical_name,distillery"
  );
  if (replaceMode) {
    await deleteAllSupabaseAuraWhiskies();
    existingRemoteRows = [];
  }
  const existingRemoteByKey = new Map(
    existingRemoteRows.map((row) => [stableKey(row.canonical_name || row.name, row.distillery), row])
  );

  const remoteRows = imported.map((row) => ({
    id: existingRemoteByKey.get(stableKey(row.canonicalName || row.name, row.distillery))?.id || row.id,
    slug: row.slug,
    name: row.name,
    canonical_name: row.canonicalName || "",
    distillery: row.distillery,
    expression: row.expression || "",
    country: row.country || "",
    region: row.region || "",
    style: row.style || "",
    age_statement: row.ageStatement || "",
    abv: row.abv || "",
    cask_type: row.caskType || "",
    price_usd: row.priceUsd,
    reference_notes: row.referenceNotes || "",
    image_url: row.imageUrl || "",
    created_at: row.createdAt,
    updated_at: row.updatedAt
  }));
  await upsertSupabaseRows("aura_whiskies", remoteRows, "id");

  if (!replaceMode) {
    const importedKeys = new Set(
      remoteRows.map((row) => stableKey(row.canonical_name || row.name, row.distillery))
    );
    const staleRemoteIds = existingRemoteRows
      .filter((row) => !importedKeys.has(stableKey(row.canonical_name || row.name, row.distillery)))
      .map((row) => row.id);
    if (staleRemoteIds.length) {
      await deleteSupabaseRowsByIds("aura_whiskies", staleRemoteIds);
    }
  }

  console.log(
    `${replaceMode ? "Replaced" : "Synced"} ${remoteRows.length} whisky catalog row(s) in Supabase.`
  );
} else {
  console.log("Supabase env vars not found. Skipped remote sync.");
}

function loadLocalEnvFile() {
  const envFile = path.join(repoRoot, ".env.local");
  if (!fs.existsSync(envFile)) {
    return;
  }
  const content = fs.readFileSync(envFile, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^"(.*)"$/, "$1");
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

function loadRows(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".xlsx") {
    return parseXlsx(filePath);
  }
  const csvContent = fs.readFileSync(filePath, "utf8");
  return parseCsv(csvContent);
}

function parseCsv(content) {
  const rows = [];
  let cell = "";
  let currentRow = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      currentRow.push(cell);
      cell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      currentRow.push(cell);
      cell = "";
      if (currentRow.some((value) => String(value).trim() !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || currentRow.length > 0) {
    currentRow.push(cell);
    if (currentRow.some((value) => String(value).trim() !== "")) {
      rows.push(currentRow);
    }
  }

  if (!rows.length) {
    return [];
  }

  const headerRowIndex = findHeaderRowIndex(rows);
  if (headerRowIndex === -1) {
    throw new Error("Could not find a usable header row in the CSV.");
  }

  const headers = rows[headerRowIndex].map((value) => normalizeHeader(value));
  return rows
    .slice(headerRowIndex + 1)
    .map((values) => {
      const row = {};
      headers.forEach((header, index) => {
        if (!header) {
          return;
        }
        row[header] = String(values[index] || "").trim();
      });
      return normalizeImportRow(row);
    })
    .filter((row) => row.name || row.distillery || row.canonical_name);
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseXlsx(filePath) {
  const pythonScript = `
import json
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

NS_MAIN = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
NS_REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
NS_PKG = "{http://schemas.openxmlformats.org/package/2006/relationships}"

def col_to_index(cell_ref):
    letters = ''.join(ch for ch in cell_ref if ch.isalpha())
    value = 0
    for ch in letters:
        value = value * 26 + (ord(ch.upper()) - 64)
    return max(value - 1, 0)

def cell_value(cell, shared_strings):
    cell_type = cell.attrib.get("t")
    if cell_type == "inlineStr":
        return "".join(node.text or "" for node in cell.findall(".//" + NS_MAIN + "t"))
    v = cell.find(NS_MAIN + "v")
    if v is None or v.text is None:
        return ""
    if cell_type == "s":
        try:
            return shared_strings[int(v.text)]
        except Exception:
            return ""
    return v.text

path = Path(sys.argv[1])
with zipfile.ZipFile(path) as archive:
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    rel_map = {}
    for rel in rels.findall(NS_PKG + "Relationship"):
        rel_map[rel.attrib["Id"]] = rel.attrib["Target"].lstrip("/")

    shared_strings = []
    if "xl/sharedStrings.xml" in archive.namelist():
        shared_root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
        for si in shared_root.findall(NS_MAIN + "si"):
            shared_strings.append("".join(node.text or "" for node in si.findall(".//" + NS_MAIN + "t")))

    sheet_target = None
    for sheet in workbook.find(NS_MAIN + "sheets"):
        if sheet.attrib.get("name") == "Database":
            sheet_target = rel_map[sheet.attrib[NS_REL + "id"]]
            break
    if not sheet_target:
        first_sheet = workbook.find(NS_MAIN + "sheets")[0]
        sheet_target = rel_map[first_sheet.attrib[NS_REL + "id"]]

    sheet_root = ET.fromstring(archive.read(sheet_target))
    rows = []
    for row in sheet_root.find(NS_MAIN + "sheetData").findall(NS_MAIN + "row"):
        values = []
        for cell in row.findall(NS_MAIN + "c"):
            index = col_to_index(cell.attrib.get("r", "A1"))
            while len(values) <= index:
                values.append("")
            values[index] = cell_value(cell, shared_strings)
        rows.append(values)

print(json.dumps(rows))
`;

  const commands = [
    ["python", ["-c", pythonScript, filePath]],
    ["py", ["-c", pythonScript, filePath]]
  ];

  let lastError = null;
  for (const [command, args] of commands) {
    try {
      const output = execFileSync(command, args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      });
      const rows = JSON.parse(output);
      return normalizeParsedRows(rows);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Could not read XLSX file. ${lastError?.stderr?.toString?.().trim() || lastError?.message || ""}`.trim()
  );
}

function normalizeParsedRows(rows) {
  if (!Array.isArray(rows) || !rows.length) {
    return [];
  }
  const headerRowIndex = findHeaderRowIndex(rows);
  if (headerRowIndex === -1) {
    throw new Error("Could not find a usable header row in the workbook.");
  }
  const headers = rows[headerRowIndex].map((value) => normalizeHeader(value));
  return rows
    .slice(headerRowIndex + 1)
    .map((values) => {
      const row = {};
      headers.forEach((header, index) => {
        if (!header) {
          return;
        }
        row[header] = String(values[index] || "").trim();
      });
      return normalizeImportRow(row);
    })
    .filter((row) => row.name || row.distillery || row.canonical_name);
}

function findHeaderRowIndex(rows) {
  return rows.findIndex((row) => {
    const normalized = row.map((value) => normalizeHeader(value));
    const matchesOldFormat =
      normalized.includes("whisky") &&
      (normalized.includes("distillery_producer") || normalized.includes("distillery"));
    const matchesNewFormat =
      normalized.includes("brand") &&
      normalized.includes("expression") &&
      (normalized.includes("canonical_name") || normalized.includes("type") || normalized.includes("distillery"));
    return matchesOldFormat || matchesNewFormat;
  });
}

function normalizeImportRow(row) {
  const brand = cleanValue(row.brand);
  const expression = cleanValue(row.expression);
  const expressionStartsWithBrand =
    brand &&
    expression &&
    expression.toLowerCase().startsWith(brand.toLowerCase());
  const derivedCanonicalName = expressionStartsWithBrand
    ? expression
    : [brand, expression].filter(Boolean).join(" ");
  const canonicalName = cleanValue(row.canonical_name || derivedCanonicalName);
  const oldStyle = cleanValue(row.style || row.type);
  const oldNotes = cleanValue(
    row.basic_tasting_notes || row.reference_notes || row.tasting_notes || row.tasting_note
  );
  const combinedOldNotes = [oldStyle ? `Style: ${oldStyle}` : "", oldNotes]
    .filter(Boolean)
    .join("\n");
  const priceUsdRaw = cleanValue(row.price_usd || row.approx_price_usd);
  const priceUsd = priceUsdRaw ? Number(priceUsdRaw) : null;

  return {
    name: cleanValue(canonicalName || row.name || row.whisky || row.brand),
    canonical_name: canonicalName,
    distillery: cleanValue(row.distillery || row.distillery_producer || row.brand),
    expression: cleanValue(row.expression),
    country: cleanValue(row.country),
    region: cleanValue(row.region || row.location),
    style: oldStyle,
    age_statement: cleanValue(row.age_statement),
    abv: cleanValue(row.abv),
    cask_type: cleanValue(row.cask_type),
    price_usd: Number.isFinite(priceUsd) ? priceUsd : "",
    reference_notes: canonicalName ? oldNotes : combinedOldNotes,
    image_url: cleanValue(row.image_url)
  };
}

function cleanValue(value) {
  return String(value || "").trim();
}

async function upsertSupabaseRows(tableName, rows, conflictTarget = "id") {
  for (const row of rows) {
    await upsertSupabaseRow(tableName, row, conflictTarget);
  }
}

async function upsertSupabaseRow(tableName, row, conflictTarget = "id") {
  const query = conflictTarget ? `?on_conflict=${encodeURIComponent(conflictTarget)}` : "";
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${tableName}${query}`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
      "content-type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify(row)
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
}

async function fetchSupabaseRows(tableName, query = "") {
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${tableName}${query}`, {
    method: "GET",
    headers: {
      apikey: process.env.SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
      "content-type": "application/json",
      Prefer: "return=representation"
    }
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

async function deleteSupabaseRowsByIds(tableName, ids = []) {
  for (const id of ids) {
    const response = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/${tableName}?id=eq.${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: {
          apikey: process.env.SUPABASE_SECRET_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
          "content-type": "application/json",
          Prefer: "return=minimal"
        }
      }
    );
    if (!response.ok) {
      throw new Error(await response.text());
    }
  }
}

async function deleteAllSupabaseAuraWhiskies() {
  const response = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/aura_whiskies?id=not.is.null`,
    {
      method: "DELETE",
      headers: {
        apikey: process.env.SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
        "content-type": "application/json",
        Prefer: "return=minimal"
      }
    }
  );
  if (!response.ok) {
    throw new Error(await response.text());
  }
}

function stableValue(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u2018\u2019']/g, "")
    .toLowerCase()
    .replace(/\b(\d+)\s*(?:years?\s*old|year\s*old|yo)\b/g, "$1")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function stableKey(name, distillery) {
  return `${stableValue(distillery)}::${stableValue(name)}`;
}
