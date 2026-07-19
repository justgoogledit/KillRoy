import { readFileSync, statSync } from 'node:fs';

// Minimal RFC 4180-style CSV parser: quoted fields, escaped quotes (""),
// commas and newlines inside quotes. Hand-rolled (~40 lines) rather than a
// dependency -- the repo keeps tooling to the minimum the MCP requirement
// forces, and the Master Tracker export is a plain SharePoint CSV.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// Strips leading '#'-prefixed comment lines by offset into the original
// string, preserving whatever line-ending convention the rest of the text
// uses -- a global split(/\r?\n/)/join('\n') would silently rewrite CRLF to
// LF inside a quoted field's embedded newline too, not just between rows.
function stripCommentBanner(text) {
  let offset = 0;
  while (offset < text.length) {
    const newlineIndex = text.indexOf('\n', offset);
    const lineEnd = newlineIndex === -1 ? text.length : newlineIndex + 1;
    const rawLine = text.slice(offset, newlineIndex === -1 ? text.length : newlineIndex);
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
    if (!line.startsWith('#')) break;
    offset = lineEnd;
  }
  return text.slice(offset);
}

// Core Master Tracker read. Fail-loud contract: a missing/unreadable file, a
// missing header, or a bad threshold throws with the reason named -- never an
// empty row list. Staleness is a WARN-grade flag in the result, not an error:
// a stale-but-readable CSV blocks nothing (check-connectors' rule), it just
// has to surface downstream as the freshness banner.
export function readMasterTracker({ csvPath, staleWarnHours, projectIdentifier, now = Date.now() }) {
  if (!csvPath) {
    throw new Error('MASTER_TRACKER_CSV_PATH is not set or empty. Fill it in .env (see .env.example).');
  }

  const threshold = Number(staleWarnHours);
  if (staleWarnHours === undefined || staleWarnHours === '' || !Number.isFinite(threshold) || threshold <= 0) {
    throw new Error(`MASTER_TRACKER_STALE_WARN_HOURS is not a positive number: "${staleWarnHours ?? ''}". Fix it in .env (see .env.example).`);
  }

  if (projectIdentifier !== undefined && (typeof projectIdentifier !== 'string' || projectIdentifier.trim() === '')) {
    throw new Error('projectIdentifier, when provided, must be a non-empty string. Omit it entirely to get every row.');
  }

  let stat;
  try {
    stat = statSync(csvPath);
  } catch (cause) {
    throw new Error(`Master Tracker CSV not found or unreadable at ${csvPath}: ${cause.code ?? cause.message}. This is not an empty tracker; the file could not be read.`, { cause });
  }

  let text;
  try {
    text = readFileSync(csvPath, 'utf8');
  } catch (cause) {
    throw new Error(`Master Tracker CSV unreadable at ${csvPath}: ${cause.code ?? cause.message}.`, { cause });
  }

  // Excel's "CSV UTF-8" export (the documented SharePoint path) prepends a
  // byte-order mark. Strip it before any line-based logic runs, rather than
  // relying on String#trim() incidentally eating it later.
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  // The fixture convention (and a safe general habit): leading lines starting
  // with '#' are comments, not data -- the fixture's first line is its
  // SYNTHETIC FIXTURE DATA banner. Strip only those leading lines by offset
  // rather than split/join-ing the whole text, so CRLF sequences embedded in
  // a quoted multi-line field further down are never rewritten.
  const body = stripCommentBanner(text);

  const parsed = parseCsv(body).filter((r) => !(r.length === 1 && r[0].trim() === ''));
  if (parsed.length === 0) {
    throw new Error(`Master Tracker CSV at ${csvPath} has no header row (file is empty after comment lines). Refusing to guess.`);
  }

  const header = parsed[0].map((h) => h.trim());
  if (header.length < 2 || header.every((h) => h === '')) {
    throw new Error(`Master Tracker CSV at ${csvPath} has an implausible header row (${JSON.stringify(parsed[0])}). Unexpected shape -- refusing to guess.`);
  }

  if (projectIdentifier && !header.includes('projectIdentifier')) {
    throw new Error(`Master Tracker CSV at ${csvPath} has no "projectIdentifier" column (header: ${JSON.stringify(header)}). Cannot filter by fleet -- refusing to guess which column it renamed to.`);
  }

  const allRows = parsed.slice(1).map((cells, idx) => {
    if (cells.length !== header.length) {
      throw new Error(`Master Tracker CSV at ${csvPath} has a malformed row (data row ${idx + 1}): expected ${header.length} columns, found ${cells.length}. Refusing to guess which column shifted.`);
    }
    const obj = {};
    header.forEach((h, i) => {
      obj[h] = cells[i].trim();
    });
    return obj;
  });

  const rows = projectIdentifier
    ? allRows.filter((r) => r.projectIdentifier === projectIdentifier)
    : allRows;

  const ageMs = now - stat.mtimeMs;
  const ageHours = Math.floor(ageMs / 3600000);

  return {
    rowCount: rows.length,
    totalRowCount: allRows.length,
    projectIdentifier: projectIdentifier ?? null,
    header,
    rows,
    path: csvPath,
    mtimeIso: new Date(stat.mtimeMs).toISOString(),
    ageHours,
    staleWarnHours: threshold,
    stale: ageMs > threshold * 3600000,
  };
}
