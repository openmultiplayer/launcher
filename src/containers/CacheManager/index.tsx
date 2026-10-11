import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  SectionList,
  SectionListData,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import CheckBox from "../../components/CheckBox";
import StaticModal from "../../components/StaticModal";
import Text from "../../components/Text";
import { useCacheManager } from "../../states/cacheManager";
import { useMessageBox } from "../../states/messageModal";
import { useSettings } from "../../states/settings";
import { useTheme } from "../../states/theme";
import {
  CacheDeleteResult,
  CacheEntry,
  formatCacheBytes,
} from "../../utils/cache";
import { sc } from "../../utils/sizeScaler";

type CacheListRow = CacheEntry | CacheDeleteResult["items"][number];

const CacheManager = () => {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const { theme, themeType } = useTheme();
  const state = useCacheManager();
  const { showMessageBox, hideMessageBox } = useMessageBox();
  const busy = state.busy !== "idle";
  const compact = width < sc(650);
  const selectedIds = useMemo(() => new Set(state.selected), [state.selected]);
  const sections = useMemo<SectionListData<CacheListRow>[]>(
    () => [
      { key: "entries", data: state.data?.entries || [] },
      ...(state.report ? [{ key: "report", data: state.report.items }] : []),
    ],
    [state.data, state.report]
  );
  const removedSize = useMemo(
    () =>
      formatCacheBytes(
        String(
          state.report?.items.reduce(
            (sum, item) => sum + BigInt(item.removedResourceBytes),
            0n
          ) || 0n
        )
      ),
    [state.report]
  );
  const columnStyles = {
    endpoint: [styles.endpoint, compact && styles.compactEndpoint],
    count: [styles.count, compact && styles.compactCount],
    size: [styles.size, compact && styles.compactSize],
    action: [styles.action, compact && styles.compactAction],
  };

  const confirm = (ids: string[]) => {
    if (busy || !state.data?.scanId || !ids.length) return;
    const requestedIds = new Set(ids);
    const entries = state.data.entries.filter(
      (entry) => requestedIds.has(entry.id) && entry.canDelete
    );
    if (entries.length !== ids.length) return;
    const request = {
      scanId: state.data.scanId,
      entryIds: [...ids],
      customGameExe: useSettings.getState().customGameExe,
    };
    const bytes = entries.reduce(
      (total, entry) => total + BigInt(entry.sizeBytes),
      0n
    );
    const addresses = Object.fromEntries(
      entries.map((entry) => [entry.id, entry.serverAddress])
    );
    showMessageBox({
      title: t("cache_confirm_title"),
      description: t("cache_confirm_description", {
        count: entries.length,
        size: formatCacheBytes(String(bytes)),
      }),
      boxWidth: Math.min(sc(600), width - sc(40)),
      buttons: [
        { title: t("cancel"), onPress: hideMessageBox },
        {
          title: t("cache_delete"),
          onPress: () => {
            void state.remove(request, addresses);
          },
        },
      ],
    });
  };

  const button = (
    label: string,
    onPress: () => void,
    disabled = busy,
    destructive = false
  ) => (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        {
          opacity: disabled ? 0.4 : 1,
          backgroundColor: destructive ? "#C8302F" : theme.primary,
        },
      ]}
    >
      <Text semibold color="#FFFFFF" size={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (!state.visible) return null;

  return (
    <StaticModal onDismiss={state.close}>
      <View
        style={[
          styles.panel,
          {
            width: Math.min(sc(860), width - sc(40)),
            height: Math.min(sc(620), height - sc(80)),
            left: Math.max(sc(20), (width - sc(860)) / 2),
            top: Math.max(sc(10), (height - sc(620)) / 2 - sc(25)),
            backgroundColor: theme.secondary,
          },
        ]}
      >
        <View style={styles.header}>
          <Text semibold size={4} color={theme.textPrimary}>
            {t("cache_manager_title")}
          </Text>
          {button(t("close"), state.close, state.busy === "deleting")}
        </View>
        {state.data && (
          <Text
            numberOfLines={2}
            color={theme.textPrimary}
            style={styles.summary}
          >
            {t(
              state.data.complete ? "cache_summary" : "cache_summary_partial",
              {
                count: state.data.entries.length,
                files: state.data.totalKnownFileCount,
                size: formatCacheBytes(state.data.totalKnownSizeBytes),
              }
            )}
          </Text>
        )}
        {state.data?.gameState !== "stopped" && state.data && (
          <Text numberOfLines={3} color={theme.primary}>
            {t(
              `cache_error_${state.data.gameState === "running" ? "game_running" : "process_check_failed"}`
            )}
          </Text>
        )}
        {state.error && (
          <Text numberOfLines={3} color="#E75D54">
            {t(`cache_error_${state.error}`)}
          </Text>
        )}
        {busy && (
          <Text color={theme.primary} style={styles.summary}>
            {t(state.busy === "deleting" ? "cache_deleting" : "cache_scanning")}
          </Text>
        )}
        <View style={styles.toolbar}>
          {button(t("cache_rescan"), () => {
            void state.refresh();
          })}
          {button(
            t("cache_select_all"),
            state.selectAll,
            busy || !state.data?.entries.some((entry) => entry.canDelete)
          )}
          {button(
            t("cache_clear_selection"),
            state.clearSelection,
            busy || !state.selected.length
          )}
          {button(
            t("cache_delete_selected", { count: state.selected.length }),
            () => confirm(state.selected),
            busy || !state.selected.length,
            true
          )}
        </View>
        <View
          style={[
            styles.row,
            compact && styles.compactRow,
            { borderColor: theme.textSecondary },
          ]}
        >
          <Text
            semibold
            color={theme.textSecondary}
            style={columnStyles.endpoint}
          >
            {t("cache_item")}
          </Text>
          <Text semibold color={theme.textSecondary} style={columnStyles.count}>
            {t("cache_file_count")}
          </Text>
          <Text semibold color={theme.textSecondary} style={columnStyles.size}>
            {t("cache_resource_size")}
          </Text>
          <Text
            semibold
            color={theme.textSecondary}
            style={columnStyles.action}
          >
            {t("cache_actions")}
          </Text>
        </View>
        <SectionList<CacheListRow>
          key={state.data?.scanId || "empty"}
          id={themeType === "dark" ? "scroll" : "scroll-light"}
          style={styles.list}
          sections={sections}
          extraData={selectedIds}
          keyExtractor={(item) => item.id}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={5}
          stickySectionHeadersEnabled={false}
          renderItem={({ item: entry }) =>
            "serverAddress" in entry ? (
              <View
                key={entry.id}
                style={[
                  styles.row,
                  compact && styles.compactRow,
                  { borderColor: theme.itemBackgroundColor },
                ]}
              >
                <Pressable
                  disabled={busy || !entry.canDelete}
                  onPress={() => state.toggle(entry.id)}
                  style={columnStyles.endpoint}
                >
                  <View style={styles.label}>
                    <CheckBox
                      value={selectedIds.has(entry.id)}
                      style={styles.checkbox}
                    />
                    <Text
                      size={2}
                      numberOfLines={2}
                      style={{ flex: 1 }}
                      color={theme.textPrimary}
                    >
                      {entry.serverAddress}
                    </Text>
                  </View>
                  {entry.issueCode && (
                    <Text numberOfLines={2} color="#E75D54">
                      {t(`cache_error_${entry.issueCode}`)}
                    </Text>
                  )}
                </Pressable>
                <Text color={theme.textPrimary} style={columnStyles.count}>
                  {entry.complete ? entry.fileCount : "?"}
                </Text>
                <Text color={theme.textPrimary} style={columnStyles.size}>
                  {entry.complete
                    ? formatCacheBytes(entry.sizeBytes)
                    : t("cache_unknown_size")}
                </Text>
                <View style={columnStyles.action}>
                  {button(
                    t("cache_delete"),
                    () => confirm([entry.id]),
                    busy || !entry.canDelete,
                    true
                  )}
                </View>
              </View>
            ) : (
              <Text numberOfLines={3} color={theme.textPrimary}>
                {state.reportAddresses[entry.id]} -{" "}
                {t(`cache_status_${entry.status}`)}
                {entry.errorCode
                  ? `: ${t(`cache_error_${entry.errorCode}`)}`
                  : ""}
              </Text>
            )
          }
          renderSectionFooter={({ section }) =>
            section.key === "entries" &&
            !busy &&
            state.data &&
            !state.data.entries.length ? (
              <Text color={theme.textSecondary} style={styles.summary}>
                {t(
                  state.data.rootStatus === "missing"
                    ? "cache_root_missing"
                    : "cache_empty"
                )}
              </Text>
            ) : section.key === "report" && state.report?.stoppedReason ? (
              <Text numberOfLines={3} color="#E75D54">
                {t(`cache_error_${state.report.stoppedReason}`)}
              </Text>
            ) : null
          }
          renderSectionHeader={({ section }) =>
            section.key === "report" ? (
              <View style={styles.report}>
                <Text semibold size={2} color={theme.textPrimary}>
                  {t("cache_result_title")}
                </Text>
                <Text numberOfLines={3} color={theme.textSecondary}>
                  {t("cache_removed_summary", {
                    size: removedSize,
                  })}
                </Text>
              </View>
            ) : null
          }
        />
      </View>
    </StaticModal>
  );
};

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    borderRadius: sc(10),
    padding: sc(18),
    shadowColor: "#000",
    shadowOpacity: 0.8,
    shadowRadius: sc(10),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: sc(10),
  },
  summary: { marginVertical: sc(10) },
  toolbar: { flexDirection: "row", flexWrap: "wrap", marginVertical: sc(10) },
  button: {
    borderRadius: sc(5),
    paddingHorizontal: sc(10),
    paddingVertical: sc(8),
    marginRight: sc(6),
    marginBottom: sc(4),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingVertical: sc(8),
  },
  compactRow: { flexWrap: "wrap" },
  compactEndpoint: {
    flex: 0,
    flexBasis: "100%",
    minWidth: 0,
    marginBottom: sc(6),
  },
  compactCount: { width: "25%" },
  compactSize: { width: "45%" },
  compactAction: { width: "30%" },
  endpoint: { flex: 1, minWidth: sc(155), paddingRight: sc(8) },
  label: { flexDirection: "row", alignItems: "center" },
  checkbox: { marginRight: sc(8) },
  count: { width: sc(100), textAlign: "center" },
  size: { width: sc(140), textAlign: "center" },
  action: { width: sc(95) },
  list: { flex: 1, minHeight: 0 },
  report: { marginTop: sc(15), paddingVertical: sc(12) },
});

export default CacheManager;
