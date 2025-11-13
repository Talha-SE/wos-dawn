import axios from 'axios'
import PendingTranslation from '../models/PendingTranslation'

interface QueueItem {
  translationId: string
  userId: string
  messageId: string
  messageContent: string
  targetLanguage: string
  retryCount: number
  priority: number // Lower number = higher priority (based on creation time)
}

class TranslationQueue {
  private queue: QueueItem[] = []
  private processing = false
  private processingInterval: NodeJS.Timeout | null = null
  private readonly MAX_RETRIES = 10
  private readonly BASE_DELAY = 2000 // 2 seconds between translations
  private lastProcessTime = 0

  constructor() {
    // Start processing queue
    this.startProcessing()
  }

  private startProcessing() {
    // Process queue every 2 seconds
    this.processingInterval = setInterval(() => {
      this.processNext()
    }, this.BASE_DELAY)

    console.log('Translation queue processor started')
  }

  async addToQueue(item: QueueItem) {
    // Check if already in queue
    const existing = this.queue.find(
      q => q.translationId === item.translationId
    )
    
    if (existing) {
      console.log(`Translation ${item.translationId} already in queue`)
      return
    }

    // Add to queue sorted by priority (FIFO - first in, first out)
    this.queue.push(item)
    this.queue.sort((a, b) => a.priority - b.priority)
    
    console.log(`Added translation to queue. Queue size: ${this.queue.length}`)
  }

  private async processNext() {
    // Don't process if already processing or queue is empty
    if (this.processing || this.queue.length === 0) {
      return
    }

    // Rate limiting: ensure at least 2 seconds between requests
    const now = Date.now()
    const timeSinceLastProcess = now - this.lastProcessTime
    if (timeSinceLastProcess < this.BASE_DELAY) {
      return
    }

    this.processing = true
    this.lastProcessTime = now
    
    // Get first item from queue
    const item = this.queue.shift()
    if (!item) {
      this.processing = false
      return
    }

    console.log(`Processing translation: ${item.translationId} (queue size: ${this.queue.length})`)

    try {
      const result = await this.translateWithAPI(item)
      
      if (result.success && result.translatedText) {
        // Success - update database with result
        await PendingTranslation.findByIdAndUpdate(item.translationId, {
          status: 'completed',
          lastAttempt: new Date(),
          translatedText: result.translatedText
        })
        
        console.log(`Translation completed: ${item.translationId}`)
        
        // Broadcast translation to user via SSE (if they're connected)
        this.broadcastTranslation(item.userId, item.messageId, result.translatedText, item.targetLanguage)
      } else if (result.rateLimited) {
        // Rate limited - put back in queue with increased retry count
        console.log(`Translation rate limited, re-queuing: ${item.translationId}`)
        
        if (item.retryCount < this.MAX_RETRIES) {
          await PendingTranslation.findByIdAndUpdate(item.translationId, {
            $inc: { retryCount: 1 },
            lastAttempt: new Date(),
            error: 'Rate limited, retrying...'
          })
          
          // Re-add to end of queue with incremented retry count
          await this.addToQueue({
            ...item,
            retryCount: item.retryCount + 1,
            priority: Date.now() // Lower priority (end of queue)
          })
        } else {
          // Max retries reached
          await PendingTranslation.findByIdAndUpdate(item.translationId, {
            status: 'failed',
            lastAttempt: new Date(),
            error: 'Max retries reached'
          })
          console.log(`Translation failed after max retries: ${item.translationId}`)
        }
      } else {
        // Other error
        console.error(`Translation failed: ${item.translationId}`, result.error)
        
        if (item.retryCount < this.MAX_RETRIES) {
          await PendingTranslation.findByIdAndUpdate(item.translationId, {
            $inc: { retryCount: 1 },
            lastAttempt: new Date(),
            error: result.error || 'Unknown error'
          })
          
          // Re-add with delay
          setTimeout(() => {
            this.addToQueue({
              ...item,
              retryCount: item.retryCount + 1,
              priority: Date.now()
            })
          }, 5000) // 5 second delay for errors
        } else {
          await PendingTranslation.findByIdAndUpdate(item.translationId, {
            status: 'failed',
            lastAttempt: new Date(),
            error: result.error || 'Max retries reached'
          })
        }
      }
    } catch (error) {
      console.error('Error processing translation:', error)
      
      // Re-queue on exception
      if (item.retryCount < this.MAX_RETRIES) {
        setTimeout(() => {
          this.addToQueue({
            ...item,
            retryCount: item.retryCount + 1,
            priority: Date.now()
          })
        }, 5000)
      }
    } finally {
      this.processing = false
    }
  }

  private async translateWithAPI(item: QueueItem): Promise<{
    success: boolean
    translatedText?: string
    rateLimited?: boolean
    error?: string
  }> {
    const apiKey = process.env.MISTRAL_API_KEY
    if (!apiKey) {
      return { success: false, error: 'API key not configured' }
    }

    const systemPrompt = `You are a professional translator. Translate the following text to ${item.targetLanguage}. 

RULES:
- Automatically detect the source language
- Preserve formatting, emojis, line breaks, and punctuation exactly
- Keep URLs, mentions, hashtags unchanged
- Only return the translated text, nothing else
- No explanations, no comments, just the translation
- Maintain the same tone and style
- If the text is already in ${item.targetLanguage}, return it as-is`

    try {
      const { data } = await axios.post(
        'https://api.mistral.ai/v1/chat/completions',
        {
          model: 'mistral-small-latest',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: item.messageContent }
          ],
          temperature: 0.3,
          max_tokens: 2048,
          top_p: 1
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 30000
        }
      )

      const translatedText = data?.choices?.[0]?.message?.content?.trim()
      
      if (translatedText) {
        return { success: true, translatedText }
      } else {
        return { success: false, error: 'No translation received' }
      }
    } catch (error: any) {
      const errorData = error?.response?.data
      const isRateLimitError = 
        errorData?.type === 'service_tier_capacity_exceeded' ||
        errorData?.code === '3505' ||
        error?.response?.status === 429 ||
        errorData?.message?.toLowerCase().includes('capacity') ||
        errorData?.message?.toLowerCase().includes('rate limit')

      if (isRateLimitError) {
        return { success: false, rateLimited: true, error: 'Rate limited' }
      } else {
        return { 
          success: false, 
          error: errorData?.message || error?.message || 'Translation failed' 
        }
      }
    }
  }

  private broadcastTranslation(userId: string, messageId: string, translatedText: string, targetLanguage: string) {
    // Import at function level to avoid circular dependencies
    const { broadcastToUser } = require('./translationBroadcast')
    broadcastToUser(userId, {
      type: 'translation-completed',
      payload: {
        messageId,
        translatedText,
        targetLanguage
      }
    })
  }

  async loadPendingTranslations() {
    // Load all pending translations from database on startup
    try {
      const pending = await PendingTranslation.find({
        status: 'pending',
        retryCount: { $lt: this.MAX_RETRIES }
      })
      .sort({ createdAt: 1 }) // Oldest first
      .lean()

      console.log(`Loading ${pending.length} pending translations into queue`)

      for (const trans of pending) {
        await this.addToQueue({
          translationId: String(trans._id),
          userId: String(trans.userId),
          messageId: trans.messageId,
          messageContent: trans.messageContent,
          targetLanguage: trans.targetLanguage,
          retryCount: trans.retryCount,
          priority: new Date(trans.createdAt).getTime()
        })
      }
    } catch (error) {
      console.error('Error loading pending translations:', error)
    }
  }

  getQueueSize(): number {
    return this.queue.length
  }

  getQueueStatus() {
    return {
      size: this.queue.length,
      processing: this.processing,
      items: this.queue.map(item => ({
        translationId: item.translationId,
        messageId: item.messageId,
        retryCount: item.retryCount,
        priority: item.priority
      }))
    }
  }

  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }
    console.log('Translation queue processor stopped')
  }
}

// Singleton instance
let queueInstance: TranslationQueue | null = null

export function getTranslationQueue(): TranslationQueue {
  if (!queueInstance) {
    queueInstance = new TranslationQueue()
  }
  return queueInstance
}

export async function initializeTranslationQueue() {
  const queue = getTranslationQueue()
  await queue.loadPendingTranslations()
  console.log('Translation queue initialized')
}
