import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import BigList from "react-native-big-list";
import { Server } from "../../../utils/types";
import ListHeader from "./ListHeader";

interface IProps {
  data: Server[];
  renderItem: (item: Server, index: number) => JSX.Element;
  containerStyle?: StyleProp<ViewStyle>;
}

const List = (props: IProps) => {
  return (
    <View style={styles.mainContainer}>
      <ListHeader />
      <BigList
        id="scroll"
        contentContainerStyle={[{ paddingHorizontal: 3 }, props.containerStyle]}
        data={props.data}
        renderItem={(info) => props.renderItem(info.item, info.index)}
        headerHeight={0}
        itemHeight={28}
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
