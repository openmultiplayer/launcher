import { View, useWindowDimensions } from "react-native";

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
      {/* Blurred, dimmed backdrop — click anywhere outside to dismiss. */}
      <div
        className="modal-blur-backdrop"
        onClick={() => props.onDismiss()}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          cursor: "default",
        }}
      />
      {props.children}
    </View>
  );
};

export default StaticModal;
