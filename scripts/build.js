import {
  executeWithPackageManager,
  getPackageManagerExecutable,
} from "./common.js";

(async () => {
  const packageManager = await getPackageManagerExecutable();
  await executeWithPackageManager(packageManager, "build");
})();
