import { useContext } from "react";
import { StyleSheet, View } from "react-native";
import { ThemeContext } from "../../contexts/theme";
import { useServers } from "../../states/servers";
import Chart from "../PingChart";

const BottomBar = () => {
  const { selected } = useServers();
  const { theme } = useContext(ThemeContext);

  if (!selected) {
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
      <Chart containerStyle={styles.chartContainer} />
    </View>
  );
};

const styles = StyleSheet.create({
  serverProperties: {
    width: "100%",
    height: 80,
    paddingHorizontal: 8,
    alignItems: "flex-end",
    borderTopWidth: 1,
  },
  chartContainer: {
    width: "40%",
    height: 90,
  },
});

export default BottomBar;
