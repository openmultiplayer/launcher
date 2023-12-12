import { t } from "i18next";
import { useContext } from "react";
import { FlatList, ListRenderItemInfo, StyleSheet, View } from "react-native";
import Text from "../../../components/Text";
import { ThemeContext } from "../../../contexts/theme";
import { sc } from "../../../utils/sizeScaler";
import { Player } from "../../../utils/types";

interface IProps {
  players: Player[];
}

const PlayerList = (props: IProps) => {
  const { theme } = useContext(ThemeContext);

  const renderPlayer = ({
    item: player,
    index,
  }: ListRenderItemInfo<Player>) => {
    return (
      <View style={[styles.playerContainer]} key={"player-list-item-" + index}>
        <View style={[styles.commonFieldContainer, styles.nameFieldContainer]}>
          <Text style={{ fontSize: sc(17) }} color={theme.textPrimary}>
            {player.name}
          </Text>
        </View>
        <View
          style={[
            styles.commonFieldContainer,
            styles.scoreFieldContainer,
            {
              paddingHorizontal: sc(7),
              backgroundColor: theme.appBackgroundColor + "66",
              borderRadius: sc(5),
            },
          ]}
        >
          <Text style={{ fontSize: sc(15) }} color={theme.textSecondary}>
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
            marginTop: sc(3),
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
          borderRadius: 5,
          height: "50%",
        }}
      >
        <FlatList
          id="scroll"
          data={props.players}
          renderItem={renderPlayer}
          contentContainerStyle={{ paddingHorizontal: 3, paddingBottom: 3 }}
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  playerContainer: {
    height: sc(25),
    marginTop: sc(10),
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
