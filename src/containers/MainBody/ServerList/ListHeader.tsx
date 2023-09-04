import { useContext } from "react";
import { StyleSheet, View } from "react-native";
import Text from "../../../components/Text";
import Icon from "../../../components/Icon";
import { images } from "../../../constants/images";
import { ThemeContext } from "../../../contexts/theme";

const ListHeader = () => {
  const { theme } = useContext(ThemeContext);
  return (
    <View
      style={[
        styles.serverContainer,
        {
          borderBottomColor: theme.separatorBorderColor,
          backgroundColor: theme.listHeaderBackgroundColor,
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <Icon image={images.icons.locked} size={17} />
      </View>
      <View style={[styles.commonFieldContainer, styles.hostNameContainer]}>
        <Text semibold size={1} color={theme.textPrimary + "AA"}>
          Name
        </Text>
      </View>
      <View
        style={{
          flex: 0.5,
          minWidth: 300,
          flexDirection: "row",
        }}
      >
        <View style={[styles.commonFieldContainer, styles.pingFieldContainer]}>
          <Text semibold size={1} color={theme.textPrimary + "AA"}>
            Ping
          </Text>
        </View>
        <View style={[styles.commonFieldContainer, styles.gameModeContainer]}>
          <Text semibold size={1} color={theme.textPrimary + "AA"}>
            Mode
          </Text>
        </View>
        <View
          style={[styles.commonFieldContainer, styles.playersFieldContainer]}
        >
          <Text semibold size={1} color={theme.textPrimary + "AA"}>
            Players
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  serverContainer: {
    height: 26,
    paddingRight: 8,
    width: "100%",
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  iconContainer: {
    height: 24,
    width: 23,
    marginRight: 1,
    marginLeft: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  commonFieldContainer: {
    justifyContent: "center",
  },
  hostNameContainer: {
    flex: 1,
    paddingHorizontal: 5,
  },
  playersFieldContainer: {
    paddingRight: 5,
    width: 80,
    alignItems: "flex-end",
  },
  pingFieldContainer: {
    width: 50,
    alignItems: "flex-end",
  },
  gameModeContainer: {
    flex: 1,
    maxWidth: 450,
    minWidth: 170,
    paddingLeft: 10,
    alignItems: "flex-start",
  },
});

export default ListHeader;
