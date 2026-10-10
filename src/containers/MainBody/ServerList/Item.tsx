import { t } from "i18next";
import { memo, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Icon from "../../../components/Icon";
import Text from "../../../components/Text";
import { images } from "../../../constants/images";
import { useDraggableItem } from "../../../hooks/draggable";
import { useContextMenu } from "../../../states/contextMenu";
import { useJoinServerPrompt } from "../../../states/joinServerPrompt";
import { useTheme } from "../../../states/theme";
import { PING_TIMEOUT_VALUE } from "../../../utils/query";
import { sc } from "../../../utils/sizeScaler";
import { Server } from "../../../utils/types";

interface IProps {
  server: Server;
  index: number;
  isSelected?: boolean;
  onSelect?: (server: Server) => void;
  isDraggable?: boolean;
  isBeingDragged?: boolean;
}

const ServerItem = memo((props: IProps) => {
  const { server, index, isDraggable = false, isBeingDragged = false } = props;
  const { theme, themeType } = useTheme();
  const lastPressTime = useRef(0);
  const { showPrompt, setServer } = useJoinServerPrompt();
  const { show: showContextMenu } = useContextMenu();

  const { attributes, listeners, setNodeRef, isDragging, style } =
    useDraggableItem(`${server.ip}:${server.port}`, isDraggable);

  const onDoublePress = () => {
    setServer(server);
    showPrompt(true);
  };

  const onPress = () => {
    if (isDragging) return;

    const delta = Date.now() - lastPressTime.current;

    if (delta < 500) {
      lastPressTime.current = 0;
      onDoublePress();
    } else {
      lastPressTime.current = Date.now();
      props.onSelect?.(server);
    }
  };

  const getServerStatusInfo = (
    hasPassword: boolean,
    ping: number,
    itemBackgroundColor: string
  ) => {
    if (hasPassword) {
      return {
        color: "#eb4034",
        backgroundColor: "#eb40343A",
        title: t("locked"),
        icon: images.icons.locked,
      };
    } else if (ping < PING_TIMEOUT_VALUE) {
      return {
        color: "#7AF1AA",
        backgroundColor: "#7AF1AA1A",
        title: t("unlocked"),
        icon: images.icons.unlocked,
      };
    } else {
      return {
        color: "#36363F",
        backgroundColor: itemBackgroundColor,
        title: t("offline"),
        icon: images.icons.unlocked,
      };
    }
  };

  const statusInfo = getServerStatusInfo(
    server.hasPassword,
    server.ping,
    theme.itemBackgroundColor
  );

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        opacity: isDragging || isBeingDragged ? 0.7 : 1,
        zIndex: isDragging ? 1000 : 1,
      }}
      {...(isDraggable ? listeners : {})}
      {...(isDraggable ? attributes : {})}
    >
      <View
        style={[
          styles.pressableContainer,
          {
            marginTop: 0,
          },
        ]}
      >
        <Pressable
          key={"server-item-" + index}
          style={[
            styles.pressableContainer,
            {
              // @ts-ignore
              cursor: isDragging ? "grabbing" : "default",
            },
          ]}
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
                {
                  backgroundColor: statusInfo.backgroundColor,
                  // @ts-ignore
                  userSelect: "none",
                },
              ]}
            >
              <Icon
                svg
                title={statusInfo.title}
                image={statusInfo.icon}
                size={sc(20)}
                color={statusInfo.color}
              />
            </View>
            <View
              id={
                !props.isSelected
                  ? themeType === "dark"
                    ? "server-list-item-dark"
                    : "server-list-item-light"
                  : undefined
              }
              style={[
                {
                  flexDirection: "row",
                  alignItems: "center",
                  flex: 1,
                  borderRadius: sc(5),
                },
                {
                  borderColor: theme.primary,
                  backgroundColor: props.isSelected
                    ? theme.primary + "7D"
                    : undefined,
                },
              ]}
            >
              {server.usingOmp && (
                <div
                  style={{
                    filter: `drop-shadow(0 0 8px ${theme.primary}CC)`,
                  }}
                >
                  <View
                    style={[styles.iconContainer, { marginHorizontal: sc(3) }]}
                  >
                    <Icon
                      title={t("openmp_server")}
                      image={images.icons.omp}
                      size={sc(23)}
                    />
                  </View>
                </div>
              )}
              <View
                style={[
                  styles.commonFieldContainer,
                  styles.hostNameContainer,
                  { paddingLeft: server.usingOmp ? 0 : sc(10) },
                ]}
              >
                <Text style={{ fontSize: sc(17) }} color={theme.textPrimary}>
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
                  style={[
                    styles.commonFieldContainer,
                    styles.pingFieldContainer,
                  ]}
                >
                  <Text
                    style={{ fontSize: sc(17) }}
                    color={theme.textSecondary}
                  >
                    {server.ping === PING_TIMEOUT_VALUE ? "-" : server.ping}
                  </Text>
                </View>
                <View
                  style={[
                    styles.commonFieldContainer,
                    styles.gameModeContainer,
                  ]}
                >
                  <Text style={{ fontSize: sc(17) }} color={theme.textPrimary}>
                    {server.gameMode}
                  </Text>
                </View>
                <View
                  style={[
                    styles.commonFieldContainer,
                    styles.playersFieldContainer,
                  ]}
                >
                  <Text style={{ fontSize: sc(17) }} color={theme.textPrimary}>
                    {server.playerCount}
                    <Text
                      style={{ fontSize: sc(17) }}
                      color={theme.textPrimary + "AA"}
                    >
                      /{server.maxPlayers}
                    </Text>
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Pressable>
      </View>
    </div>
  );
});

const styles = StyleSheet.create({
  pressableContainer: {
    marginTop: sc(7),
  },
  serverContainer: {
    height: sc(32),
    width: "100%",
    flexDirection: "row",
    paddingRight: sc(5),
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
    paddingRight: sc(10),
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
