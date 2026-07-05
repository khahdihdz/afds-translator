export type PageId = 'home' | 'upload' | 'editor' | 'preview' | 'tm' | 'glossary' | 'settings'

export interface NavItem {
  id: PageId
  label: string
  icon: string
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Trang chủ', icon: 'home' },
  { id: 'upload', label: 'Upload', icon: 'upload' },
  { id: 'editor', label: 'Editor', icon: 'edit' },
  { id: 'preview', label: 'Preview', icon: 'eye' },
  { id: 'tm', label: 'Translation Memory', icon: 'memory' },
  { id: 'glossary', label: 'Glossary', icon: 'book' },
  { id: 'settings', label: 'Cài đặt', icon: 'settings' },
]
