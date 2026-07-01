export const normalizeSearchTerm = (search: string): string =>
  search.toLowerCase().replace(/\s+/g, "");

export const matchesNormalizedSearch = (
  value: string | undefined | null,
  search: string,
): boolean => {
  const normalizedSearch = normalizeSearchTerm(search);
  if (!normalizedSearch) return true;

  return normalizeSearchTerm(value || "").includes(normalizedSearch);
};
