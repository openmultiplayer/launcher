export const VERSION = "5";
export const IN_GAME = process.argv[4] && process.argv[4] == "--ingame";
export const DEBUG_MODE = process.argv[3] && process.argv[3] == "--ompdebug";

type ResourceName =
  | "samp_clients.7z"
  | "037R1_samp.dll"
  | "037R2_samp.dll"
  | "037R3_samp.dll"
  | "037R31_samp.dll"
  | "037R4_samp.dll"
  | "037R5_samp.dll"
  | "03DL_samp.dll"
  | "bass.dll"
  | "gtaweap3.ttf"
  | "mouse.png"
  | "rcon.exe"
  | "blanktex.txd"
  | "CUSTOM.ide"
  | "custom.img"
  | "samaps.txd"
  | "SAMP.ide"
  | "SAMP.img"
  | "SAMP.ipl"
  | "SAMPCOL.img"
  | "samp.saa"
  | "sampaux3.ttf"
  | "sampgui.png"
  | "samp_debug.exe";

export interface ResourceInfo {
  path: string;
  checksum: string;
  name: string;
  requiredInGameDir?: boolean;
}

export const validFileChecksums = new Map<ResourceName, ResourceInfo>();

const fillvalidFileChecksumsMap = () => {
  validFileChecksums.set("samp_clients.7z", {
    path: "samp/",
    name: "samp_clients.7z",
    checksum: "5572377f1c6f9fbcb673a8cf26c19984",
  });
  validFileChecksums.set("037R1_samp.dll", {
    path: "samp/0.3.7-R1/",
    name: "samp.dll",
    checksum: "1d22eaa2605717ddf215f68e861de378",
  });
  validFileChecksums.set("037R2_samp.dll", {
    path: "samp/0.3.7-R2/",
    name: "samp.dll",
    checksum: "074241172174f9f2f93afce3261f97ad",
  });
  validFileChecksums.set("037R3_samp.dll", {
    path: "samp/0.3.7-R3/",
    name: "samp.dll",
    checksum: "61dfd96e0bb01e2fd8cd27e0df18e653",
  });
  validFileChecksums.set("037R31_samp.dll", {
    path: "samp/0.3.7-R3-1/",
    name: "samp.dll",
    checksum: "08cf4166d916e314ed3ee8cff2f13cca",
  });
  validFileChecksums.set("037R4_samp.dll", {
    path: "samp/0.3.7-R4/",
    name: "samp.dll",
    checksum: "7b3a5b379848eda9f9e26f633515a77d",
  });
  validFileChecksums.set("037R5_samp.dll", {
    path: "samp/0.3.7-R5/",
    name: "samp.dll",
    checksum: "5ba5f0be7af99dfd03fb39e88a970a2b",
  });
  validFileChecksums.set("03DL_samp.dll", {
    path: "samp/0.3.DL/",
    name: "samp.dll",
    checksum: "449e4f985215ffb5bffadf23551c0d50",
  });
  validFileChecksums.set("bass.dll", {
    path: "samp/shared/",
    name: "bass.dll",
    checksum: "8f5b9b73d33e8c99202b5058cb6dce51",
    requiredInGameDir: true,
  });
  validFileChecksums.set("gtaweap3.ttf", {
    path: "samp/shared/",
    name: "gtaweap3.ttf",
    checksum: "59cbae9fd42a9a4eea90af7f81e5e734",
    requiredInGameDir: true,
  });
  validFileChecksums.set("mouse.png", {
    path: "samp/shared/",
    name: "mouse.png",
    checksum: "337ddcbe53be7dd8032fb8f6fe1b607b",
    requiredInGameDir: true,
  });
  validFileChecksums.set("rcon.exe", {
    path: "samp/shared/",
    name: "rcon.exe",
    checksum: "3f4821cda1de6d7d10654e5537b4df6e",
    requiredInGameDir: true,
  });
  validFileChecksums.set("blanktex.txd", {
    path: "samp/shared/SAMP/",
    name: "blanktex.txd",
    checksum: "00dc42d499f5ca6059e4683fd761f032",
    requiredInGameDir: true,
  });
  validFileChecksums.set("CUSTOM.ide", {
    path: "samp/shared/SAMP/",
    name: "CUSTOM.ide",
    checksum: "d41d8cd98f00b204e9800998ecf8427e",
    requiredInGameDir: true,
  });
  validFileChecksums.set("custom.img", {
    path: "samp/shared/SAMP/",
    name: "custom.img",
    checksum: "8fc7f2ec79402a952d5b896b710b3a41",
    requiredInGameDir: true,
  });
  validFileChecksums.set("samaps.txd", {
    path: "samp/shared/SAMP/",
    name: "samaps.txd",
    checksum: "e0fdfd9fbe272baa9284e275fb426610",
    requiredInGameDir: true,
  });
  validFileChecksums.set("SAMP.ide", {
    path: "samp/shared/SAMP/",
    name: "SAMP.ide",
    checksum: "9fc8a6769f18d3daceabbbed8632c68e",
    requiredInGameDir: true,
  });
  validFileChecksums.set("SAMP.img", {
    path: "samp/shared/SAMP/",
    name: "SAMP.img",
    checksum: "c85eb523407583f602a2f48df572081f",
    requiredInGameDir: true,
  });
  validFileChecksums.set("SAMP.ipl", {
    path: "samp/shared/SAMP/",
    name: "SAMP.ipl",
    checksum: "f5fc70efa49b43fc48fc71e3c680b50e",
    requiredInGameDir: true,
  });
  validFileChecksums.set("SAMPCOL.img", {
    path: "samp/shared/SAMP/",
    name: "SAMPCOL.img",
    checksum: "eb690e98b644fa584be6917d48ee6cbc",
    requiredInGameDir: true,
  });
  validFileChecksums.set("samp.saa", {
    path: "samp/shared/",
    name: "samp.saa",
    checksum: "833af65bc94eea6f8503900ef597ad51",
    requiredInGameDir: true,
  });
  validFileChecksums.set("sampaux3.ttf", {
    path: "samp/shared/",
    name: "sampaux3.ttf",
    checksum: "6a03a32076e76f6c1720cad6c6ea6915",
    requiredInGameDir: true,
  });
  validFileChecksums.set("sampgui.png", {
    path: "samp/shared/",
    name: "sampgui.png",
    checksum: "1423c18dfa2064d967b397227960b93d",
    requiredInGameDir: true,
  });
  validFileChecksums.set("samp_debug.exe", {
    path: "samp/shared/",
    name: "samp_debug.exe",
    checksum: "2c00c60a5511c3a41a70296fd1879067",
    requiredInGameDir: true,
  });
};

fillvalidFileChecksumsMap();
