import { useContext, useMemo } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  ListRenderItemInfo,
  Pressable,
} from "react-native";
import { Server } from "../../../utils/types";
import { ThemeContext } from "../../../contexts/theme";
import Text from "../../../components/Text";
import { shell } from "@tauri-apps/api";

interface IProps {
  server: Server | undefined;
}

type Rule = { name: string; value: string };
type RuleList = Rule[];

const AdditionalInfo = (props: IProps) => {
  const { theme } = useContext(ThemeContext);

  const rules = useMemo(() => {
    if (props.server) {
      return Object.entries(props.server.rules).map((data) => {
        return {
          name: data[0],
          value: data[1],
        };
      });
    } else {
      return [] as RuleList;
    }
  }, [props.server?.rules]);

  const webUrl = useMemo(() => {
    let webUrl = "";
    rules.forEach((rule) => {
      if (rule.name === "weburl") {
        webUrl = rule.value;
      }
    });
    return webUrl;
  }, [rules]);

  const renderRule = ({ item: rule, index }: ListRenderItemInfo<Rule>) => {
    return (
      <View
        style={[
          styles.rulesContainer,
          {
            backgroundColor: theme.itemContainerBackgroundColor,
            marginTop: 2,
          },
        ]}
        key={"rule-list-item-" + index}
      >
        <View style={[styles.commonFieldContainer, styles.ruleFieldContainer]}>
          <Text size={1} color={theme.textPrimary}>
            {rule.name}
          </Text>
        </View>
        <View style={[styles.commonFieldContainer, styles.valueFieldContainer]}>
          <Text size={1} color={theme.textPrimary + "AA"}>
            {rule.value}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.additionalInfoView,
        {
          borderColor: theme.separatorBorderColor,
        },
      ]}
    >
      <View
        style={[
          styles.rulesContainer,
          {
            marginBottom: 0,
            paddingRight: 8,
            borderBottomWidth: 1,
            borderColor: theme.separatorBorderColor,
            backgroundColor: theme.listHeaderBackgroundColor,
          },
        ]}
      >
        <View style={[styles.commonFieldContainer, styles.ruleFieldContainer]}>
          <Text semibold size={1} color={theme.textPrimary + "AA"}>
            Rule
          </Text>
        </View>
        <View style={[styles.commonFieldContainer, styles.valueFieldContainer]}>
          <Text semibold size={1} color={theme.textPrimary + "AA"}>
            Value
          </Text>
        </View>
      </View>
      <FlatList
        id="scroll"
        data={rules}
        renderItem={renderRule}
        contentContainerStyle={{ paddingHorizontal: 3, paddingBottom: 3 }}
      />
      <View
        style={[
          {
            height: 40,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 5,
            backgroundColor: theme.itemContainerBackgroundColor,
          },
          {
            borderColor: theme.separatorBorderColor,
          },
        ]}
      >
        <Pressable onPress={() => shell.open(webUrl)}>
          <Text semibold color={theme.primary} size={1}>
            {webUrl}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  additionalInfoView: {
    width: "100%",
    height: "45%",
    // borderTopWidth: 3,
  },
  rulesContainer: {
    height: 25,
    flexDirection: "row",
  },
  commonFieldContainer: {
    justifyContent: "center",
  },
  ruleFieldContainer: {
    flex: 0.8,
    paddingLeft: 8,
    borderLeftWidth: 0,
    alignItems: "flex-start",
  },
  valueFieldContainer: {
    flex: 1,
    paddingRight: 5,
    alignItems: "flex-start",
  },
});

export default AdditionalInfo;
