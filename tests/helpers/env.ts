type Env = Record<string, string | undefined>;

function processEnv(): Env {
  return (globalThis as unknown as { process?: { env?: Env } }).process?.env ?? {};
}

/** Set env vars for the duration of a test, restoring previous values after. */
export function withEnv(env: Env, fn: () => void | Promise<void>): Promise<void> {
  const prev = processEnv();
  Object.assign(processEnv(), env);
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      const current = processEnv();
      for (const k of Object.keys(current)) delete current[k];
      Object.assign(current, prev);
    });
}

/** Set a single env var, or delete it when value is undefined. */
export function setEnv(key: string, value: string | undefined): void {
  const env = processEnv();
  if (value === undefined) delete env[key];
  else env[key] = value;
}
