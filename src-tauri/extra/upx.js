import { exec } from "child_process";

let cmd = "--best --brute ./src-tauri/target/release/omp-launcher";
if (process.platform === "win32") {
  cmd += ".exe";
  cmd = "\"./src-tauri/upx/win.exe\" " + cmd;
} else {
  cmd = "src-tauri/upx/linux " + cmd;
}

exec(cmd, (err, stdout, stderr) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(`stdout: ${stdout}`);
  console.error(`stderr: ${stderr}`);
});
