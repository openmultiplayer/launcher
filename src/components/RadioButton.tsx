import { ColorValue, Pressable, View, ViewProps } from "react-native";
import { useTheme } from "../states/theme";

interface IProps extends ViewProps {
  color?: ColorValue;
  onChange?: (value: boolean) => void;
  value?: boolean;
}

const RadioButton = (props: IProps) => {
  const { theme } = useTheme();
  const Wrapper = props.onChange ? Pressable : View;

  return (
    <Wrapper
      style={[
        {
          height: 17,
          width: 17,
          borderRadius: 17 / 2,
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
            borderRadius: 17 / 2,
            backgroundColor: props.color ? props.color : theme.primary,
          }}
        />
      )}
    </Wrapper>
  );
};

export default RadioButton;
