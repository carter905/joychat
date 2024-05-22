import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import localforage from 'localforage'
import { Chat } from '@/lib/types'

// 定义状态类型
export interface ChatState {
  chats: Array<Chat>
  setChats: (chats: Array<Chat>) => void
  fetchHistory: () => Promise<void>
  deleteChat: (id: string) => void
  removeChats: () => void
  chat: Chat | null
  fetchChatById: (id: string) => Promise<void>
  removeChat: (chatId: string) => Promise<void>
  reset: () => void
  setChat: (chat: Chat) => void
  chatLoading: boolean
}

const useChatStore = create<ChatState>()(
    persist(
      //@ts-ignore
      (set) => ({
        chats: [],
        chat: null,
        chatLoading: false,
        setChats: (chats: Chat[]) => set({ chats }),
        fetchHistory: async () => {
          const response = await fetch('/api/chats')
          const { data } = await response.json()
          set({ chats: data })
        },
        setChat: (chat: Chat) => set({chat}),
        fetchChatById: async (chatId: string) => {
          set({chatLoading: true})
          const response = await fetch(`/api/chats/${chatId}`)
          const { data } = await response.json()
          set({ chatLoading: false })
          set({ chat: data })
        },
        deleteChat: (id: string) => set((state) => ({
          chats: state.chats.filter(chat => chat.id !== id)
        })),
        removeChats: () => {
          set({ chats: [] })
          localforage.removeItem('chat-history')
        },
        removeChat: async (chatId: string) => {
          const response = await fetch(`/api/chats/${chatId}`, {
            method: 'delete'
          })
          const { data } = await response.json()
          set({ chat: null })
        },
        reset: () => {
          set({ chats: [] })
          localforage.removeItem('chat-history')
        }
      }),
      {
        name: 'chat-history',
        getStorage: () => localforage,
      }
    ),
)

export default useChatStore