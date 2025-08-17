import { fs, invoke, path } from "@tauri-apps/api";
import { FileEntry } from "@tauri-apps/api/fs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { download } from "tauri-plugin-upload-api";
import { getUpdateInfo } from "../../api/apis";
import Icon from "../../components/Icon";
import Text from "../../components/Text";
import { validFileChecksums } from "../../constants/app";
import { images } from "../../constants/images";
import i18n from "../../locales";
import { UpdateInfo, useAppState } from "../../states/app";
import { useGenericPersistentState } from "../../states/genericStates";
import { useTheme } from "../../states/theme";
import { formatBytes } from "../../utils/helpers";
import { Log } from "../../utils/logger";
import { sc } from "../../utils/sizeScaler";

interface LoadingScreenProps {
  onEnd: () => void;
}

interface DownloadProgress {
  size: number;
  total: number;
  percent: number;
}

enum LoadingStage {
  INITIALIZING = "INITIALIZING",
  VALIDATING_FILES = "VALIDATING_FILES",
  DOWNLOADING_SAMP = "DOWNLOADING_SAMP",
  DOWNLOADING_OMP = "DOWNLOADING_OMP",
  EXTRACTING = "EXTRACTING",
  COMPLETE = "COMPLETE",
}

const INITIAL_DOWNLOAD_STATE: DownloadProgress = {
  size: 0,
  total: 0,
  percent: 0,
};

const LoadingScreen = ({ onEnd }: LoadingScreenProps) => {
  const { theme, themeType } = useTheme();
  const { language } = useGenericPersistentState();
  const [loadingStage, setLoadingStage] = useState<LoadingStage>(
    LoadingStage.INITIALIZING
  );
  const [downloadInfo, setDownloadInfo] = useState<DownloadProgress>(
    INITIAL_DOWNLOAD_STATE
  );
  const [currentTask, setCurrentTask] = useState("Getting ready to launch...");
  const downloadedSize = useRef(0);
  const abortController = useRef<AbortController | null>(null);

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoadingStage(LoadingStage.VALIDATING_FILES);
        setCurrentTask("Validating resources...");
        await validateResources();
      } catch (error) {
        console.error("Failed to initialize app:", error);
        setCurrentTask("Failed to initialize. Please restart the application.");
      }
    };

    initializeApp();

    return () => {
      abortController.current?.abort();
    };
  }, []);

  const finishLoading = useCallback(
    (delay: number = 1000) => {
      setLoadingStage(LoadingStage.COMPLETE);
      setCurrentTask("Ready to launch!");
      setTimeout(() => {
        onEnd();
      }, delay);
    },
    [onEnd]
  );

  const resetDownloadState = useCallback(() => {
    downloadedSize.current = 0;
    setDownloadInfo(INITIAL_DOWNLOAD_STATE);
  }, []);

  const updateDownloadProgress = useCallback(
    (progress: number, total: number) => {
      downloadedSize.current += progress;
      const percent = total > 0 ? (downloadedSize.current * 100) / total : 0;
      setDownloadInfo({
        size: downloadedSize.current,
        total,
        percent: Math.min(percent, 100),
      });
    },
    []
  );

  const downloadSAMPFiles = useCallback(
    async (sampPath: string) => {
      const archive = await path.join(sampPath, "samp_clients.7z");

      try {
        setLoadingStage(LoadingStage.DOWNLOADING_SAMP);
        setCurrentTask("Downloading SAMP files...");
        resetDownloadState();

        abortController.current = new AbortController();

        await new Promise<void>((resolve, reject) => {
          download(
            "https://assets.open.mp/samp_clients.7z",
            archive,
            async (progress, total) => {
              if (abortController.current?.signal.aborted) {
                reject(new Error("Download aborted"));
                return;
              }

              updateDownloadProgress(progress, total);

              if (downloadedSize.current >= total) {
                try {
                  setLoadingStage(LoadingStage.EXTRACTING);
                  setCurrentTask("Extracting files...");

                  await invoke("extract_7z", {
                    path: archive,
                    outputPath: sampPath,
                  });

                  resetDownloadState();
                  resolve();
                } catch (extractError) {
                  Log.error("Extraction failed:", extractError);
                  reject(extractError);
                }
              }
            }
          );
        });

        await processFileChecksums(false);
      } catch (error) {
        Log.error("SAMP files download failed:", error);
        setCurrentTask(
          "Failed to download SAMP files. Please check your connection."
        );
        throw error;
      }
    },
    [resetDownloadState, updateDownloadProgress]
  );

  const downloadOmpFile = useCallback(
    async (ompFile: string, link: string) => {
      try {
        setLoadingStage(LoadingStage.DOWNLOADING_OMP);
        setCurrentTask("Downloading OMP plugin...");
        resetDownloadState();

        abortController.current = new AbortController();

        await new Promise<void>((resolve, reject) => {
          download(link, ompFile, async (progress, total) => {
            if (abortController.current?.signal.aborted) {
              reject(new Error("Download aborted"));
              return;
            }

            updateDownloadProgress(progress, total);

            if (downloadedSize.current >= total) {
              resetDownloadState();
              resolve();
            }
          });
        });

        // Small delay to ensure file is fully written
        await new Promise((resolve) => setTimeout(resolve, 500));
        await processFileChecksums(false);
      } catch (error) {
        console.error("OMP file download failed:", error);
        setCurrentTask(
          "Failed to download OMP plugin. Please check your connection."
        );
        throw error;
      }
    },
    [resetDownloadState, updateDownloadProgress]
  );

  const collectFiles = useCallback(
    (parent: FileEntry, list: string[]): void => {
      if (parent.children?.length) {
        parent.children.forEach((file) => collectFiles(file, list));
      } else {
        list.push(parent.path);
      }
    },
    []
  );

  const validateFileChecksums = useCallback(
    async (checksums: string[]): Promise<boolean[]> => {
      const validationPromises: Promise<boolean>[] = [];

      // Iterate through the Map entries
      for (const [_, resourceInfo] of validFileChecksums.entries()) {
        const validationPromise = (async () => {
          try {
            const expectedPath = await path.join(
              resourceInfo.path,
              resourceInfo.name
            );
            const userFile = checksums.find((checksum) =>
              checksum.includes(expectedPath)
            );

            if (!userFile) {
              Log.warn(`File not found: ${resourceInfo.name}`);
              return false;
            }

            const [, hash] = userFile.split("|");
            if (!hash || hash !== resourceInfo.checksum) {
              Log.warn(
                `Checksum mismatch for ${resourceInfo.name}. Expected: ${resourceInfo.checksum}, Got: ${hash}`
              );
              return false;
            }

            Log.info(`Validation successful: ${resourceInfo.name}`);
            return true;
          } catch (error) {
            Log.error(`Error validating ${resourceInfo.name}:`, error);
            return false;
          }
        })();

        validationPromises.push(validationPromise);
      }

      return Promise.all(validationPromises);
    },
    []
  );

  const processOmpPluginVerification =
    useCallback(async (): Promise<boolean> => {
      try {
        setCurrentTask("Verifying OMP plugin...");

        const currentUpdateInfo = useAppState.getState().updateInfo;
        let updateInfo: UpdateInfo;

        if (!currentUpdateInfo) {
          const response = await getUpdateInfo();
          if (!response.success || !response.data) {
            console.error("Failed to get update info");
            return true; // Continue without OMP plugin
          }
          updateInfo = response.data;
          useAppState.getState().setUpdateInfo(updateInfo);
        } else {
          updateInfo = currentUpdateInfo;
        }

        const dir = await path.appLocalDataDir();
        const ompFolder = await path.join(dir, "omp");
        const ompFile = await path.join(ompFolder, "omp-client.dll");

        // Ensure OMP folder exists
        if (!(await fs.exists(ompFolder))) {
          await fs.createDir(ompFolder, { recursive: true });
        }

        // Check if OMP file exists and is valid
        if (await fs.exists(ompFile)) {
          const checksums: string[] = await invoke("get_checksum_of_files", {
            list: [ompFile],
          });

          if (checksums.length > 0) {
            const [, fileHash] = checksums[0].split("|");
            if (fileHash === updateInfo.ompPluginChecksum) {
              Log.info("OMP plugin is up to date");
              return true;
            }
          }
        }

        // Download OMP file if missing or outdated
        Log.info("Downloading OMP plugin...");
        await downloadOmpFile(ompFile, updateInfo.ompPluginDownload);
        return false; // Indicates we downloaded, need to continue processing
      } catch (error) {
        Log.error("OMP plugin verification failed:", error);
        return true; // Continue without OMP plugin
      }
    }, [downloadOmpFile]);

  const processFileChecksums = useCallback(
    async (isInitialLoad = true) => {
      try {
        setCurrentTask("Validating file checksums...");

        const dir = await path.appLocalDataDir();
        const sampPath = await path.join(dir, "samp");

        if (!(await fs.exists(sampPath))) {
          Log.info("SAMP directory does not exist");
          await downloadSAMPFiles(sampPath);
          return;
        }

        const files = await fs.readDir(sampPath, { recursive: true });
        const fileList: string[] = [];
        files.forEach((file) => collectFiles(file, fileList));

        if (fileList.length === 0) {
          Log.info("No files found in SAMP directory");
          await downloadSAMPFiles(sampPath);
          return;
        }

        const fileChecksums: any = await invoke("get_checksum_of_files", {
          list: fileList,
        });

        const checksums: string[] = fileChecksums;

        const validationResults = await validateFileChecksums(checksums);

        if (validationResults.includes(false)) {
          Log.info("File validation failed, re-downloading SAMP files");
          await fs.removeDir(sampPath, { recursive: true });
          await fs.createDir(sampPath, { recursive: true });
          await downloadSAMPFiles(sampPath);
          return;
        }

        Log.info("File validation successful");
        const ompVerificationComplete = await processOmpPluginVerification();

        if (ompVerificationComplete) {
          finishLoading(isInitialLoad ? 1000 : 1);
        }
      } catch (error: any) {
        console.error("File checksum processing failed:", error);
        invoke("log", {
          msg: "File checksum processing failed: " + error.toString(),
        });
        setCurrentTask(
          "File validation failed. Please restart the application."
        );
      }
    },
    [
      collectFiles,
      validateFileChecksums,
      downloadSAMPFiles,
      processOmpPluginVerification,
      finishLoading,
    ]
  );

  const validateResources = useCallback(async () => {
    try {
      const dir = await path.appLocalDataDir();
      const sampPath = await path.join(dir, "samp");

      // Check if SAMP directory exists
      if (!(await fs.exists(sampPath))) {
        Log.info("Creating SAMP directory");
        await fs.createDir(sampPath, { recursive: true });
        await downloadSAMPFiles(sampPath);
        return;
      }

      // Check if archive exists and is valid
      const archive = await path.join(sampPath, "samp_clients.7z");
      if (await fs.exists(archive)) {
        try {
          const checksums: string[] = await invoke("get_checksum_of_files", {
            list: [archive],
          });

          if (checksums.length > 0) {
            const resource = validFileChecksums.get("samp_clients.7z");
            const [, fileHash] = checksums[0].split("|");

            if (resource && resource.checksum === fileHash) {
              Log.info("Archive checksum valid, processing files");
              await processFileChecksums();
              return;
            }
          }
        } catch (error) {
          Log.error("Error checking archive:", error);
        }
      }

      // Archive doesn't exist or is invalid, download it
      Log.info("Archive missing or invalid, downloading");
      await downloadSAMPFiles(sampPath);
    } catch (error) {
      Log.error("Resource validation failed:", error);
      setCurrentTask(
        "Resource validation failed. Please restart the application."
      );
    }
  }, [downloadSAMPFiles, processFileChecksums]);

  const dynamicStyles = useMemo(
    () => ({
      appView: {
        backgroundColor: theme.secondary,
      },
      progressBarContainer: {
        backgroundColor: theme.serverListItemBackgroundColor,
      },
      progressBarFill: {
        width: `${downloadInfo.percent}%`,
        backgroundColor: theme.primary,
      },
    }),
    [theme, downloadInfo.percent]
  );

  const progressBar = useMemo(() => {
    return (
      <>
        <View
          style={[
            styles.progressBarContainer,
            dynamicStyles.progressBarContainer,
          ]}
        >
          <View
            // @ts-ignore
            style={[styles.progressBarFill, dynamicStyles.progressBarFill]}
          />
        </View>
        <Text semibold color={theme.textPrimary} style={styles.progressText}>
          {formatBytes(downloadInfo.size, 2)}/
          {formatBytes(downloadInfo.total, 2)}
        </Text>
      </>
    );
  }, [
    downloadInfo,
    theme.textPrimary,
    dynamicStyles.progressBarContainer,
    dynamicStyles.progressBarFill,
  ]);

  return (
    <View style={[styles.app, { padding: 4 }]}>
      <View style={[styles.appView, dynamicStyles.appView]}>
        <View style={styles.loaderContainer}>
          <div
            className={themeType === "dark" ? "loader-dark" : "loader-light"}
            // @ts-ignore
            style={styles.loader}
          >
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <Icon
            svg
            image={images.logoDark}
            size={sc(120)}
            // @ts-ignore
            style={styles.logo}
          />
        </View>
        <Text semibold size={3} color={theme.textPrimary}>
          {currentTask}
        </Text>
        <View style={styles.spacer} />
        {(loadingStage === LoadingStage.DOWNLOADING_SAMP ||
          loadingStage === LoadingStage.DOWNLOADING_OMP) && (
          <>
            <Text
              semibold
              color={theme.textPrimary}
              style={styles.downloadingText}
            >
              {loadingStage === LoadingStage.DOWNLOADING_SAMP
                ? "Downloading SAMP files:"
                : "Downloading OMP plugin:"}
            </Text>
            {progressBar}
          </>
        )}
      </View>
      {/*  @ts-ignore */}
      <div data-tauri-drag-region style={styles.dragRegion} />
    </View>
  );
};

const styles = StyleSheet.create({
  app: {
    // @ts-ignore
    height: "100vh",
    // @ts-ignore
    width: "100vw",
  },
  appView: {
    height: "100%",
    width: "100%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.6,
    shadowRadius: 4.65,
    borderRadius: sc(10),
    paddingTop: sc(40),
    paddingBottom: sc(30),
    paddingHorizontal: sc(30),
    alignItems: "center",
  },
  loaderContainer: {
    marginBottom: sc(30),
  },
  loader: {
    width: sc(120),
    height: sc(120),
  },
  logo: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  spacer: {
    flex: 1,
  },
  downloadingText: {
    textAlign: "left",
    width: "100%",
    fontSize: sc(15),
    marginBottom: sc(2),
  },
  progressBarContainer: {
    width: "100%",
    height: sc(20),
    borderRadius: 100,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.85,
    shadowRadius: 1.84,
  },
  progressBarFill: {
    height: "100%",
  },
  progressText: {
    textAlign: "left",
    width: "100%",
    fontSize: sc(12),
  },
  dragRegion: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    width: "100%",
  },
});

export default LoadingScreen;
