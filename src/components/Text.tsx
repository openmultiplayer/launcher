import React, { memo, useMemo } from "react";
import { ColorValue, Text as RNText, TextProps } from "react-native";
import { sc } from "../utils/sizeScaler";

interface TextComponentProps extends Omit<TextProps, "style"> {
  color?: ColorValue;
  bold?: boolean;
  light?: boolean;
  medium?: boolean;
  semibold?: boolean;
  size?: 1 | 2 | 3 | 4;
  selectable?: boolean;
  children?: React.ReactNode;
  style?: TextProps["style"];
}

const SIZE_MAP = {
  1: sc(14),
  2: sc(16),
  3: sc(18),
  4: sc(20),
} as const;

const FONT_WEIGHTS = {
  bold: "Proxima Nova Semibold",
  semibold: "Proxima Nova Semibold",
  light: "Proxima Nova Regular",
  medium: "Proxima Nova Regular",
  regular: "Proxima Nova Regular",
} as const;

const Text = memo<TextComponentProps>(
  ({
    size,
    bold,
    light,
    medium,
    semibold,
    color,
    selectable = false,
    style,
    children,
    ...rest
  }) => {
    const computedStyle = useMemo(() => {
      const fontSize = size ? SIZE_MAP[size] : sc(12);

      const fontFamily =
        bold || semibold
          ? FONT_WEIGHTS.semibold
          : light
          ? FONT_WEIGHTS.light
          : medium
          ? FONT_WEIGHTS.medium
          : FONT_WEIGHTS.regular;

      return [
        {
          fontSize,
          fontFamily,
          color,
          userSelect: selectable ? "auto" : "none",
        } as const,
        style,
      ];
    }, [size, bold, semibold, light, medium, color, selectable, style]);

    return (
      <RNText numberOfLines={1} style={computedStyle} {...rest}>
        {children}
      </RNText>
    );
  }
);

Text.displayName = "Text";

export default Text;
