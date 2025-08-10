import { memo, useCallback, useMemo } from "react";
import {
  ColorValue,
  Pressable,
  StyleSheet,
  View,
  ViewProps,
} from "react-native";
import { useTheme } from "../states/theme";

interface CheckBoxProps extends Omit<ViewProps, "style"> {
  color?: ColorValue;
  onChange?: (value: boolean) => void;
  value?: boolean;
  style?: ViewProps["style"];
}

const CheckBox = memo<CheckBoxProps>(
  ({ color, onChange, value = false, style, ...rest }) => {
    const { theme } = useTheme();

    const handlePress = useCallback(() => {
      onChange?.(!value);
    }, [onChange, value]);

    const borderColor = color || theme.primary;
    const backgroundColor = color || theme.primary;

    const containerStyle = useMemo(
      () => [styles.container, { borderColor }, style],
      [borderColor, style]
    );

    const innerStyle = useMemo(
      () => ({
        ...styles.inner,
        backgroundColor,
      }),
      [backgroundColor]
    );

    const Wrapper = onChange ? Pressable : View;

    return (
      <Wrapper
        style={containerStyle}
        onPress={onChange ? handlePress : undefined}
        {...rest}
      >
        {value && <View style={innerStyle} />}
      </Wrapper>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    height: 17,
    width: 17,
    borderRadius: 3,
    borderWidth: 2,
    padding: 2,
  },
  inner: {
    height: "100%",
    width: "100%",
  },
});

CheckBox.displayName = "CheckBox";

export default CheckBox;
