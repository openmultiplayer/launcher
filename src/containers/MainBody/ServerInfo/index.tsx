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
  const { theme } = useTheme();
  const { selected } = useServers();

  const webUrl = useMemo(() => {
    if (selected) {
      if (validateWebUrl(selected.rules.weburl)) {
        return selected.rules.weburl;
      }
    }
    return "";
  }, [selected]);

  return (
    <View style={styles.serverInfoView}>
      <PlayerList players={selected ? selected.players : []} />
      <View
        style={{
          width: "100%",
          height: selected?.omp && selected.omp.banner ? "12%" : sc(35),
          marginVertical: sc(8),
          borderRadius: sc(5),
          overflow: "hidden",
        }}
      >
        {selected?.omp && selected.omp.banner ? (
          <Image
            source={{ uri: selected.omp.banner }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "100%",
              width: "100%",
            }}
          />
        ) : null}
        {webUrl.length ? (
          <Pressable
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
            <Icon svg image={images.icons.link} size={sc(29)} />
            <Text
              semibold
              size={1}
              color={theme.textPrimary}
              style={{ marginLeft: sc(5) }}
            >
              {webUrl}
            </Text>
          </Pressable>
        ) : null}
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
