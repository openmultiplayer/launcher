import { Clipboard } from "@react-native-clipboard/clipboard/dist/Clipboard.web";
import { t } from "i18next";
import { useContext, useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Icon from "../../components/Icon";
import Text from "../../components/Text";
import { images } from "../../constants/images";
import { ThemeContext } from "../../contexts/theme";
import { usePersistentServers, useServers } from "../../states/servers";
import Chart from "../PingChart";
import { sc } from "../../utils/sizeScaler";

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
  const { theme } = useContext(ThemeContext);

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
  const { theme } = useContext(ThemeContext);

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
        <View style={{ flex: 0.5, top: sc(5) }}>
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
              iconSize={sc(16)}
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
            iconSize={sc(16)}
            text={`${server.playerCount}/${server.maxPlayers}`}
          />
        </View>
        <View style={{ flex: 0.5 }}>
          <View style={{ flexDirection: "row", flex: 1, alignItems: "center" }}>
            <TouchableOpacity
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                paddingVertical: 1,
                paddingHorizontal: 5,
                borderRadius: 5,
                borderWidth: 1,
                backgroundColor: theme.primary,
                borderColor: theme.separatorBorderColor,
                flexDirection: "row",
                alignItems: "center",
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
                image={
                  favorited ? images.icons.unfavorite : images.icons.favorite
                }
                size={12}
              />
              <Text
                semibold
                color={theme.textPrimary}
                style={{ marginLeft: 2, fontSize: 10 }}
              >
                {favorited ? t("remove_from_favorites") : t("add_to_favorites")}
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
    height: sc(100),
  },
});

export default BottomBar;
