import { Clipboard } from "@react-native-clipboard/clipboard/dist/Clipboard.web";
import { t } from "i18next";
import { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Icon from "../../components/Icon";
import Text from "../../components/Text";
import { images } from "../../constants/images";
import { usePersistentServers, useServers } from "../../states/servers";
import { useTheme } from "../../states/theme";
import { sc } from "../../utils/sizeScaler";
import Chart from "../PingChart";

const PropInfo = (props: {
  glow?: boolean;
  text: string;
  icon: string;
  iconSize: number;
  iconTitle: string;
  buttonText?: string;
  buttonOnPress?: () => void;
  buttonColor?: string;
}) => {
  const { theme } = useTheme();

  const MaybeGlow = props.glow ? (
    <div
      style={{
        filter: `drop-shadow(0 0 8px ${theme.primary}AA)`,
      }}
    >
      <Icon
        title={props.iconTitle}
        image={props.icon}
        size={props.iconSize}
        // color={theme.textSecondary}
      />
    </div>
  ) : (
    <Icon
      title={props.iconTitle}
      image={props.icon}
      size={props.iconSize}
      color={theme.textSecondary}
    />
  );

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View
        style={{
          height: sc(28),
          width: sc(28),
          borderRadius: sc(5),
          backgroundColor: theme.itemBackgroundColor,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {MaybeGlow}
      </View>
      <Text
        semibold
        color={theme.textPrimary}
        style={{ fontSize: sc(15), marginLeft: sc(8) }}
      >
        {props.text}
      </Text>
      {props.buttonText ? (
        <TouchableOpacity
          style={{
            height: sc(25),
            paddingHorizontal: 5,
            borderRadius: sc(5),
            justifyContent: "center",
            backgroundColor: props.buttonColor,
            marginLeft: 6,
          }}
          onPress={() => props.buttonOnPress && props.buttonOnPress()}
        >
          <Text semibold color={theme.textPrimary} style={{ fontSize: sc(14) }}>
            {props.buttonText}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const BottomBar = () => {
  const { selected: server } = useServers();
  const { favorites, addToFavorites, removeFromFavorites } =
    usePersistentServers();
  const { theme } = useTheme();

  const favorited = useMemo(() => {
    const find = favorites.find(
      (fav) => server && fav.ip === server.ip && fav.port == server.port
    );
    return find !== undefined;
  }, [server, favorites]);

  if (!server) {
    return null;
  }

  return (
    <View style={[styles.serverProperties]}>
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          height: "100%",
        }}
      >
        <View
          style={{ flex: 0.6, top: sc(5), justifyContent: "space-between" }}
        >
          <PropInfo
            iconTitle={server.usingOmp ? t("openmp_server") : ""}
            icon={server.usingOmp ? images.icons.omp : images.icons.internet}
            iconSize={server.usingOmp ? sc(20) : sc(16)}
            text={server.hostname}
            glow={server.usingOmp}
          />
          <View style={{ flexDirection: "row", flex: 1, alignItems: "center" }}>
            <PropInfo
              iconTitle={""}
              icon={images.icons.ip}
              iconSize={sc(14)}
              text={`${server.ip}:${server.port}`}
              buttonText={t("copy")}
              buttonColor={theme.primary}
              buttonOnPress={() =>
                Clipboard.setString(`${server.ip}:${server.port}`)
              }
            />
          </View>
          <PropInfo
            iconTitle={""}
            icon={images.icons.nickname}
            iconSize={sc(15)}
            text={`${server.playerCount}/${server.maxPlayers}`}
          />
        </View>
        <View
          style={{
            flex: 0.4,
            top: sc(5),
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <PropInfo
            iconTitle={""}
            icon={images.icons.mode}
            iconSize={sc(17)}
            text={`${server.gameMode}`}
          />
          <PropInfo
            iconTitle={""}
            icon={images.icons.language}
            iconSize={sc(17)}
            text={`${server.language}`}
          />
          <TouchableOpacity
            style={{
              height: sc(28),
              paddingHorizontal: sc(10),
              borderRadius: sc(5),
              backgroundColor: theme.primary,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={() => {
              if (favorited) {
                removeFromFavorites(server);
              } else {
                addToFavorites(server);
              }
            }}
          >
            <Icon
              svg
              image={favorited ? images.icons.favRemove : images.icons.favAdd}
              size={sc(16)}
              color={"#FF0000"}
            />
            <Text
              semibold
              color={theme.textPrimary}
              style={{ fontSize: sc(15), marginLeft: sc(8) }}
            >
              {favorited ? t("remove_from_favorites") : t("add_to_favorites")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <Chart containerStyle={styles.chartContainer} />
    </View>
  );
};

const styles = StyleSheet.create({
  serverProperties: {
    width: "100%",
    height: sc(95),
    flexDirection: "row",
    justifyContent: "space-between",
  },
  chartContainer: {
    width: "40%",
    height: sc(110),
    marginTop: sc(5),
  },
});

export default BottomBar;
