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
  title?: string;
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
