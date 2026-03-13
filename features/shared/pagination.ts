export function buildVisiblePages(
  currentPage: number,
  totalPages: number,
  maxVisible = 5,
): number[] {
  const pages: number[] = [];

  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, start + maxVisible - 1);

  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  return pages;
}

