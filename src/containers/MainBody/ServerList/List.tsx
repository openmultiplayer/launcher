import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import BigList from "react-native-big-list";
import { useTheme } from "../../../states/theme";
import { sc } from "../../../utils/sizeScaler";
import { Server } from "../../../utils/types";
import ListHeader from "./ListHeader";

interface IProps {
  data: Server[];
  renderItem: (item: Server, index: number) => JSX.Element;
  containerStyle?: StyleProp<ViewStyle>;
}

const List = (props: IProps) => {
  const { themeType } = useTheme();

  return (
    <View style={styles.mainContainer} id="main-conatiner">
      <ListHeader />
      <BigList
        id={themeType === "dark" ? "scroll" : "scroll-light"}
        contentContainerStyle={props.containerStyle}
        data={props.data}
        renderItem={(info) => props.renderItem(info.item, info.index)}
        headerHeight={0}
        itemHeight={sc(39)}
        renderFooter={null}
        renderHeader={null}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
});

export default List;
