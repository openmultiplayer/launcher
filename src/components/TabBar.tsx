import { useContext } from "react";
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { ThemeContext } from "../contexts/theme";
import { sc } from "../utils/sizeScaler";
import Icon from "./Icon";
import Text from "./Text";

interface IProps {
  onChange: (type: string) => void;
  list: {
    icon?: string;
    label: string;
    type: string;
  }[];
  selected: string;
  style?: StyleProp<ViewStyle>;
}

const TabBar = (props: IProps) => {
  const { theme } = useContext(ThemeContext);

  return (
    <View style={[styles.listing, props.style]}>
      {props.list.map((item) => {
        const selected = props.selected === item.type;
        return (
          <View
            key={"list-type-" + item.type}
            style={{
              overflow: "hidden",
              marginRight: sc(10),
              borderRadius: sc(5),
              ...(selected
                ? {
                    shadowColor: "#fff",
                    shadowOffset: {
                      width: 0,
                      height: 0,
                    },
                    shadowOpacity: 0.17,
                    shadowRadius: 4.65,
                  }
                : {}),
            }}
          >
            <TouchableOpacity
              disabled={selected}
              style={[
                styles.listItem,
                { backgroundColor: theme.itemBackgroundColor },
              ]}
              onPress={() => {
                if (props.selected !== item.type) {
                  props.onChange(item.type);
                }
              }}
            >
              {item.icon && (
                <Icon
                  svg
                  image={item.icon}
                  size={sc(20)}
                  style={{ marginRight: sc(10), opacity: selected ? 1 : 0.25 }}
                  color={theme.textPrimary}
                />
              )}
              <Text
                semibold
                color={theme.textPrimary}
                size={3}
                style={[
                  selected
                    ? {
                        opacity: 1,
                        textShadowColor: "rgba(132, 119, 183, 0.5)",
                        textShadowOffset: { width: 0, height: 0 },
                        textShadowRadius: 4,
                      }
                    : {
                        opacity: 0.25,
                      },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
};

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
