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

function Text(props: IProps) {
  const size = props.size
    ? props.size === 1
      ? 14
      : props.size === 2
      ? 16
      : props.size === 3
      ? 18
      : 20
    : 12;

  const weight = props.bold
    ? "bold"
    : props.light
    ? "100"
    : props.medium
    ? "300"
    : props.semibold
    ? "500"
    : undefined;

  return (
    <RNText
      numberOfLines={1}
      style={[
        {
          fontSize: size,
          fontWeight: weight,
          color: props.color,
        },
        // @ts-ignore
        props.selectable ? {} : { userSelect: "none" },
      ]}
      {...props}
    >
      {props.children}
    </RNText>
  );
}

export default Text;
