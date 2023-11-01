import { useContext } from "react";
import { View, ViewProps, ColorValue, Pressable } from "react-native";
import { ThemeContext } from "../contexts/theme";

interface IProps extends ViewProps {
  color?: ColorValue;
  onChange?: (value: boolean) => void;
  value?: boolean;
}

const CheckBox = (props: IProps) => {
  const { theme } = useContext(ThemeContext);
  const Wrapper = props.onChange ? Pressable : View;

  return (
    <Wrapper
      style={[
        {
          height: 17,
          width: 17,
          borderRadius: 3,
          borderWidth: 2,
          padding: 2,
        },
        props.style,
        { borderColor: props.color ? props.color : theme.primary },
      ]}
      onPress={() => {
        if (props.onChange) {
          props.onChange(!props.value);
        }
      }}
    >
      {props.value && (
        <View
          style={{
            height: "100%",
            width: "100%",
            backgroundColor: props.color ? props.color : theme.primary,
          }}
        />
      )}
    </Wrapper>
  );
};

export default CheckBox;
