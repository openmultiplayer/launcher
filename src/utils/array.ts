// Optimized array utilities with type safety and performance improvements

export const chunk = <T>(array: T[], size: number): T[][] => {
  if (size <= 0) return [];

  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const unique = <T>(
  array: T[],
  keyFn?: (item: T) => string | number
): T[] => {
  if (!keyFn) {
    return [...new Set(array)];
  }

  const seen = new Set<string | number>();
  return array.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export const groupBy = <T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> => {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    (groups[key] ??= []).push(item);
    return groups;
  }, {} as Record<K, T[]>);
};

export const sortBy = <T>(
  array: T[],
  keyFn: (item: T) => string | number,
  direction: "asc" | "desc" = "asc"
): T[] => {
  const multiplier = direction === "asc" ? 1 : -1;

  return [...array].sort((a, b) => {
    const aValue = keyFn(a);
    const bValue = keyFn(b);

    if (aValue < bValue) return -1 * multiplier;
    if (aValue > bValue) return 1 * multiplier;
    return 0;
  });
};

export const binarySearch = <T>(
  array: T[],
  target: T,
  compareFn: (a: T, b: T) => number
): number => {
  let left = 0;
  let right = array.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const comparison = compareFn(array[mid], target);

    if (comparison === 0) {
      return mid;
    } else if (comparison < 0) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return -1;
};

export const moveArrayItem = <T>(
  array: T[],
  fromIndex: number,
  toIndex: number
): T[] => {
  if (
    fromIndex < 0 ||
    fromIndex >= array.length ||
    toIndex < 0 ||
    toIndex >= array.length
  ) {
    return [...array];
  }

  const newArray = [...array];
  const [item] = newArray.splice(fromIndex, 1);
  newArray.splice(toIndex, 0, item);
  return newArray;
};

export const partition = <T>(
  array: T[],
  predicate: (item: T) => boolean
): [T[], T[]] => {
  const truthy: T[] = [];
  const falsy: T[] = [];

  for (const item of array) {
    (predicate(item) ? truthy : falsy).push(item);
  }

  return [truthy, falsy];
};
