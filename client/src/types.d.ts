// 全局类型定义
declare interface PlayerInfo {
  uid: number
  name: string
  sex?: number
  avatar?: string
  point?: number
}

declare interface Window {
  playerInfo?: PlayerInfo
}
