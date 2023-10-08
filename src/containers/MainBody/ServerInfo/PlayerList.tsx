import { useContext } from "react";
import { StyleSheet, View, FlatList, ListRenderItemInfo } from "react-native";
import { Player } from "../../../utils/types";
import Text from "../../../components/Text";
import { ThemeContext } from "../../../contexts/theme";

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
      <View
        style={[
          styles.playerContainer,
          {
            backgroundColor: theme.itemContainerBackgroundColor,
            marginTop: 2,
          },
        ]}
        key={"player-list-item-" + index}
      >
        <View style={[styles.commonFieldContainer, styles.nameFieldContainer]}>
          <Text size={1} color={theme.textPrimary}>
            {player.name}
          </Text>
        </View>
        <View style={[styles.commonFieldContainer, styles.scoreFieldContainer]}>
          <Text size={1} color={theme.textPrimary + "AA"}>
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
            marginBottom: 0,
            paddingRight: 8,
            borderBottomWidth: 1,
            borderColor: theme.separatorBorderColor,
            backgroundColor: theme.listHeaderBackgroundColor,
          },
        ]}
      >
        <View style={[styles.commonFieldContainer, styles.nameFieldContainer]}>
          <Text semibold size={1} color={theme.textPrimary + "AA"}>
            Player
          </Text>
        </View>
        <View style={[styles.commonFieldContainer, styles.scoreFieldContainer]}>
          <Text semibold size={1} color={theme.textPrimary + "AA"}>
            Score
          </Text>
        </View>
      </View>
      <FlatList
        id="scroll"
        data={props.players}
        renderItem={renderPlayer}
        contentContainerStyle={{ paddingHorizontal: 3, paddingBottom: 3 }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  playerContainer: {
    height: 26,
    flexDirection: "row",
  },
  commonFieldContainer: {
    justifyContent: "center",
  },
  nameFieldContainer: {
    flex: 1,
    paddingLeft: 8,
    alignItems: "flex-start",
  },
  scoreFieldContainer: {
    paddingRight: 5,
    alignItems: "flex-end",
  },
});

export default PlayerList;
