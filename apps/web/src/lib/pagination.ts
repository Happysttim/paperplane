/** URL의 페이지를 양의 정수로 정규화합니다. */
export function pageNumber(value: string | null) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}
