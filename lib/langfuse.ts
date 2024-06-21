import { Langfuse, LangfuseWeb } from "langfuse" // or "langfuse-node"
 
const langfuse = new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  publicKey: process.env.NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY,
  baseUrl: process.env.NEXT_PUBLIC_LANGFUSE_BASE_URL, // 🇺🇸 US region
 
  // optional
  release: "v1.0.0",
  requestTimeout: 10000,
  enabled: true, // set to false to disable sending events
})

export const langfuseBrowser = process.env.NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY
  ? new LangfuseWeb({
      publicKey: process.env.NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY,
      baseUrl: process.env.NEXT_PUBLIC_LANGFUSE_BASE_URL ?? undefined,
    })
  : undefined


export default langfuse