import { useContext } from "react";
import { StyleSheet, View } from "react-native";
import { ThemeContext } from "../../../contexts/theme";
import { useServers } from "../../../states/servers";
import AdditionalInfo from "./AdditionalInfo";
import PlayerList from "./PlayerList";

const ServerInfo = () => {
  const { theme } = useContext(ThemeContext);
  const { selected } = useServers();

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
