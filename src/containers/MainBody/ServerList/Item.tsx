import { t } from "i18next";
import { memo, useContext, useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import Icon from "../../../components/Icon";
import Text from "../../../components/Text";
import { images } from "../../../constants/images";
import { ThemeContext } from "../../../contexts/theme";
import { useContextMenu } from "../../../states/contextMenu";
import { useJoinServerPrompt } from "../../../states/joinServerPrompt";
import { sc } from "../../../utils/sizeScaler";
import { Server } from "../../../utils/types";

interface IProps {
  server: Server;
  index: number;
  isSelected?: boolean;
  onSelect?: (server: Server) => void;
}

const ServerItem = memo((props: IProps) => {
  const { server, index } = props;

  const { theme } = useContext(ThemeContext);
  const isSelectedRef = useRef(!!props.isSelected);
  const lastPressTime = useRef(0);
  const { showPrompt, setServer } = useJoinServerPrompt();
  const { show: showContextMenu } = useContextMenu();

  useEffect(() => {
    if (props.isSelected) {
      fadeAnimValue.setValue(1);
      isSelectedRef.current = true;
    } else {
      fadeAnimValue.setValue(0.5);
      isSelectedRef.current = false;
    }
  }, [props.isSelected]);

  const fadeAnimValue = useRef(new Animated.Value(0.5)).current;

  const fadeInAnim = Animated.timing(fadeAnimValue, {
    toValue: 1,
    duration: 100,
    useNativeDriver: false,
  });

  const fadeOutAnim = Animated.timing(fadeAnimValue, {
    toValue: 0.5,
    duration: 400,
    useNativeDriver: false,
  });

  const fadeOut = () => {
    if (!isSelectedRef.current) fadeOutAnim.start();
  };

  const fadeIn = () => {
    if (!isSelectedRef.current) fadeInAnim.start();
  };

  const onDoublePress = () => {
    setServer(server);
    showPrompt(true);
  };

  const onPress = () => {
    var delta = new Date().getTime() - lastPressTime.current;

    if (delta < 500) {
      lastPressTime.current = 0;
      onDoublePress();
    } else {
      lastPressTime.current = new Date().getTime();
      if (props.onSelect) {
        props.onSelect(server);
      }
    }
  };

  return (
    <Pressable
      key={"server-item-" + index}
      style={styles.pressableContainer}
      onHoverIn={() => !props.isSelected && fadeIn()}
      onHoverOut={() => !props.isSelected && fadeOut()}
      onPress={() => onPress()}
      // @ts-ignore
      onContextMenu={(e) => {
        e.preventDefault();
        showContextMenu({ x: e.clientX, y: e.clientY }, server);
        return e;
      }}
    >
      <View style={styles.serverContainer}>
        <View
          style={[
            styles.iconContainer,
            server.hasPassword
              ? { backgroundColor: theme.itemBackgroundColor }
              : { backgroundColor: "#7AF1AA1A" },
          ]}
        >
          <Icon
            svg
            title={server.hasPassword ? t("locked") : t("unlocked")}
            image={
              server.hasPassword ? images.icons.locked : images.icons.unlocked
            }
            size={sc(20)}
            color={
              !server.hasPassword
                ? "#7AF1AA"
                : theme.serverListItemBackgroundColor
            }
          />
        </View>
        <View
          style={[
            {
              flexDirection: "row",
              alignItems: "center",
              flex: 1,
              borderRadius: sc(5),
              overflow: "hidden",
            },
            {
              borderWidth: props.isSelected ? 1 : 0,
              borderColor: theme.primary,
              backgroundColor: props.isSelected
                ? theme.primary + "7D"
                : "transparent",
            },
          ]}
        >
          {!props.isSelected && (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: theme.serverListItemBackgroundColor,
                  opacity: fadeAnimValue,
                },
              ]}
            />
          )}
          {server.usingOmp && (
            <View style={[styles.iconContainer]}>
              <Icon
                title={t("openmp_server")}
                image={images.icons.ompLight}
                size={sc(20)}
              />
            </View>
          )}
          <View style={[styles.commonFieldContainer, styles.hostNameContainer]}>
            <Text size={1} color={theme.textPrimary}>
              {server.hostname}
            </Text>
          </View>
          <View
            style={{
              flex: 0.5,
              minWidth: 300,
              flexDirection: "row",
              marginLeft: server.usingOmp ? -26 : 0,
            }}
          >
            <View
              style={[styles.commonFieldContainer, styles.pingFieldContainer]}
            >
              <Text size={1} color={theme.textPrimary + "AA"}>
                {server.ping === 9999 ? "-" : server.ping}
              </Text>
            </View>
            <View
              style={[styles.commonFieldContainer, styles.gameModeContainer]}
            >
              <Text size={1} color={theme.textPrimary}>
                {server.gameMode}
              </Text>
            </View>
            <View
              style={[
                styles.commonFieldContainer,
                styles.playersFieldContainer,
              ]}
            >
              <Text size={1} color={theme.textPrimary}>
                {server.playerCount}
                <Text size={1} color={theme.textPrimary + "AA"}>
                  /{server.maxPlayers}
                </Text>
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pressableContainer: {
    // @ts-ignore
    cursor: "default",
    marginTop: sc(7),
  },
  serverContainer: {
    height: sc(32),
    width: "100%",
    flexDirection: "row",
  },
  iconContainer: {
    height: sc(32),
    width: sc(32),
    marginRight: sc(10),
    borderRadius: sc(5),
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
    alignItems: "center",
  },
  gameModeContainer: {
    flex: 1,
    maxWidth: 420,
    minWidth: 170,
    paddingLeft: 10,
    alignItems: "center",
  },
});

export default ServerItem;
