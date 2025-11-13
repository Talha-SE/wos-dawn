// Simple broadcast system for translation completions
// This allows us to notify users when their translations complete

type Subscriber = {
  userId: string
  callback: (data: any) => void
}

const subscribers: Subscriber[] = []

export function subscribeToTranslations(userId: string, callback: (data: any) => void) {
  subscribers.push({ userId, callback })
  
  // Return unsubscribe function
  return () => {
    const index = subscribers.findIndex(s => s.userId === userId && s.callback === callback)
    if (index > -1) {
      subscribers.splice(index, 1)
    }
  }
}

export function broadcastToUser(userId: string, data: any) {
  const userSubscribers = subscribers.filter(s => s.userId === userId)
  userSubscribers.forEach(sub => {
    try {
      sub.callback(data)
    } catch (error) {
      console.error('Error broadcasting to user:', error)
    }
  })
}

export function getSubscriberCount(): number {
  return subscribers.length
}
