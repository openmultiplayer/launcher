export const normalizeKeyFromEvent = (e: KeyboardEvent): string | null => {
  if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
    return null;
  }

  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");

  let k = e.key;
  if (k === " ") k = "Space";
  else if (k.length === 1) k = k.toUpperCase();
  else if (k.startsWith("Arrow")) k = k.replace("Arrow", "");

  parts.push(k);
  return parts.join("+");
};

export const eventMatchesShortcut = (e: KeyboardEvent, shortcut: string): boolean => {
  if (!shortcut) return false;
  const pressed = normalizeKeyFromEvent(e);
  return pressed ? pressed.toLowerCase() === shortcut.toLowerCase() : false;
};
