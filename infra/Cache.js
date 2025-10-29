class Cache {
  constructor(ttl = 30000) { // 30 seconds default
    this.store = new Map();
    this.ttl = ttl;
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }
  
  set(key, value) {
    this.store.set(key, {
      value,
      timestamp: Date.now()
    });
  }
  
  get(key) {
    const item = this.store.get(key);
    
    if (!item) return null;
    
    // Check if expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.store.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  has(key) {
    return this.get(key) !== null;
  }
  
  delete(key) {
    this.store.delete(key);
  }
  
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (now - item.timestamp > this.ttl) {
        this.store.delete(key);
      }
    }
  }
  
  clear() {
    this.store.clear();
  }
}

module.exports = Cache;