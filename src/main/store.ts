import Store from 'electron-store'

interface StoreSchema {
  lastSelectedRecipientId: string | null
}

let storeInstance: Store<StoreSchema> | null = null

// Lazy initialization to avoid issues during module loading
function getStore(): Store<StoreSchema> {
  if (!storeInstance) {
    storeInstance = new Store<StoreSchema>({
      defaults: {
        lastSelectedRecipientId: null
      }
    })
  }
  return storeInstance
}

export default getStore()
