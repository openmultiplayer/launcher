import {
  ColorValue,
  Image,
  ImageSourcePropType,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ImageStyle,
} from "react-native";

interface IProps {
  image: string | ImageSourcePropType;
  size: number;
  color?: ColorValue;
  onPress?: () => void;
  style?: StyleProp<ImageStyle>;
}

const Icon = (props: IProps) => {
  const image =
    typeof props.image === "string" ? { uri: props.image } : props.image;

  const Icon = (
    <Image
      source={image}
      style={[
        styles.icon,
        { tintColor: props.color },
        { height: props.size, width: props.size },
        props.style,
      ]}
    />
  );

  if (props.onPress) {
    return <TouchableOpacity onPress={props.onPress}>{Icon}</TouchableOpacity>;
  } else {
    return Icon;
  }
};

const styles = StyleSheet.create({
  icon: {
    resizeMode: "stretch",
    tintColor: "white",
  },
});

export default Icon;
