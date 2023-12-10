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
              height: 34,
              top: 2,
            }}
          >
            <TouchableOpacity
              disabled={selected}
              style={[
                styles.listItem,
                selected
                  ? {
                      shadowColor: theme.primary,
                      shadowOffset: {
                        width: 0,
                        height: 0,
                      },
                      shadowOpacity: 0.45,
                      shadowRadius: 5.84,
                    }
                  : {},
              ]}
              onPress={() => {
                if (props.selected !== item.type) {
                  props.onChange(item.type);
                }
              }}
            >
              {item.icon && (
                <Icon
                  image={item.icon}
                  size={sc(20)}
                  style={{ marginRight: 5, opacity: selected ? 1 : 0.25 }}
                />
              )}
              <Text
                semibold={selected}
                size={1}
                color={selected ? theme.textSelected : theme.textPrimary}
                style={
                  selected
                    ? {
                        textShadowColor: "rgba(132, 119, 183, 0.5)",
                        textShadowOffset: { width: 0, height: 0 },
                        textShadowRadius: 4,
                      }
                    : {}
                }
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
    height: 30,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
});

export default TabBar;
