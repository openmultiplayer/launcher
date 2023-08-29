import { useContext, useMemo } from "react";
import { StyleSheet, View, StyleProp, ViewStyle } from "react-native";
import BigList from "react-native-big-list";
import { SearchData, Server } from "../../../utils/types";
import ServerItem from "./Item";
import ListHeader from "./ListHeader";
import { ThemeContext } from "../../../contexts/theme";

interface IProps {
  data: Server[];
  style?: StyleProp<ViewStyle>;
  searchData: SearchData;
  selectedServer?: Server;
  onServerSelect?: (server: Server) => void;
}

const ServerList = (props: IProps) => {
  const { theme } = useContext(ThemeContext);

  const serverList = useMemo(() => {
    const { ompOnly, nonEmpty, query } = props.searchData;
    const list = props.data.filter((server) => {
      const ompCheck = ompOnly ? server.usingOmp === true : true;
      const nonEmptyCheck = nonEmpty ? server.playerCount > 0 : true;

      return (
        ompCheck &&
        nonEmptyCheck &&
        server.hostname.toLowerCase().includes(query.toLowerCase())
      );
    });

    return list;
  }, [
    props.searchData.query,
    props.searchData.ompOnly,
    props.searchData.nonEmpty,
    props.data,
  ]);

  return (
    <View
      style={[
        styles.mainContainer,
        { backgroundColor: theme.listBackgroundColor },
      ]}
    >
      <ListHeader />
      <BigList
        id="scroll"
        contentContainerStyle={{ paddingHorizontal: 3 }}
        data={serverList}
        renderItem={(info) => (
          <ServerItem
            isSelected={
              props.selectedServer
                ? props.selectedServer.ip === info.item.ip &&
                  props.selectedServer.port === info.item.port
                : false
            }
            server={info.item}
            index={info.index}
            onSelect={(server) => {
              if (props.onServerSelect) {
                props.onServerSelect(server);
              }
            }}
          />
        )}
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

export default ServerList;
