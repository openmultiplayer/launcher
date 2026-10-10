import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import * as Animatable from "react-native-animatable";
import Text from "../../components/Text";
import { useNotification } from "../../states/notification";
import { useTheme } from "../../states/theme";
import { Log } from "../../utils/logger";

interface NotificationTimer {
  autoHide: NodeJS.Timeout | null;
  slideDown: NodeJS.Timeout | null;
}

const NOTIFICATION_DISPLAY_TIME = 2000;
const SLIDE_DOWN_DELAY = 1000;

const Notification = memo(() => {
  const { theme } = useTheme();
  const {
    visible,
    title,
    description,
    onPress,
    slideDown,
    deleteNotification,
  } = useNotification();

  const timers = useRef<NotificationTimer>({
    autoHide: null,
    slideDown: null,
  });

  const notificationRef = useRef<Animatable.View>(null);

  // Clear timers helper
  const clearTimers = useCallback(() => {
    if (timers.current.autoHide) {
      clearTimeout(timers.current.autoHide);
      timers.current.autoHide = null;
    }
    if (timers.current.slideDown) {
      clearTimeout(timers.current.slideDown);
      timers.current.slideDown = null;
    }
  }, []);

  // Handle notification auto-hide
  useEffect(() => {
    if (visible && title.length > 0) {
      clearTimers();

      timers.current.autoHide = setTimeout(() => {
        slideDown();
        timers.current.slideDown = setTimeout(() => {
          deleteNotification();
        }, SLIDE_DOWN_DELAY);
      }, NOTIFICATION_DISPLAY_TIME);
    }

    return clearTimers;
  }, [visible, title.length, slideDown, deleteNotification, clearTimers]);

  // Handle manual close
  const handleClose = useCallback(() => {
    clearTimers();
    slideDown();
    setTimeout(() => deleteNotification(), 300);
  }, [slideDown, deleteNotification, clearTimers]);

  // Handle notification press
  const handlePress = useCallback(() => {
    if (onPress) {
      try {
        onPress();
      } catch (error) {
        Log.error("Error in notification press handler:", error);
      }
    }
    handleClose();
  }, [onPress, handleClose]);

  const dynamicStyles = useMemo(
    () => ({
      container: {
        opacity: title.length > 0 ? 1 : 0,
        backgroundColor: theme.primary,
        transform: [
          {
            translateY: visible ? 0 : 100,
          },
        ],
      },
    }),
    [theme.primary, title.length, visible]
  );

  // Don't render if no title
  if (!title.length) {
    return null;
  }

  const Wrapper = onPress ? Pressable : View;
  const WrapperProps = onPress
    ? {
        onPress: handlePress,
        accessible: true,
        accessibilityRole: "button" as const,
        accessibilityLabel: `Notification: ${title}`,
      }
    : {};

  return (
    <Animatable.View
      ref={notificationRef}
      animation={visible ? "slideInUp" : "slideOutDown"}
      duration={400}
      style={[styles.container, dynamicStyles.container]}
    >
      <Wrapper style={styles.content} {...WrapperProps}>
        <View style={styles.titleRow}>
          <Text
            semibold
            size={2}
            color={theme.textPrimary}
            numberOfLines={2}
            style={styles.titleText}
          >
            {title}
          </Text>
          {!onPress && (
            <Pressable
              onPress={handleClose}
              style={styles.closeButton}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Close notification"
            >
              <Text size={1} color={theme.textSecondary}>
                ✕
              </Text>
            </Pressable>
          )}
        </View>
        {description && (
          <Text
            semibold
            numberOfLines={3}
            color={theme.textSecondary}
            style={styles.description}
          >
            {description}
          </Text>
        )}
      </Wrapper>
    </Animatable.View>
  );
});

Notification.displayName = "Notification";

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 10,
    right: 6,
    width: 300,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.89,
    shadowRadius: 6.65,
    borderRadius: 5,
    zIndex: 60,
  },
  content: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  titleText: {
    flex: 1,
    marginRight: 8,
  },
  closeButton: {
    padding: 2,
    minWidth: 16,
    alignItems: "center",
  },
  description: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 16,
  },
});

export default Notification;
