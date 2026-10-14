import {
  Clock01Icon,
  MapsLocation01Icon,
  Notification03Icon,
  Restaurant01Icon,
} from "@hugeicons/core-free-icons"

export const NAV_ITEMS = [
  { to: "/", label: "지금", icon: Clock01Icon },
  { to: "/menu", label: "메뉴", icon: Restaurant01Icon },
  { to: "/map", label: "지도", icon: MapsLocation01Icon },
  { to: "/alerts", label: "알림", icon: Notification03Icon },
] as const
