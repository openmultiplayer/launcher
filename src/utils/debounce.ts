export const debounce = <F extends (...args: any[]) => void>(
  func: F,
  delay: number
): ((...args: Parameters<F>) => void) => {
  let timerId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>) => {
    if (timerId !== null) clearTimeout(timerId);
    timerId = setTimeout(() => func(...args), delay);
  };
};
