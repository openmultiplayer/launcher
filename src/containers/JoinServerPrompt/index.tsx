import { t } from "i18next";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import DropdownList from "../../components/DropdownList";
import FeatureDisabledOverlay from "../../components/FeatureDisabledOverlay";
import Icon from "../../components/Icon";
import StaticModal from "../../components/StaticModal";
import Text from "../../components/Text";
import { IN_GAME } from "../../constants/app";
import { images } from "../../constants/images";
import { useJoinServerPrompt } from "../../states/joinServerPrompt";
import { usePersistentServers, useServers } from "../../states/servers";
import { useSettings } from "../../states/settings";
import { useTheme } from "../../states/theme";
import { startGame } from "../../utils/game";
import {
  getSampVersionFromName,
  getSampVersionName,
  getSampVersions,
} from "../../utils/helpers";
import { sc } from "../../utils/sizeScaler";
import { SAMPDLLVersions } from "../../utils/types";

const JoinServerPrompt = () => {
  const { visible, server, showPrompt } = useJoinServerPrompt();
  const {
    getServerSettings,
    setServerSettings,
    updateInFavoritesList,
    updateInRecentlyJoinedList,
    perServerSettings,
  } = usePersistentServers();
  const { updateServer } = useServers();
  const { height, width } = useWindowDimensions();
  const { theme, themeType } = useTheme();
  const [password, setPassword] = useState("");
  const [perServerVersion, setPerServerVersion] = useState<
    SAMPDLLVersions | undefined
  >();
  const [perServerNickname, setPerServerNickname] = useState("");
  const { nickName, gtasaPath, sampVersion, setSampVersion } = useSettings();

  const settings = useMemo(() => {
    if (server) {
      return getServerSettings(server);
    }
    return undefined;
  }, [server, perServerSettings]);

  useEffect(() => {
    if (settings) {
      if (settings.nickname !== undefined) {
        setPerServerNickname(settings.nickname);
      }

      if (settings.sampVersion !== undefined) {
        setPerServerVersion(settings.sampVersion);
      }
    } else {
      setPerServerNickname("");
      setPerServerVersion(undefined);
    }
  }, [settings]);

  useEffect(() => {
    setPassword(server && server.password ? server.password : "");
  }, [server]);

  const bannerUrl = useMemo(() => {
    if (server && server.omp) {
      if (themeType === "dark") {
        if (server.omp.bannerDark && server.omp.bannerDark.length)
          return server.omp.bannerDark;
      } else {
        if (server.omp.bannerLight && server.omp.bannerLight.length)
          return server.omp.bannerLight;
      }
    }
    return "";
  }, [server]);

  const logoUrl = useMemo(() => {
    if (server && server.omp) {
      if (server.omp.logo && server.omp.logo.length) return server.omp.logo;
    }
    return "";
  }, [server]);

  if (!visible) {
    return null;
  }

  const bigView = bannerUrl.length || logoUrl.length;

  const HEIGHT = (server?.hasPassword ? 316 : 248) + (bigView ? 77 : 7);
  const WIDTH = 320;

  return (
    <StaticModal onDismiss={() => showPrompt(false)}>
      <View
        style={{
          position: "absolute",
          top: height / 2 - HEIGHT / 2 - 25, // titlebar height is 25
          left: width / 2 - WIDTH / 2,
          height: HEIGHT,
          width: WIDTH,
          borderRadius: sc(10),
          backgroundColor: theme.secondary,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 0,
          },
          shadowOpacity: 0.9,
          shadowRadius: 10,
          alignItems: "center",
          paddingVertical: sc(11),
          paddingTop: bigView ? sc(0) : undefined,
        }}
      >
        {bigView ? (
          <View
            style={{
              width: "100%",
              height: 70 + sc(11),
              marginHorizontal: "5%",
              backgroundColor: theme.itemBackgroundColor,
              overflow: "hidden",
              borderTopLeftRadius: sc(10),
              borderTopRightRadius: sc(10),
            }}
          >
            <Image
              source={{ uri: bannerUrl }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                height: "100%",
                width: "100%",
              }}
              resizeMode="cover"
            />
          </View>
        ) : null}

        {logoUrl.length ? (
          <View
            style={{
              marginTop: 7,
              flexDirection: "row",
              justifyContent: "space-between",
              width: "100%",
              paddingRight: sc(20),
              paddingLeft: sc(10),
            }}
          >
            <View
              style={{
                marginTop: -40,
                marginBottom: -10,
                backgroundColor: theme.itemBackgroundColor,
                height: 70,
                width: 70,
                borderRadius: 1000,
                borderWidth: 2,
                borderColor: theme.serverListItemBackgroundColor,
                overflow: "hidden",
              }}
            >
              <Image
                source={{ uri: logoUrl }}
                style={{
                  height: "100%",
                  width: "100%",
                }}
                resizeMode="cover"
              />
            </View>
            <Icon
              svg
              image={
                server?.hasPassword ? images.icons.locked : images.icons.play
              }
              size={sc(30)}
              color={server?.hasPassword ? "#36363F" : theme.primary}
            />
          </View>
        ) : (
          <Icon
            style={{ marginTop: 7 }}
            svg
            image={
              server?.hasPassword ? images.icons.locked : images.icons.play
            }
            size={sc(30)}
            color={server?.hasPassword ? "#36363F" : theme.primary}
          />
        )}

        <View
          style={{
            width: "100%",
            paddingHorizontal: 15,
            marginTop: 10,
          }}
        >
          <Text semibold color={theme.textPrimary} size={2}>
            {t("server")}:{" "}
            <Text medium color={theme.textPrimary} size={2}>
              {server?.hostname}
            </Text>
          </Text>
          <Text semibold color={theme.textPrimary} size={2}>
            {t("address")}:{" "}
            <Text medium color={theme.textPrimary} size={2}>
              {server?.ip}:{server?.port}
            </Text>
          </Text>
          <Text semibold color={theme.textPrimary} size={2}>
            {t("players")}:{" "}
            <Text medium color={theme.textPrimary} size={2}>
              {server?.playerCount}/{server?.maxPlayers}
            </Text>
          </Text>
        </View>
        {server?.hasPassword && (
          <View style={{ marginTop: sc(15), width: 300, alignSelf: "center" }}>
            <Text semibold color={theme.textPrimary} size={2} numberOfLines={2}>
              {t("server_join_prompt_enter_password")}
            </Text>
            <TextInput
              placeholderTextColor={theme.textPlaceholder}
              placeholder={t(
                "server_join_prompt_enter_password_input_placeholder"
              )}
              value={password}
              onChangeText={(text) => setPassword(text)}
              style={{
                fontFamily: "Proxima Nova Regular",
                fontSize: sc(17),
                color: theme.textPrimary,
                paddingHorizontal: sc(10),
                width: 300,
                marginTop: sc(5),
                backgroundColor: theme.textInputBackgroundColor,
                height: sc(38),
                borderRadius: sc(5),
                // @ts-ignore
                outlineStyle: "none",
              }}
            />
          </View>
        )}
        <View>
          <View style={{ marginTop: sc(10) }}>
            <Text semibold color={theme.textPrimary} size={2}>
              {t("nickname")}:
            </Text>
            <TextInput
              placeholderTextColor={theme.textPlaceholder}
              placeholder={t("server_join_prompt_nickname_input_placeholder")}
              value={perServerNickname.length ? perServerNickname : nickName}
              onChangeText={(text) => {
                if (server) {
                  if (settings) {
                    setServerSettings(server, text, settings.sampVersion);
                  } else {
                    setServerSettings(server, text, undefined);
                  }
                }
              }}
              style={{
                fontFamily: "Proxima Nova Regular",
                fontSize: sc(17),
                color: perServerNickname.length
                  ? theme.textPrimary
                  : `${theme.textPrimary}BB`,
                paddingHorizontal: sc(10),
                width: 300,
                marginTop: sc(5),
                fontStyle: perServerNickname.length ? "normal" : "italic",
                backgroundColor: theme.textInputBackgroundColor,
                height: sc(38),
                borderRadius: sc(5),
                // @ts-ignore
                outlineStyle: "none",
              }}
            />
          </View>
          <TouchableOpacity
            style={{
              top: sc(52),
              width: 300,
              height: sc(38),
              backgroundColor: theme.primary,
              borderRadius: sc(5),
              justifyContent: "center",
              alignItems: "center",
            }}
            onPress={() => {
              if (server) {
                if (server.hasPassword && password.length) {
                  const srvCpy = { ...server };
                  srvCpy.password = password;

                  updateServer(srvCpy);
                  updateInFavoritesList(srvCpy);
                  updateInRecentlyJoinedList(srvCpy);
                }

                startGame(
                  server,
                  perServerNickname.length ? perServerNickname : nickName,
                  gtasaPath,
                  server.hasPassword ? password : ""
                );
                showPrompt(false);
              }
            }}
          >
            <Text semibold color={"#FFFFFF"} size={2}>
              {t("connect")}
            </Text>
          </TouchableOpacity>
          <View
            style={{
              top: -sc(28),
              width: 300,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text semibold color={theme.textPrimary} size={2}>
              {t("samp_version")}:
            </Text>
            <DropdownList
              style={{
                marginLeft: sc(10),
                height: sc(30),
                flex: 1,
                backgroundColor: theme.textInputBackgroundColor,
              }}
              value={getSampVersionName(
                perServerVersion ? perServerVersion : sampVersion
              )}
              items={getSampVersions().map((version) =>
                getSampVersionName(version)
              )}
              onChange={async (value) => {
                const version = getSampVersionFromName(value);
                setSampVersion(version);
              }}
            />
          </View>
          {IN_GAME && (
            <FeatureDisabledOverlay
              style={{
                top: sc(5),
                bottom: sc(20),
              }}
            />
          )}
        </View>

        <TouchableOpacity
          style={{
            position: "absolute",
            ...(bigView
              ? {
                  top: sc(5),
                  right: sc(5),
                  height: sc(30),
                  width: sc(30),
                  borderRadius: sc(3),
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: theme.primary,
                }
              : { top: sc(15), right: sc(15), height: sc(20), width: sc(20) }),
            zIndex: 0,
          }}
          onPress={() => showPrompt(false)}
        >
          <Icon
            image={images.icons.close}
            size={bigView ? sc(15) : sc(20)}
            color={bigView ? "white" : theme.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </StaticModal>
  );
};

export default JoinServerPrompt;
