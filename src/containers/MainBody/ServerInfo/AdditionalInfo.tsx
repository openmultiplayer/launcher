import { t } from "i18next";
import { useContext, useMemo } from "react";
import { FlatList, ListRenderItemInfo, StyleSheet, View } from "react-native";
import Text from "../../../components/Text";
import { ThemeContext } from "../../../contexts/theme";
import { sc } from "../../../utils/sizeScaler";
import { Server } from "../../../utils/types";

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

  const renderRule = ({ item: rule, index }: ListRenderItemInfo<Rule>) => {
    return (
      <View
        style={[styles.rulesContainer, { marginBottom: sc(5) }]}
        key={"rule-list-item-" + index}
      >
        <View style={[styles.commonFieldContainer, styles.ruleFieldContainer]}>
          <Text style={{ fontSize: sc(16) }} color={theme.textPrimary}>
            {rule.name}
          </Text>
        </View>
        <View
          style={[
            styles.commonFieldContainer,
            styles.valueFieldContainer,
            {
              height: sc(26),
              paddingHorizontal: sc(7),
              backgroundColor: theme.appBackgroundColor + "66",
              borderRadius: sc(5),
            },
          ]}
        >
          <Text style={{ fontSize: sc(14) }} color={theme.textSecondary}>
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
            marginBottom: sc(5),
            marginTop: sc(0),
            paddingRight: sc(14),
            paddingLeft: sc(10),
          },
        ]}
      >
        <View style={[styles.commonFieldContainer, styles.ruleFieldContainer]}>
          <Text
            semibold
            style={{ fontSize: sc(17) }}
            color={theme.textSecondary}
          >
            {t("rule")}
          </Text>
        </View>
        <View style={[styles.commonFieldContainer, styles.valueFieldContainer]}>
          <Text
            semibold
            style={{ fontSize: sc(17) }}
            color={theme.textSecondary}
          >
            {t("value")}
          </Text>
        </View>
      </View>
      <View
        style={{
          backgroundColor: theme.itemBackgroundColor,
          padding: sc(15),
          paddingTop: sc(15),
          borderRadius: 5,
          flex: 1,
        }}
      >
        <FlatList id="scroll" data={rules} renderItem={renderRule} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  additionalInfoView: {
    width: "100%",
    flex: 1,
    paddingBottom: sc(10),
  },
  rulesContainer: {
    height: sc(26),
    flexDirection: "row",
  },
  commonFieldContainer: {
    justifyContent: "center",
    height: sc(26),
  },
  ruleFieldContainer: {
    flex: 1,
    alignItems: "flex-start",
  },
  valueFieldContainer: {
    paddingRight: 5,
    alignItems: "flex-end",
  },
});

export default AdditionalInfo;
