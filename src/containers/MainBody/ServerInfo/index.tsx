import { shell } from "@tauri-apps/api";
import { useContext, useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Text from "../../../components/Text";
import { ThemeContext } from "../../../contexts/theme";
import { useServers } from "../../../states/servers";
import { validateWebUrl } from "../../../utils/helpers";
import { sc } from "../../../utils/sizeScaler";
import AdditionalInfo from "./AdditionalInfo";
import PlayerList from "./PlayerList";
import Icon from "../../../components/Icon";
import { images } from "../../../constants/images";

const ServerInfo = () => {
  const { theme } = useContext(ThemeContext);
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
          height: sc(50),
        }}
      >
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
