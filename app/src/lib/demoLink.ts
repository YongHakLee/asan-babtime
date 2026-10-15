/** 주소에 ?at=(시연 시각)이 있으면 그대로 붙여 다른 화면으로 간다. */
export function keepAt(path: string, search: string): string {
  const at = new URLSearchParams(search).get("at")
  // 시각의 ':'은 그대로 두어 주소를 읽기 쉽게 한다
  return at
    ? `${path}?at=${encodeURIComponent(at).replace(/%3A/gi, ":")}`
    : path
}
