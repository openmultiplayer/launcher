import { fs, path } from "@tauri-apps/api";
import { FileEntry } from "@tauri-apps/api/fs";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { download } from "tauri-plugin-upload-api";
import { invoke_rpc } from "../../api/rpc";
import Icon from "../../components/Icon";
import Text from "../../components/Text";
import { validFileChecksums } from "../../constants/app";
import { images } from "../../constants/images";
import i18n from "../../locales";
import { useGenericPersistentState } from "../../states/genericStates";
import { useTheme } from "../../states/theme";
import { formatBytes } from "../../utils/helpers";
import { sc } from "../../utils/sizeScaler";

const LoadingScreen = (props: { onEnd: () => void }) => {
  const { theme, themeType } = useTheme();
  const { language } = useGenericPersistentState();
  const [downloading, setDownloading] = useState(false);
  const downloadedSize = useRef(0);
  const [downloadInfo, setDownloadInfo] = useState<{
    size: number;
    total: number;
    percent: number;
  }>({ size: 0, total: 0, percent: 0 });

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  const finishLoading = (delay: number) => {
    setTimeout(() => {
      props.onEnd();
    }, delay);
  };

  const downloadResources = async (samp: string) => {
    const archive = await path.join(samp, "samp_clients.7z");
    setDownloading(true);
    setDownloadInfo({ size: 0, total: 0, percent: 0 });
    download(
      "https://assets.open.mp/samp_clients.7z",
      archive,
      async (progress, total) => {
        downloadedSize.current += progress;
        setDownloadInfo({
          size: downloadedSize.current,
          total: total,
          percent: (downloadedSize.current * 100) / total,
        });
        if (downloadedSize.current === total) {
          await invoke_rpc("extract_7z", {
            path: archive,
            outputPath: samp,
          });
          setDownloading(false);
          finishLoading(1);
        }
        console.log(`Downloaded ${downloadedSize.current} of ${total} bytes`);
      }
    );
  };

  const collectFiles = async (parent: FileEntry, list: any[]) => {
    if (parent.children && parent.children.length) {
      parent.children.forEach((file: any) => collectFiles(file, list));
    } else {
      list.push(parent.path);
    }
  };

  const validateFileChecksums = (checksums: string[]) => {
    const promises: Promise<boolean>[] = [];

    validFileChecksums.forEach(async (info, _) => {
      promises.push(
        new Promise(async (resolve, _) => {
          let userFile: string | undefined;
          const path1 = await path.join(info.path, info.name);
          let found = false;
          checksums.forEach((checksum) => {
            const check = checksum.includes(path1);
            if (check) {
              userFile = checksum;
              found = true;
            }
          });

          if (!found) {
            resolve(false);
          } else {
            if (userFile && userFile.length) {
              const parts = userFile.split("|");
              if (parts[1].length) {
                const hash = parts[1];
                if (hash === info.checksum) {
                  resolve(true);
                  console.log("validation accepted", info.name);
                } else {
                  resolve(false);
                }
              }
            }
          }
        })
      );
    });

    return Promise.all(promises);
  };

  const processFileChecksums = async () => {
    const dir = await path.appLocalDataDir();
    const samp = await path.join(dir, "samp");
    const files = await fs.readDir(samp, { recursive: true });

    const list: any[] = [];
    files.forEach((file: any) => collectFiles(file, list));

    const checksums = (await invoke_rpc("get_checksum_of_files", {
      list: list,
    })) as string[];

    const results = await validateFileChecksums(checksums);
    if (results.includes(false)) {
      await fs.removeDir(samp, { recursive: true });
      await fs.createDir(samp);
      downloadResources(samp);
    } else {
      finishLoading(1000);
    }
  };

  const validateResources = async () => {
    const dir = await path.appLocalDataDir();
    const samp = await path.join(dir, "samp");
    if (await fs.exists(samp)) {
      const archive = await path.join(samp, "samp_clients.7z");
      if (await fs.exists(archive)) {
        processFileChecksums();
      } else {
        downloadResources(samp);
      }
    } else {
      fs.createDir(samp);
      downloadResources(samp);
    }
  };

  useEffect(() => {
    validateResources();
  }, []);

  const progressBar = useMemo(() => {
    return (
      <>
        <View
          style={{
            width: "100%",
            height: sc(20),
            borderRadius: 100,
            backgroundColor: theme.serverListItemBackgroundColor,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 0,
            },
            shadowOpacity: 0.85,
            shadowRadius: 1.84,
          }}
        >
          <View
            style={{
              width: `${downloadInfo.percent}%`,
              height: "100%",
              backgroundColor: theme.primary,
            }}
          />
        </View>
        <Text
          semibold
          color={theme.textPrimary}
          style={{
            textAlign: "left",
            width: "100%",
            fontSize: sc(12),
          }}
        >
          {formatBytes(downloadInfo.size, 2)}/
          {formatBytes(downloadInfo.total, 2)}
        </Text>
      </>
    );
  }, [downloadInfo]);

  return (
    <View style={[styles.app, { padding: 4 }]}>
      <View
        style={[
          styles.appView,
          {
            borderRadius: sc(10),
            backgroundColor: theme.secondary,
            paddingTop: sc(40),
            paddingBottom: sc(30),
            paddingHorizontal: sc(30),
            alignItems: "center",
          },
        ]}
      >
        <View style={{ marginBottom: sc(30) }}>
          <div
            className={themeType === "dark" ? "loader-dark" : "loader-light"}
            style={{ width: sc(120), height: sc(120) }}
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
            style={{
              position: "absolute",
              top: 0,
              left: 0,
            }}
          />
        </View>
        <Text semibold size={3} color={theme.textPrimary}>
          Getting ready to launch...
        </Text>
        <View style={{ flex: 1 }} />
        {downloading ? (
          <>
            <Text
              semibold
              color={theme.textPrimary}
              style={{
                textAlign: "left",
                width: "100%",
                fontSize: sc(15),
                marginBottom: sc(2),
              }}
            >
              Downloading resources:
            </Text>
            {progressBar}
          </>
        ) : null}
      </View>
      <div
        data-tauri-drag-region
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          width: "100%",
        }}
      />
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
  },
});

export default LoadingScreen;
