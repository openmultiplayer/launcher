import { Pressable, View, useWindowDimensions } from "react-native";

interface IProps {
  onDismiss: () => void;
  children: React.ReactNode;
}

const StaticModal = (props: IProps) => {
  const { height, width } = useWindowDimensions();

  return (
    <View
      style={{
        position: "absolute",
        height: height,
        width: width,
        top: 0,
        left: 0,
        zIndex: 61,
      }}
    >
      <Pressable
        style={{
          height: "100%",
          width: "100%",
          // @ts-ignore
          cursor: "default",
        }}
        onPress={() => props.onDismiss()}
      />
      {props.children}
    </View>
  );
};

export default StaticModal;
