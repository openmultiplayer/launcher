import { exec as _exec, spawn, spawnSync } from "child_process";
import { promisify } from "node:util";
const exec = promisify(_exec);

/**
 * @type {Record<'npm' | 'yarn', { args?: string[] }>}}
 * @constant
 */
const PACKAGE_MANAGERS_OPTIONS = {
  npm: {
    args: ["run"],
  },
  yarn: {},
};

/**
 *
 * @param {keyof typeof PACKAGE_MANAGERS_OPTIONS} executable
 * @returns {Promise<boolean>}
 */
const hasPackageManager = async (executable) => {
  try {
    await exec(`${executable} --version`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

/**
 *
 * @returns {Promise<keyof typeof PACKAGE_MANAGERS_OPTIONS>}
 */
export const getPackageManagerExecutable = async () => {
  const results = await Promise.allSettled(
    Object.keys(PACKAGE_MANAGERS_OPTIONS).map((exec) =>
      hasPackageManager(exec).then((isInstalled) => isInstalled && exec)
    )
  );

  const packageManager = results.find(
    ({ status, value }) => status === "fulfilled" && value
  );

  if (!packageManager) {
    console.error(
      `No package manager found. Supported: ${Object.keys(
        PACKAGE_MANAGERS_OPTIONS
      ).join(", ")}`
    );
    process.exit(1);
  }

  return packageManager.value;
};

/**
 *
 * @param {keyof typeof PACKAGE_MANAGERS_OPTIONS} packageManager
 * @param {'build' | 'dev'} command
 */
export const executeWithPackageManager = async (packageManager, command) => {
  const commandToRun = [
    packageManager,
    ...(PACKAGE_MANAGERS_OPTIONS[packageManager].args ?? []),
    command,
  ].join(" ");
  const executable = spawn(commandToRun, {
    shell: true,
    cwd: process.cwd(),
    timeout: 10000,
  });

  executable.stdout.on("data", (data) => console.log(data.toString()));
  executable.stderr.on("data", (data) => console.error(data.toString()));
  executable.on("exit", (code) => process.exit(code));
};
