export interface WineOverlayResource {
  downloadUrl: string;
  md5: string;
}

const wineOverlayDownloadUrl = "https://assets.open.mp/omp-wine.dll";
const wineOverlayMd5 = "5f068c44dc81880b96ec27d422d4871b";

export const wineOverlayResource: WineOverlayResource = {
  downloadUrl: wineOverlayDownloadUrl,
  md5: wineOverlayMd5,
};
