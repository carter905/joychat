// "use server"

import { OpenAIStream, StreamingTextResponse } from 'ai'
import OpenAI from 'openai'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { GoogleGenerativeAIStream, Message } from 'ai'

import { auth } from '@/auth'
import { nanoid } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

// export const runtime = 'edge'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')

const buildGoogleGenAIPrompt = (messages: Message[]) => ({
  contents: messages
    .filter(message => message.role === 'user' || message.role === 'assistant')
    .map(message => ({
      role: message.role === 'user' ? 'user' : 'model',
      parts: [{ text: message.content }],
    })),
})

const groqOpenAI = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
})

async function handleCompletion(completion: string, messages: Message[], id: string, userId: string) {

  const nonSystemMessages = messages.filter((message: Message) => message.role !== 'system')
  const firstNonSystemMessage = nonSystemMessages.find((message: Message) => message.role !== 'system')

  const title = firstNonSystemMessage ? firstNonSystemMessage.content.substring(0, 100) : messages[0].content.substring(0, 100)
  const chatId = id ?? nanoid()
  const createdAt = Date.now()
  const path = `/chat/${chatId}`
  const newMessage = {
    content: completion,
    role: 'assistant',
  }

  const updatedMessages = [
    ...messages,
    newMessage,
  ]

  try {
    const startTime = Date.now()

    // see README function upsert_chat definition
    const { data: rows, error } = await supabase.rpc('upsert_chat', {
      p_chat_id: chatId,
      p_title: title,
      p_user_id: userId,
      p_created_at: createdAt,
      p_path: path,
      p_messages: updatedMessages,
      p_share_path: null
    })

    const endTime = Date.now()
    const executionTime = endTime - startTime

    console.log(`Execution Time: ${executionTime} ms`)
    console.log(`upsert chat ${chatId} data `, rows, error)

  } catch (err) {
    console.error('Error inserting or updating chat:', err)
  }
}

export const maxDuration = 59

export async function POST(req: Request) {

  const json = await req.json()

  let { messages, previewToken, model, id } = json
  const userId = (await auth())?.user.id

  if (!userId) {
    return new Response('Unauthorized', {
      status: 401
    })
  }

  console.log('model', model)

  // use groqOpenAI llama provider
  if (model.startsWith('llama3')) {

    console.log('llama3-8b-8192')

    const res = await groqOpenAI.chat.completions.create({
      model: 'llama3-8b-8192',
      messages,
      temperature: 0.7,
      stream: true
    })

    const stream = OpenAIStream(res, {

      async onCompletion(completion) {
        handleCompletion(completion, messages, id, userId)
      }
    })

    return new StreamingTextResponse(stream)

  }

  // use google gemini provider
  if (model.startsWith('gemini')) {

    console.log('gemini model')

    const geminiStream = await genAI
    .getGenerativeModel({ model: 'gemini-pro' })
    .generateContentStream(buildGoogleGenAIPrompt(messages))

    // Convert the response into a friendly text-stream
    const stream = GoogleGenerativeAIStream(geminiStream, {
      onCompletion: async (completion) => {
        handleCompletion(completion, messages, id, userId)      
      }
    })

    // Respond with the stream
    return new StreamingTextResponse(stream)
  }

  if (previewToken) {
    openai.apiKey = previewToken
  }

  if (model === 'gpt-4') {
    model = 'gpt-4-turbo'
  }

  const res = await openai.chat.completions.create({
    model,
    messages,
    temperature: 0.7,
    stream: true
  })

  const stream = OpenAIStream(res, {
    async onCompletion(completion) {
      handleCompletion(completion, messages, id, userId)
    }
  })

  return new StreamingTextResponse(stream)
}
