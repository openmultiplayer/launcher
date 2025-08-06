import { t } from "i18next";
import { memo, useRef, useState } from "react";
import { Pressable, StyleSheet, View, PanResponder } from "react-native";
import Icon from "../../../components/Icon";
import Text from "../../../components/Text";
import { images } from "../../../constants/images";
import { useContextMenu } from "../../../states/contextMenu";
import { useJoinServerPrompt } from "../../../states/joinServerPrompt";
import { useTheme } from "../../../states/theme";
import { sc } from "../../../utils/sizeScaler";
import { Server } from "../../../utils/types";

interface IProps {
  server: Server;
  index: number;
  isSelected?: boolean;
  onSelect?: (server: Server) => void;
  isDraggable?: boolean;
  onDragStart?: (server: Server, index: number) => void;
  onDragEnd?: () => void;
  onDragMove?: (index: number, y: number) => void;
  isDraggedOver?: boolean;
  isBeingDragged?: boolean;
}

const ServerItem = memo((props: IProps) => {
  const { server, index, isDraggable = false, isDraggedOver = false, isBeingDragged = false } = props;
  const { theme, themeType } = useTheme();
  const lastPressTime = useRef(0);
  const { showPrompt, setServer } = useJoinServerPrompt();
  const { show: showContextMenu } = useContextMenu();

  const [isDragging, setIsDragging] = useState(false);
  const dragStartTime = useRef(0);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => {
      return isDraggable && (props.isSelected || false);
    },
    onMoveShouldSetPanResponder: (_, gestureState) => {
      const distance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);
      const isVerticalMovement = Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 0.5;
      
      return isDraggable && (props.isSelected || false) && distance > 8 && isVerticalMovement;
    },
    onPanResponderGrant: () => {
      if (isDraggable && props.isSelected && props.onDragStart) {
        setIsDragging(true);
        dragStartTime.current = Date.now();
        props.onDragStart(server, index);
      }
    },
    onPanResponderMove: (evt) => {
      if (isDraggable && isDragging && props.onDragMove) {
        const timeSinceStart = Date.now() - dragStartTime.current;
        if (timeSinceStart > 50) {
          props.onDragMove(index, evt.nativeEvent.pageY);
        }
      }
    },
    onPanResponderRelease: () => {
      if (isDraggable && isDragging) {
        setIsDragging(false);
        if (props.onDragEnd) {
          props.onDragEnd();
        }
      }
    },
    onPanResponderTerminate: () => {
      if (isDraggable && isDragging) {
        setIsDragging(false);
        if (props.onDragEnd) {
          props.onDragEnd();
        }
      }
    },
    onShouldBlockNativeResponder: () => {
      return isDraggable && (props.isSelected || false) && isDragging;
    },
  });

  const onDoublePress = () => {
    setServer(server);
    showPrompt(true);
  };

  const getServerStatusIconColor = () => {
    if (server.hasPassword) {
      return "#eb4034";
    } else if (server.ping < 9999) {
      return "#7AF1AA";
    } else {
      return "#36363F";
    }
  };

  const getServerStatusIconViewBackgroundColor = () => {
    if (server.hasPassword) {
      return "#eb40343A";
    } else if (server.ping < 9999) {
      return "#7AF1AA1A";
    } else {
      return theme.itemBackgroundColor;
    }
  };

  const getServerStatusIconTitle = () => {
    if (server.hasPassword) {
      return t("locked");
    } else if (server.ping < 9999) {
      return t("unlocked");
    } else {
      return t("offline");
    }
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
    <View
      style={[
        styles.pressableContainer,
        {
          opacity: isDragging || isBeingDragged ? 0.7 : 1,
          transform: isDragging ? [{ translateY: -5 }] : [],
          zIndex: isDragging ? 1000 : 1,
        }
      ]}
      {...(isDraggable && props.isSelected ? panResponder.panHandlers : {})}
    >
      {/* Drop indicator */}
      {isDraggedOver && (
        <View
          style={{
            height: 2,
            backgroundColor: theme.primary,
            width: '100%',
            marginBottom: 2,
          }}
        />
      )}

      <Pressable
        key={"server-item-" + index}
        style={[
          styles.pressableContainer,
          {
            // @ts-ignore
            cursor: isDraggable && props.isSelected ? (isDragging ? 'grabbing' : 'grab') : 'default',
          }
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
                backgroundColor: getServerStatusIconViewBackgroundColor(),
              },
            ]}
          >
            <Icon
              svg
              title={getServerStatusIconTitle()}
              image={
                server.hasPassword ? images.icons.locked : images.icons.unlocked
              }
              size={sc(20)}
              color={getServerStatusIconColor()}
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
                // borderWidth: props.isSelected ? 1 : 0,
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
                <View style={[styles.iconContainer, { marginHorizontal: sc(3) }]}>
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
                style={[styles.commonFieldContainer, styles.pingFieldContainer]}
              >
                <Text style={{ fontSize: sc(17) }} color={theme.textSecondary}>
                  {server.ping === 9999 ? "-" : server.ping}
                </Text>
              </View>
              <View
                style={[styles.commonFieldContainer, styles.gameModeContainer]}
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
