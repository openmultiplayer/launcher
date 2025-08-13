import { memo, useMemo } from "react";
import {
  ColorValue,
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { convertRgbToFilter } from "../utils/filter";

interface IconProps {
  image: string;
  title?: string;
  size: number;
  color?: ColorValue;
  onPress?: () => void;
  style?: StyleProp<ImageStyle>;
  svg?: boolean;
}

const Icon = memo<IconProps>(
  ({ image, title, size, color, onPress, style, svg = false }) => {
    const iconStyle = useMemo(
      () => ({
        height: size,
        width: size,
      }),
      [size]
    );

    const iconComponent = useMemo(() => {
      if (svg) {
        return (
          <img
            src={image}
            height={size}
            width={size}
            alt={title || ""}
            style={{
              ...styles.icon,
              ...(style as any),
              filter: color
                ? convertRgbToFilter(color as string).filter
                : undefined,
            }}
          />
        );
      }

      return (
        <Image
          source={{ uri: image }}
          style={[styles.icon, iconStyle, { tintColor: color }, style]}
        />
      );
    }, [svg, image, size, title, color, style]);

    const wrappedIcon = useMemo(() => {
      if (title) {
        return (
          <div title={title} style={iconStyle}>
            {iconComponent}
          </div>
        );
      }
      return iconComponent;
    }, [title, iconStyle, iconComponent]);

    if (onPress) {
      return (
        <TouchableOpacity onPress={onPress} style={iconStyle}>
          {wrappedIcon}
        </TouchableOpacity>
      );
    }

    return wrappedIcon;
  }
);

Icon.displayName = "Icon";

const styles = StyleSheet.create({
  icon: {
    resizeMode: "stretch",
    tintColor: "#FFFFFF",
  },
});

export default Icon;
