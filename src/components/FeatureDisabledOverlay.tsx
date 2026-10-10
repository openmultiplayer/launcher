import { View, ViewProps } from "react-native";
import { useTheme } from "../states/theme";
import { sc } from "../utils/sizeScaler";
import Text from "./Text";

interface IProps extends ViewProps {}

const FeatureDisabledOverlay = (props: IProps) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          borderRadius: 5,
          // @ts-ignore
          backdropFilter: "blur(5px)",
          backgroundColor: "rgba(255, 255, 255, 0.2)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: sc(10),
        },
        props.style,
      ]}
    >
      <Text
        semibold
        size={2}
        numberOfLines={2}
        style={{ textAlign: "center" }}
        color={theme.textPrimary}
      >
        These features are currently disabled in in-game mode
      </Text>
    </View>
  );
};

export default FeatureDisabledOverlay;
