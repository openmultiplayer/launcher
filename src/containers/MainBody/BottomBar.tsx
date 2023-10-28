import { Clipboard } from "@react-native-clipboard/clipboard/dist/Clipboard.web";
import { useContext } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Icon from "../../components/Icon";
import Text from "../../components/Text";
import { images } from "../../constants/images";
import { ThemeContext } from "../../contexts/theme";
import { useServers } from "../../states/servers";
import Chart from "../PingChart";

const BottomBar = () => {
  const { selected: server } = useServers();
  const { theme } = useContext(ThemeContext);

  if (!server) {
    return null;
  }

  return (
    <View
      style={[
        styles.serverProperties,
        {
          backgroundColor: theme.itemContainerBackgroundColor,
          borderTopColor: theme.separatorBorderColor,
        },
      ]}
    >
      <View
        style={{ marginVertical: 6, marginLeft: 5, marginRight: 15, flex: 1 }}
      >
        <Text semibold color={theme.primary} size={2} style={{}}>
          {server.hostname}
        </Text>
        <View style={{ flexDirection: "row", flex: 1, alignItems: "center" }}>
          <Text semibold color={theme.primary} size={2}>
            {server.ip}:{server.port}
          </Text>
          <TouchableOpacity
            style={{
              paddingVertical: 1,
              paddingHorizontal: 5,
              borderRadius: 5,
              borderWidth: 1,
              backgroundColor: theme.primary,
              borderColor: theme.separatorBorderColor,
              marginLeft: 6,
            }}
            onPress={() => {
              Clipboard.setString(`${server.ip}:${server.port}`);
            }}
          >
            <Text semibold color={theme.textPrimary} style={{ fontSize: 10 }}>
              Copy
            </Text>
          </TouchableOpacity>
        </View>
        <View
          style={{
            flexDirection: "row",
            flex: 1,
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Icon image={images.icons.users} color={theme.primary} size={20} />
            <Text semibold color={theme.primary} style={{ marginLeft: 7 }}>
              {server.playerCount}/{server.maxPlayers}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Icon
              image={images.icons.game}
              color={theme.primary}
              size={22}
              style={{ opacity: 0.8 }}
            />
            <Text semibold color={theme.primary} style={{ marginLeft: 7 }}>
              {server.gameMode}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Icon
              image={images.icons.language}
              color={theme.primary}
              size={20}
            />
            <Text semibold color={theme.primary} style={{ marginLeft: 7 }}>
              {server.language}
            </Text>
          </View>
        </View>
      </View>
      <Chart containerStyle={styles.chartContainer} />
    </View>
  );
};

const styles = StyleSheet.create({
  serverProperties: {
    width: "100%",
    height: 80,
    paddingHorizontal: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
  },
  chartContainer: {
    width: "40%",
    height: 90,
  },
});

export default BottomBar;
