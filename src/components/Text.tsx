import { ColorValue, TextProps, Text as RNText } from "react-native";

interface IProps extends TextProps {
  color?: ColorValue;
  bold?: boolean;
  light?: boolean;
  medium?: boolean;
  semibold?: boolean;
  size?: 1 | 2 | 3 | 4;
  selectable?: boolean;
  children?: React.ReactNode | undefined;
}

const Text = (props: IProps) => {
  const size = props.size
    ? props.size === 1
      ? 14
      : props.size === 2
      ? 16
      : props.size === 3
      ? 18
      : 20
    : 12;

  const font = props.bold
    ? "Proxima Nova Semibold"
    : props.light
    ? "Proxima Nova Regular"
    : props.medium
    ? "Proxima Nova Regular"
    : props.semibold
    ? "Proxima Nova Semibold"
    : "Proxima Nova Regular";

  const { style, ...propsWithoutStyle } = props;

  return (
    <RNText
      numberOfLines={1}
      style={[
        {
          fontSize: size,
          fontFamily: font,
          color: props.color,
        },
        // @ts-ignore
        props.selectable ? {} : { userSelect: "none" },
        style,
      ]}
      {...propsWithoutStyle}
    >
      {props.children}
    </RNText>
  );
};

export default Text;
