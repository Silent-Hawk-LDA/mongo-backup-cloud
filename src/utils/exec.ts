import { spawn } from "node:child_process";

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

/**
 * Spawns a process using an argument array (never a shell string) so that
 * untrusted input can never be interpreted as shell syntax.
 */
export function execFileSafe(
  command: string,
  args: string[],
  options: { timeoutMs?: number; env?: NodeJS.ProcessEnv } = {}
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: false,
      env: options.env ?? process.env
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeout = options.timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill("SIGKILL");
        }, options.timeoutMs)
      : undefined;

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      if (timeout) clearTimeout(timeout);
      reject(err);
    });

    child.on("close", (code) => {
      if (timeout) clearTimeout(timeout);
      if (timedOut) {
        reject(new Error(`Command "${command}" timed out after ${options.timeoutMs}ms`));
        return;
      }
      resolve({ stdout, stderr, code: code ?? 0 });
    });
  });
}
