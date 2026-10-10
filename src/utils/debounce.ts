export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timerId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timerId !== null) {
      clearTimeout(timerId);
    }

    timerId = setTimeout(() => {
      timerId = null;
      func(...args);
    }, delay);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let isThrottled = false;

  return (...args: Parameters<T>) => {
    if (isThrottled) return;

    func(...args);
    isThrottled = true;

    setTimeout(() => {
      isThrottled = false;
    }, delay);
  };
};
