import { useContext, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Chart from "../PingChart";
import CheckBox from "../../components/CheckBox";
import Text from "../../components/Text";
import { ThemeContext } from "../../contexts/theme";
import { useServers } from "../../states/servers";
import { ListType, SearchData } from "../../utils/types";
import ServerInfo from "./ServerInfo";
import SearchBar from "./ServerList/SearchBar";
import Favorites from "./ServerList/Tabs/Favorites";
import Internet from "./ServerList/Tabs/Internet";
import Partners from "./ServerList/Tabs/Partners";
import RecentlyJoined from "./ServerList/Tabs/RecentlyJoined";
import { useRenderState } from "../../states/renderStates";

interface IProps {
  listType: ListType;
}

interface FiltersModalProps {
  ompOnly: boolean;
  nonEmpty: boolean;
  onChange: (ompOnly: boolean, nonEmpty: boolean) => void;
}

const FiltersModal = (props: FiltersModalProps) => {
  const { theme } = useContext(ThemeContext);

  const [ompOnly, setOmpOnly] = useState(props.ompOnly);
  const [nonEmpty, setNonEmpty] = useState(props.nonEmpty);

  useEffect(() => {
    if (props.onChange) {
      props.onChange(ompOnly, nonEmpty);
    }
  }, [ompOnly, nonEmpty]);

  return (
    <View
      style={{
        position: "absolute",
        top: 25,
        left: 6,
        width: 200,
        padding: 5,
        backgroundColor: theme.itemContainerBackgroundColor,
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 3,
        },
        shadowOpacity: 0.29,
        shadowRadius: 4.65,
        borderRadius: 3,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <CheckBox
          value={ompOnly}
          onChange={(value) => setOmpOnly(value)}
          style={{ marginRight: 5 }}
        />
        <Text size={1} color={theme.textPrimary}>
          open.mp servers
        </Text>
      </View>
      <View
        style={{ flexDirection: "row", alignItems: "center", marginTop: 1 }}
      >
        <CheckBox
          value={nonEmpty}
          onChange={(value) => setNonEmpty(value)}
          style={{ marginRight: 5 }}
        />
        <Text size={1} color={theme.textPrimary}>
          Non-empty Servers
        </Text>
      </View>
    </View>
  );
};

const MainView = (props: IProps) => {
  const [searchData, setSearchData] = useState<SearchData>({
    query: "",
    nonEmpty: false,
    ompOnly: false,
  });

  const { selected } = useServers();
  const { theme } = useContext(ThemeContext);
  const { filterMenu } = useRenderState();

  const renderList = () => {
    if (props.listType === "favorites")
      return <Favorites searchData={searchData} />;
    else if (props.listType === "partners")
      return <Partners searchData={searchData} />;
    else if (props.listType === "internet")
      return <Internet searchData={searchData} />;
    else if (props.listType === "recentlyjoined")
      return <RecentlyJoined searchData={searchData} />;
  };

  return (
    <View style={styles.body}>
      <SearchBar
        onChange={(query) => setSearchData({ ...searchData, query })}
      />
      <View style={styles.serverSection}>
        {renderList()}
        <ServerInfo />
      </View>
      {selected && (
        <View
          style={[
            styles.serverProperties,
            {
              backgroundColor: theme.itemContainerBackgroundColor,
              borderTopColor: theme.separatorBorderColor,
            },
          ]}
        >
          <Chart containerStyle={styles.chartContainer} />
        </View>
      )}
      {filterMenu && (
        <FiltersModal
          ompOnly={searchData.ompOnly}
          nonEmpty={searchData.nonEmpty}
          onChange={(ompOnly, nonEmpty) =>
            setSearchData({ ...searchData, ompOnly, nonEmpty })
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  body: {
    flex: 1,
    width: "100%",
  },
  serverSection: {
    flex: 1,
    width: "100%",
    flexDirection: "row",
  },
  serverProperties: {
    width: "100%",
    height: 80,
    paddingTop: 2,
    paddingHorizontal: 8,
    alignItems: "flex-end",
    borderTopWidth: 1,
  },
  chartContainer: {
    width: "40%",
    height: 90,
  },
});

export default MainView;
