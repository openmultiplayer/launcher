export const normalizeKeyFromEvent = (e: KeyboardEvent): string | null => {
  // Ignore lone modifier presses
  if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
    return null;
  }

  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");

  let key = e.key;
  if (key === " ") key = "Space";
  else if (key.length === 1) key = key.toUpperCase();
  else if (key.startsWith("Arrow")) key = key.replace("Arrow", "");

  parts.push(key);
  return parts.join("+");
};

export const eventMatchesShortcut = (
  e: KeyboardEvent,
  shortcutStr: string
): boolean => {
  if (!shortcutStr) return false;
  const pressed = normalizeKeyFromEvent(e);
  if (!pressed) return false;
  return pressed.toLowerCase() === shortcutStr.toLowerCase();
};
