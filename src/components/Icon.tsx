import {
  ColorValue,
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { convertRgbToFilter } from "../utils/filter";

interface IProps {
  image: string;
  title?: string;
  size: number;
  color?: ColorValue;
  onPress?: () => void;
  style?: StyleProp<ImageStyle>;
  svg?: boolean;
}

const Icon = (props: IProps) => {
  const Icon = props.svg ? (
    <img
      src={props.image}
      height={props.size}
      width={props.size}
      style={{
        // @ts-ignore
        ...(props.style ? props.style : {}),
        ...styles.icon,
        filter: props.color
          ? convertRgbToFilter(props.color as string).filter
          : undefined,
      }}
    />
  ) : (
    <Image
      source={{ uri: props.image }}
      style={[
        styles.icon,
        { tintColor: props.color },
        { height: props.size, width: props.size },
        props.style,
      ]}
    />
  );

  const Titled = props.title ? <div title={props.title}>{Icon}</div> : Icon;

  if (props.onPress) {
    return (
      <TouchableOpacity onPress={props.onPress}>{Titled}</TouchableOpacity>
    );
  } else {
    return Titled;
  }
};

const styles = StyleSheet.create({
  icon: {
    resizeMode: "stretch",
    tintColor: "#FFFFFF",
  },
});

export default Icon;
