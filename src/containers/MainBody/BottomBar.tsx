import Chart from "../PingChart";
import Icon from "../../components/Icon";
import Text from "../../components/Text";
import { Clipboard } from "@react-native-clipboard/clipboard/dist/Clipboard.web";
import { shell } from "@tauri-apps/api";
import { t } from "i18next";
import { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { images } from "../../constants/images";
import { usePersistentServers, useServers } from "../../states/servers";
import { useTheme } from "../../states/theme";
import { validateWebUrl } from "../../utils/helpers";
import { sc } from "../../utils/sizeScaler";

const PropInfo = (props: {
  glow?: boolean;
  text: string;
  icon: string;
  iconSize: number;
  iconColor?: string;
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
        color={props.iconColor || theme.textSecondary}
      />
    </div>
  ) : (
    <Icon
      title={props.iconTitle}
      image={props.icon}
      size={props.iconSize}
      color={props.iconColor || theme.textSecondary}
    />
  );

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
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
          <Text semibold color={"#FFFFFF"} style={{ fontSize: sc(14) }}>
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

  const discordInvite = useMemo(() => {
    if (server && server.omp && server.omp.discordInvite) {
      if (validateWebUrl(server.omp.discordInvite)) {
        return server.omp.discordInvite;
      }
    }
    return "";
  }, [server]);

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
            iconTitle={
              server.usingOmp ? t("openmp_server") : "Server not using openmp"
            }
            icon={
              server.usingOmp ? images.icons.badgeCheck : images.icons.internet
            }
            iconSize={server.usingOmp ? sc(20) : sc(16)}
            iconColor={server.usingOmp ? theme.primary : theme.textPlaceholder}
            text={server.hostname}
            glow={server.usingOmp}
          />
          <View style={{ flexDirection: "row", flex: 1, alignItems: "center" }}>
            <PropInfo
              iconTitle={"Server IP"}
              icon={images.icons.ip}
              iconColor={theme.textPlaceholder}
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
            icon={images.icons.language}
            iconSize={sc(17)}
            text={`${server.language}`}
          />
          {discordInvite.length ? (
            <TouchableOpacity
              style={{
                height: sc(28),
                paddingHorizontal: sc(10),
                borderRadius: sc(5),
                backgroundColor: "#5865F2",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={() => {
                shell.open(discordInvite);
              }}
            >
              <Icon
                svg
                image={images.icons.discord}
                size={sc(16)}
                color={"#FFFFFF"}
              />
              <Text
                semibold
                color={"#FFFFFF"}
                style={{ fontSize: sc(15), marginLeft: sc(8) }}
              >
                {t("join_discord")}
              </Text>
            </TouchableOpacity>
          ) : (
            <PropInfo
              iconTitle={"Game Mode"}
              icon={images.icons.mode}
              iconSize={sc(17)}
              text={`${server.gameMode}`}
            />
          )}
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
              color={"#FFFFFF"}
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
