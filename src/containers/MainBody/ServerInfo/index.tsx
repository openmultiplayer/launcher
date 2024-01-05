import { shell } from "@tauri-apps/api";
import { useMemo } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import Icon from "../../../components/Icon";
import Text from "../../../components/Text";
import { images } from "../../../constants/images";
import { useServers } from "../../../states/servers";
import { useTheme } from "../../../states/theme";
import { validateWebUrl } from "../../../utils/helpers";
import { sc } from "../../../utils/sizeScaler";
import AdditionalInfo from "./AdditionalInfo";
import PlayerList from "./PlayerList";

const ServerInfo = () => {
  const { theme, themeType } = useTheme();
  const { selected } = useServers();

  const webUrl = useMemo(() => {
    if (selected) {
      if (validateWebUrl(selected.rules.weburl)) {
        return selected.rules.weburl;
      }
    }
    return "";
  }, [selected]);

  const bannerUrl = useMemo(() => {
    if (selected) {
      if (selected.omp) {
        const dark = selected.omp.bannerDark;
        const light = selected.omp.bannerLight;
        if (themeType === "dark") {
          if (dark) {
            return dark;
          } else {
            if (light) {
              return light;
            } else {
              return "";
            }
          }
        } else {
          if (light) {
            return light;
          } else {
            if (dark) {
              return dark;
            } else {
              return "";
            }
          }
        }
      }
    }
    return "";
  }, [selected?.omp, themeType]);

  return (
    <View style={styles.serverInfoView}>
      <PlayerList players={selected ? selected.players : []} />
      <View
        style={{
          width: "100%",
          height: bannerUrl.length ? "11.5%" : sc(35),
          marginTop: sc(8),
          marginBottom: sc(2),
          borderRadius: sc(5),
          overflow: "hidden",
        }}
      >
        <div
          title={webUrl}
          style={{
            width: "100%",
            height: "100%",
          }}
        >
          <Pressable
            disabled={webUrl.length < 1}
            style={{
              alignItems: "center",
              width: "100%",
              height: "100%",
              flexDirection: "row",
              paddingLeft: sc(12),
            }}
            onPress={() =>
              shell.open(webUrl.includes("http") ? webUrl : "https://" + webUrl)
            }
          >
            {bannerUrl.length ? (
              <Image
                source={{ uri: bannerUrl }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  height: "100%",
                  width: "100%",
                }}
                resizeMode="cover"
              />
            ) : (
              <>
                {webUrl.length ? (
                  <>
                    <Icon svg image={images.icons.link} size={sc(29)} />
                    <Text
                      semibold
                      size={1}
                      color={theme.textPrimary}
                      style={{ marginLeft: sc(5) }}
                    >
                      {webUrl}
                    </Text>
                  </>
                ) : null}
              </>
            )}
          </Pressable>
        </div>
      </View>
      <AdditionalInfo server={selected} />
    </View>
  );
};

const styles = StyleSheet.create({
  serverInfoView: {
    flex: 0.3,
    height: "100%",
    marginLeft: sc(15),
  },
});

export default ServerInfo;
