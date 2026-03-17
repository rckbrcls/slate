export interface TitlePage {
  title?: string
  credit?: string
  author?: string
  source?: string
  draftDate?: string
  contact?: string
  copyright?: string
  [key: string]: string | undefined
}

export interface FountainToken {
  type: string
  text?: string
  is_title?: boolean
  scene_number?: string
  dual?: string
  depth?: number
}
