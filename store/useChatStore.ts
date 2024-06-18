import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import localforage from 'localforage'
import { Chat } from '@/lib/types'
import { isLocalMode } from '@/lib/const'
import { localForage } from '@/lib/localforage'

// 定义状态类型
export interface ChatState {
  chats: Array<Chat>
  setChats: (chats: Array<Chat>) => void
  fetchHistory: () => Promise<void>
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
      (set) => {
        // init history data
        (async () => {
          if (isLocalMode) {
            const localChatState = await localForage.get('chat-history') as { state: ChatState } || null
            set({ chats: localChatState?.state?.chats || [] })
          } else {
            const response = await fetch('/api/chats')
            const { data } = await response.json()
            console.log('init history data', data)
            set({ chats: data })
          }
        })()

        return {
          chats: [],
          chat: null,
          chatLoading: false,
          setChats: (chats: Chat[]) => set({ chats }),
          fetchHistory: async () => {
            if (!isLocalMode) {
              const response = await fetch('/api/chats')
              const { data } = await response.json()
              console.log('fetch history data', data)
              set({ chats: data })
            }
          },
          setChat: (chat: Chat) => set({chat}),
          fetchChatById: async (chatId: string) => {
            set({ chatLoading: true })
            if (isLocalMode) {
              const { state } = await localForage.get('chat-history') as { state: ChatState }
              const chat = state.chats.find(chat => chat.chat_id === chatId)
              if (chat) {
                set({ chat })
              } else {
                console.error(`Chat with id ${chatId} not found in local storage`)
              }
            } else {
              const response = await fetch(`/api/chats/${chatId}`)
              const { data } = await response.json()
              set({ chatLoading: false })
              set({ chat: data })
            }
          },
          removeChats: async() => {
            if (!isLocalMode) {
              await fetch(`/api/chats`, {
                method: 'delete'
              })
            }
            set({ chats: [] })
            localForage.remove('chat-history')
          },
          removeChat: async (chatId: string) => {
            if (!isLocalMode) {
              await fetch(`/api/chats/${chatId}`, {
                method: 'delete'
              })
            }
            set((state) => ({
              chats: state.chats.filter(chat => chat.chat_id !== chatId)
            }))
            set({ chat: null })
          },
          reset: () => {
            set({ chats: [] })
            localForage.remove('chat-history')
          }
        }
      },
      {
        name: 'chat-history',
        getStorage: () => localforage,
      }
    ),
)

export default useChatStore