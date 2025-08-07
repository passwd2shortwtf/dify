import { create } from 'zustand'
import type { Tag } from './constant'

type State = {
  tagList: Tag[]
  showTagManagementModal: boolean
  selectedTags: string[]
}

type Action = {
  setTagList: (tagList?: Tag[]) => void
  setShowTagManagementModal: (showTagManagementModal: boolean) => void
  setSelectedTags: (selectedTags: string[]) => void
}

export const useStore = create<State & Action>(set => ({
  tagList: [],
  setTagList: tagList => set(() => ({ tagList })),
  showTagManagementModal: false,
  setShowTagManagementModal: showTagManagementModal => set(() => ({ showTagManagementModal })),
  selectedTags: [],
  setSelectedTags: selectedTags => set(() => ({ selectedTags })),
}))
