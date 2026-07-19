// Walk an error's cause chain (including AggregateError errors[]) for the
// first syscall-style code (ECONNREFUSED, ETIMEDOUT, EAI_AGAIN, ...). undici
// buries these at varying depths under "fetch failed"; every connector tool
// uses this so a network failure always names its real reason.
export function findSyscallCode(err) {
  const seen = new Set();
  const stack = [err];
  while (stack.length > 0) {
    const e = stack.pop();
    if (!e || typeof e !== 'object' || seen.has(e)) continue;
    seen.add(e);
    if (typeof e.code === 'string' && /^E[A-Z_]+$/.test(e.code)) return e.code;
    if (e.cause) stack.push(e.cause);
    if (Array.isArray(e.errors)) stack.push(...e.errors);
  }
  return null;
}
