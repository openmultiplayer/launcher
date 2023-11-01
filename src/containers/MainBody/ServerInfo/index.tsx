import { useContext, useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Text from "../../../components/Text";
import { ThemeContext } from "../../../contexts/theme";
import { useServers } from "../../../states/servers";
import { validateWebUrl } from "../../../utils/helpers";
import AdditionalInfo from "./AdditionalInfo";
import PlayerList from "./PlayerList";
import { shell } from "@tauri-apps/api";

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
    <View
      style={[
        styles.serverInfoView,
        {
          backgroundColor: theme.listBackgroundColor,
        },
      ]}
    >
      <PlayerList players={selected ? selected.players : []} />
      <AdditionalInfo server={selected} />
      <View
        style={{
          width: "100%",
          height: 30,
          paddingRight: 8,
          backgroundColor: theme.itemContainerBackgroundColor,
        }}
      >
        <Pressable
          style={{
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            height: "100%",
          }}
          onPress={() =>
            shell.open(webUrl.includes("http") ? webUrl : "https://" + webUrl)
          }
        >
          <Text
            style={{ textDecorationLine: "underline" }}
            semibold
            color={theme.primary}
          >
            {webUrl}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  serverInfoView: {
    flex: 0.285,
    // maxWidth: 350,
    height: "100%",
  },
});

export default ServerInfo;
