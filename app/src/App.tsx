import { Button } from "@/components/ui/button"

export function App() {
  return (
    <div className="flex min-h-svh flex-col gap-4 bg-deep p-6 text-primary-foreground">
      <h1 className="text-xl font-semibold">아산 밥때</h1>
      <p>서울아산병원 직원식당 혼잡도와 메뉴를 한눈에 봐요.</p>
      <Button className="self-start">시작하기</Button>
    </div>
  )
}

export default App
