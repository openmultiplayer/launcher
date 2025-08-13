import { memo, useCallback, useMemo } from "react";
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "../states/theme";
import { sc } from "../utils/sizeScaler";
import Icon from "./Icon";
import Text from "./Text";

interface TabItem {
  icon?: string;
  label: string;
  type: string;
}

interface TabBarProps {
  onChange: (type: string) => void;
  list: TabItem[];
  selected: string;
  style?: StyleProp<ViewStyle>;
}

interface TabItemProps {
  item: TabItem;
  isSelected: boolean;
  onPress: (type: string) => void;
  theme: any;
  themeType: string;
}

const TabBarItem = memo<TabItemProps>(
  ({ item, isSelected, onPress, theme, themeType }) => {
    const handlePress = useCallback(() => {
      if (!isSelected) {
        onPress(item.type);
      }
    }, [isSelected, onPress, item.type]);

    const containerStyle = useMemo(
      () => ({
        overflow: "hidden" as const,
        marginRight: sc(10),
        borderRadius: sc(5),
        ...(isSelected && {
          shadowColor: themeType === "dark" ? "#fff" : "#000",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.17,
          shadowRadius: 4.65,
        }),
      }),
      [isSelected, themeType]
    );

    const iconStyle = useMemo(
      () => ({
        marginRight: sc(10),
        opacity: isSelected ? 1 : 0.25,
      }),
      [isSelected]
    );

    const textStyle = useMemo(
      () => [
        isSelected
          ? {
              opacity: 1,
              textShadowColor: "rgba(132, 119, 183, 0.5)",
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 4,
            }
          : {
              opacity: 0.25,
            },
      ],
      [isSelected]
    );

    return (
      <View key={`list-type-${item.type}`} style={containerStyle}>
        <TouchableOpacity
          disabled={isSelected}
          style={[
            styles.listItem,
            { backgroundColor: theme.itemBackgroundColor },
          ]}
          onPress={handlePress}
        >
          {item.icon && (
            <Icon
              svg
              image={item.icon}
              size={sc(20)}
              style={iconStyle}
              color={theme.textPrimary}
            />
          )}
          <Text semibold color={theme.textPrimary} size={3} style={textStyle}>
            {item.label}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
);

TabBarItem.displayName = "TabBarItem";

const TabBar = memo<TabBarProps>(({ onChange, list, selected, style }) => {
  const { theme, themeType } = useTheme();

  return (
    <View style={[styles.listing, style]}>
      {list.map((item) => (
        <TabBarItem
          key={item.type}
          item={item}
          isSelected={selected === item.type}
          onPress={onChange}
          theme={theme}
          themeType={themeType}
        />
      ))}
    </View>
  );
});

TabBar.displayName = "TabBar";

const styles = StyleSheet.create({
  listing: {
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginLeft: -0.5,
  },
  listItem: {
    height: sc(35),
    paddingHorizontal: sc(10),
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    borderRadius: sc(5),
  },
});

export default TabBar;
