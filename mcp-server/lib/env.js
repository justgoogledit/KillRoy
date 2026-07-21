import { readFileSync } from 'node:fs';

// Hand-rolled .env parser instead of a dotenv dependency, for the same reason
// .claude/hooks/session-start.sh parses line by line instead of `source`-ing:
// values may contain unquoted spaces (e.g. Windows paths under "OneDrive -
// Tesla"), and 20 lines beats a dependency for a repo that keeps tooling to
// the minimum the MCP requirement forces.
//
// Values are taken verbatim from the first `=` to end of line (minus a trailing
// CR); no quote stripping, no escapes -- matching what the bash hook and the
// skills' prose have always assumed about this file.
export function loadEnv(envPath) {
  let text;
  try {
    text = readFileSync(envPath, 'utf8');
  } catch {
    return null; // caller decides how loudly to fail on a missing .env
  }
  const env = {};
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (key === '') continue;
    env[key] = line.slice(eq + 1);
  }
  return env;
}
