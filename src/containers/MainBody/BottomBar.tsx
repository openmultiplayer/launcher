import { Clipboard } from "@react-native-clipboard/clipboard/dist/Clipboard.web";
import { shell } from "@tauri-apps/api";
import { t } from "i18next";
import { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Icon from "../../components/Icon";
import Text from "../../components/Text";
import { images } from "../../constants/images";
import { usePersistentServers, useServers } from "../../states/servers";
import { useTheme } from "../../states/theme";
import { validateWebUrl } from "../../utils/helpers";
import { sc } from "../../utils/sizeScaler";
import Chart from "../PingChart";

interface PropInfoProps {
  glow?: boolean;
  text: string;
  icon: string;
  iconSize: number;
  iconTitle: string;
  buttonText?: string;
  buttonOnPress?: () => void;
  buttonColor?: string;
}

const PropInfo = ({ glow, text, icon, iconSize, iconTitle, buttonText, buttonOnPress, buttonColor }: PropInfoProps) => {
  const { theme } = useTheme();

  const iconComponent = glow ? (
    <div style={{ filter: `drop-shadow(0 0 8px ${theme.primary}AA)` }}>
      <Icon title={iconTitle} image={icon} size={iconSize} />
    </div>
  ) : (
    <Icon title={iconTitle} image={icon} size={iconSize} color={theme.textSecondary} />
  );

  return (
    <View style={styles.propInfoContainer}>
      <View style={[styles.iconWrapper, { backgroundColor: theme.itemBackgroundColor }]}>
        {iconComponent}
      </View>
      <Text
        semibold
        color={theme.textPrimary}
        style={styles.propInfoText}
      >
        {text}
      </Text>
      {buttonText && (
        <TouchableOpacity
          style={[styles.propButton, { backgroundColor: buttonColor }]}
          onPress={buttonOnPress}
        >
          <Text semibold color="#FFFFFF" style={styles.buttonText}>
            {buttonText}
          </Text>
        </TouchableOpacity>
      )}
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
      <View style={styles.mainContent}>
        <View style={styles.leftColumn}>
          <PropInfo
            iconTitle={server.usingOmp ? t("openmp_server") : ""}
            icon={server.usingOmp ? images.icons.omp : images.icons.internet}
            iconSize={server.usingOmp ? sc(20) : sc(16)}
            text={server.hostname}
            glow={server.usingOmp}
          />
          <View style={styles.playerCountRow}>
            <PropInfo
              iconTitle=""
              icon={images.icons.ip}
              iconSize={sc(14)}
              text={`${server.ip}:${server.port}`}
              buttonText={t("copy")}
              buttonColor={theme.primary}
              buttonOnPress={() => Clipboard.setString(`${server.ip}:${server.port}`)}
            />
          </View>
          <PropInfo
            iconTitle=""
            icon={images.icons.nickname}
            iconSize={sc(15)}
            text={`${server.playerCount}/${server.maxPlayers}`}
          />
        </View>
        <View style={styles.rightColumn}>
          <PropInfo
            iconTitle=""
            icon={images.icons.language}
            iconSize={sc(17)}
            text={server.language}
          />
          {discordInvite.length ? (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#5865F2" }]}
              onPress={() => shell.open(discordInvite)}
            >
              <Icon
                svg
                image={images.icons.discord}
                size={sc(16)}
                color="#FFFFFF"
              />
              <Text
                semibold
                color="#FFFFFF"
                style={styles.actionButtonText}
              >
                {t("join_discord")}
              </Text>
            </TouchableOpacity>
          ) : (
            <PropInfo
              iconTitle=""
              icon={images.icons.mode}
              iconSize={sc(17)}
              text={server.gameMode}
            />
          )}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
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
              color="#FF0000"
            />
            <Text
              semibold
              color="#FFFFFF"
              style={styles.actionButtonText}
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
  propInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  iconWrapper: {
    height: sc(28),
    width: sc(28),
    borderRadius: sc(5),
    justifyContent: "center",
    alignItems: "center",
  },
  propInfoText: {
    fontSize: sc(15),
    marginLeft: sc(8),
  },
  propButton: {
    height: sc(25),
    paddingHorizontal: 5,
    borderRadius: sc(5),
    justifyContent: "center",
    marginLeft: 6,
  },
  buttonText: {
    fontSize: sc(14),
  },
  leftColumn: {
    flex: 0.6,
    top: sc(5),
    justifyContent: "space-between",
  },
  rightColumn: {
    flex: 0.4,
    top: sc(5),
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  mainContent: {
    flex: 1,
    flexDirection: "row",
    height: "100%",
  },
  playerCountRow: {
    flexDirection: "row",
    flex: 1,
    alignItems: "center",
  },
  actionButton: {
    height: sc(28),
    paddingHorizontal: sc(10),
    borderRadius: sc(5),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    fontSize: sc(15),
    marginLeft: sc(8),
  },
});

export default BottomBar;
