import { useState } from "react";
import {
  LayoutRectangle,
  Pressable,
  ScrollView,
  View,
  ViewProps,
} from "react-native";
import { useTheme } from "../states/theme";
import { sc } from "../utils/sizeScaler";
import Text from "./Text";

interface IProps extends ViewProps {
  onChange?: (value: string) => void;
  value?: string;
  items: string[];
}

const DropdownList = (props: IProps) => {
  const { theme, themeType } = useTheme();
  const [layout, setLayout] = useState<LayoutRectangle>();
  const [open, setOpen] = useState(false);

  return (
    <View
      style={[
        {
          borderTopLeftRadius: sc(6),
          borderTopRightRadius: sc(6),
          borderBottomLeftRadius: open ? 0 : sc(6),
          borderBottomRightRadius: open ? 0 : sc(6),
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "row",
          zIndex: 100,
        },
        props.style,
      ]}
      onLayout={(e) => setLayout(e.nativeEvent.layout)}
    >
      <Pressable
        style={[
          {
            borderTopLeftRadius: sc(6),
            borderTopRightRadius: sc(6),
            borderBottomLeftRadius: open ? 0 : sc(6),
            borderBottomRightRadius: open ? 0 : sc(6),
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "row",
          },
          props.style,
        ]}
        onPress={() => {
          setOpen(!open);
        }}
      >
        {props.value && (
          <Text size={2} color={theme.textPrimary}>
            {props.value}
          </Text>
        )}
        <Text
          style={{ fontSize: sc(14), marginLeft: sc(7) }}
          color={theme.textPrimary}
        >
          ▼
        </Text>
      </Pressable>
      {open && layout ? (
        <View
          style={{
            position: "absolute",
            top: layout.y + layout.height,
            width: layout.width,
            height: sc(35) * 5,
            borderBottomLeftRadius: !open ? 0 : sc(6),
            borderBottomRightRadius: !open ? 0 : sc(6),
            overflow: "hidden",
            zIndex: 100,
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
          }}
        >
          <ScrollView
            id={themeType === "dark" ? "scroll" : "scroll-light"}
            style={{
              width: layout.width,
              backgroundColor: theme.itemBackgroundColor,
            }}
          >
            {props.items.map((item, index) => {
              return (
                <Pressable
                  style={{
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: theme.itemBackgroundColor,
                    height: sc(40),
                    borderBottomWidth: props.items.length - 1 === index ? 0 : 1,
                    borderBottomColor: theme.secondary,
                  }}
                  onPress={() => {
                    if (props.onChange) {
                      props.onChange(item);
                    }
                    setOpen(false);
                  }}
                >
                  <Text size={2} color={theme.textPrimary}>
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
};

export default DropdownList;
