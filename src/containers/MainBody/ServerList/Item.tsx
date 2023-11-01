import { memo, useContext, useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import Icon from "../../../components/Icon";
import Text from "../../../components/Text";
import { images } from "../../../constants/images";
import { ThemeContext } from "../../../contexts/theme";
import { useContextMenu } from "../../../states/contextMenu";
import { useJoinServerPrompt } from "../../../states/joinServerPrompt";
import { Server } from "../../../utils/types";

interface IProps {
  server: Server;
  index: number;
  isSelected?: boolean;
  onSelect?: (server: Server) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
      fadeAnimValue.setValue(0.8);
      isSelectedRef.current = false;
    }
  }, [props.isSelected]);

  const fadeAnimValue = useRef(new Animated.Value(0.8)).current;

  const fadeInAnim = Animated.timing(fadeAnimValue, {
    toValue: 1,
    duration: 100,
    useNativeDriver: false,
  });

  const fadeOutAnim = Animated.timing(fadeAnimValue, {
    toValue: 0.8,
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
    <AnimatedPressable
      key={"server-item-" + index}
      style={[
        styles.pressableContainer,
        {
          opacity: fadeAnimValue,
        },
      ]}
      onHoverIn={() => !props.isSelected && fadeIn()}
      onHoverOut={() => !props.isSelected && fadeOut()}
      onPress={() => onPress()}
      // @ts-ignore
      onContextMenu={(e) => {
        console.log(e);
        e.preventDefault();
        showContextMenu({ x: e.clientX, y: e.clientY }, server);
        return e;
      }}
    >
      <View
        style={[
          styles.serverContainer,
          {
            borderWidth: props.isSelected ? 0 : 0,
            backgroundColor: props.isSelected
              ? theme.selectedItemBackgroundColor
              : theme.responsiveListItemBackgroundColor,
            borderColor: theme.selectedItemBorderColor,
            borderRadius: props.isSelected ? 4 : 0,
            top: props.isSelected ? 0 : 0,
          },
        ]}
      >
        <View
          style={[
            styles.iconContainer,
            server.hasPassword
              ? { backgroundColor: "#DA0000BB" }
              : { backgroundColor: "#24731DBB" },
          ]}
        >
          <Icon
            title={server.hasPassword ? "Locked" : "Unlocked"}
            image={
              server.hasPassword ? images.icons.locked : images.icons.unlocked
            }
            size={17}
          />
        </View>
        {server.usingOmp && (
          <View style={[styles.iconContainer]}>
            <Icon
              title={"open.mp server"}
              image={images.icons.ompLight}
              size={20}
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
              {server.ping}
            </Text>
          </View>
          <View style={[styles.commonFieldContainer, styles.gameModeContainer]}>
            <Text size={1} color={theme.textPrimary}>
              {server.gameMode}
            </Text>
          </View>
          <View
            style={[styles.commonFieldContainer, styles.playersFieldContainer]}
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
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  pressableContainer: {
    // @ts-ignore
    cursor: "default",
  },
  serverContainer: {
    height: 25,
    width: "100%",
    flexDirection: "row",
    marginTop: 2,
  },
  iconContainer: {
    height: 25,
    width: 24,
    marginLeft: 1,
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
    alignItems: "flex-end",
  },
  gameModeContainer: {
    flex: 1,
    maxWidth: 450,
    minWidth: 170,
    paddingLeft: 10,
  },
});

export default ServerItem;
