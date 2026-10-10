import { memo, useCallback, useMemo, useState } from "react";
import {
  LayoutRectangle,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  ViewProps,
} from "react-native";
import { useTheme } from "../states/theme";
import { sc } from "../utils/sizeScaler";
import Text from "./Text";

interface DropdownListProps extends Omit<ViewProps, "style"> {
  onChange?: (value: string) => void;
  value?: string;
  items: string[];
  style?: ViewProps["style"];
}

const DropdownList = memo<DropdownListProps>(
  ({ onChange, value, items, style, ...rest }) => {
    const { theme, themeType } = useTheme();
    const [layout, setLayout] = useState<LayoutRectangle>();
    const [open, setOpen] = useState(false);

    const toggleOpen = useCallback(() => {
      setOpen((prev) => !prev);
    }, []);

    const handleItemSelect = useCallback(
      (item: string) => {
        onChange?.(item);
        setOpen(false);
      },
      [onChange]
    );

    const handleLayout = useCallback((event: any) => {
      setLayout(event.nativeEvent.layout);
    }, []);

    const containerStyle = useMemo(
      () => [
        styles.container,
        {
          borderBottomLeftRadius: open ? 0 : sc(6),
          borderBottomRightRadius: open ? 0 : sc(6),
        },
        style,
      ],
      [open, style]
    );

    const pressableStyle = useMemo(
      () => [
        styles.pressable,
        {
          borderBottomLeftRadius: open ? 0 : sc(6),
          borderBottomRightRadius: open ? 0 : sc(6),
        },
        style,
      ],
      [open, style]
    );

    const dropdownStyle = useMemo(() => {
      if (!layout) return {};
      return {
        ...styles.dropdown,
        top: layout.y + layout.height,
        width: layout.width,
        height: sc(35) * 5,
      };
    }, [layout]);

    const scrollViewStyle = useMemo(
      () => ({
        width: layout?.width,
        backgroundColor: theme.itemBackgroundColor,
      }),
      [layout, theme.itemBackgroundColor]
    );

    return (
      <View style={containerStyle} onLayout={handleLayout} {...rest}>
        <Pressable style={pressableStyle} onPress={toggleOpen}>
          {value && (
            <Text size={2} color={theme.textPrimary}>
              {value}
            </Text>
          )}
          <Text style={styles.arrow} color={theme.textPrimary}>
            ▼
          </Text>
        </Pressable>
        {open && layout && (
          <View style={dropdownStyle}>
            <ScrollView
              id={themeType === "dark" ? "scroll" : "scroll-light"}
              style={scrollViewStyle}
            >
              {items.map((item, index) => {
                const isLastItem = items.length - 1 === index;
                return (
                  <Pressable
                    key={item}
                    style={[
                      styles.item,
                      {
                        backgroundColor: theme.itemBackgroundColor,
                        borderBottomWidth: isLastItem ? 0 : 1,
                        borderBottomColor: theme.secondary,
                      },
                    ]}
                    onPress={() => handleItemSelect(item)}
                  >
                    <Text size={2} color={theme.textPrimary}>
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    borderTopLeftRadius: sc(6),
    borderTopRightRadius: sc(6),
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    zIndex: 100,
  },
  pressable: {
    borderTopLeftRadius: sc(6),
    borderTopRightRadius: sc(6),
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  arrow: {
    fontSize: sc(14),
    marginLeft: sc(7),
  },
  dropdown: {
    position: "absolute",
    borderBottomLeftRadius: sc(6),
    borderBottomRightRadius: sc(6),
    overflow: "hidden",
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  item: {
    justifyContent: "center",
    alignItems: "center",
    height: sc(40),
  },
});

DropdownList.displayName = "DropdownList";

export default DropdownList;
