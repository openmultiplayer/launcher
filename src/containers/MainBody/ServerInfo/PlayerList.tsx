import { t } from "i18next";
import { FlatList, ListRenderItemInfo, StyleSheet, View } from "react-native";
import Text from "../../../components/Text";
import { useTheme } from "../../../states/theme";
import { sc } from "../../../utils/sizeScaler";
import { Player } from "../../../utils/types";

interface IProps {
  players: Player[];
}

const PlayerList = (props: IProps) => {
  const { theme, themeType } = useTheme();

  const renderPlayer = ({
    item: player,
    index,
  }: ListRenderItemInfo<Player>) => {
    return (
      <View
        style={[styles.playerContainer, { marginBottom: sc(10) }]}
        key={"player-list-item-" + index}
      >
        <View style={[styles.commonFieldContainer, styles.nameFieldContainer]}>
          <Text style={{ fontSize: sc(16) }} color={theme.textPrimary}>
            {player.name}
          </Text>
        </View>
        <View
          style={[
            styles.commonFieldContainer,
            styles.scoreFieldContainer,
            {
              paddingHorizontal: sc(7),
              backgroundColor:
                themeType === "dark" ? theme.secondary + "66" : "#E2E6EE",
              borderRadius: sc(5),
            },
          ]}
        >
          <Text style={{ fontSize: sc(14) }} color={theme.textSecondary}>
            {player.score}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <>
      <View
        style={[
          styles.playerContainer,
          {
            marginBottom: sc(9),
            marginTop: sc(5),
            paddingRight: sc(14),
            paddingLeft: sc(10),
          },
        ]}
      >
        <View style={[styles.commonFieldContainer, styles.nameFieldContainer]}>
          <Text
            semibold
            style={{ fontSize: sc(17) }}
            color={theme.textSecondary}
          >
            {t("player")}
          </Text>
        </View>
        <View style={[styles.commonFieldContainer, styles.scoreFieldContainer]}>
          <Text
            semibold
            style={{ fontSize: sc(17) }}
            color={theme.textSecondary}
          >
            {t("score")}
          </Text>
        </View>
      </View>
      <View
        style={{
          backgroundColor: theme.itemBackgroundColor,
          padding: sc(15),
          paddingTop: sc(15),
          borderRadius: 5,
          height: "50%",
        }}
      >
        <FlatList id={themeType === "dark" ? "scroll" : "scroll-light"} data={props.players} renderItem={renderPlayer} />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  playerContainer: {
    height: sc(20),
    flexDirection: "row",
  },
  commonFieldContainer: {
    justifyContent: "center",
  },
  nameFieldContainer: {
    flex: 1,
    alignItems: "flex-start",
  },
  scoreFieldContainer: {
    paddingRight: 5,
    alignItems: "flex-end",
  },
});

export default PlayerList;
