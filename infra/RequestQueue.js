const CircuitBreaker = require('./CircuitBreaker');

class RequestQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.concurrency = 2; // Limit concurrent requests
    this.activeRequests = 0;
    this.circuitBreaker = new CircuitBreaker();
  }

  async enqueue(requestData, reply) {
    this.queue.push({ 
      data: requestData, 
      reply, 
      attempts: 0,
      maxAttempts: 3 
    });
    
    this.processQueue();
  }

  async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0 && this.activeRequests < this.concurrency) {
      const item = this.queue.shift();
      
      if (!this.circuitBreaker.canAttempt()) {
        // Re-queue if circuit is open
        this.queue.unshift(item);
        await this.sleep(1000);
        continue;
      }

      this.activeRequests++;
      this.processItem(item);
    }

    this.processing = false;
  }

  async processItem(item) {
    try {
      const resp = await fetch('http://event.com/addEvent', {
        method: 'POST',
        body: JSON.stringify({
          id: new Date().getTime(),
          ...item.data
        })
      });

      if (!resp.ok) throw new Error('API failed');

      const data = await resp.json();
      this.circuitBreaker.recordSuccess();
      item.reply.send(data);
      
    } catch (err) {
      this.circuitBreaker.recordFailure();
      item.attempts++;

      if (item.attempts < item.maxAttempts) {
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, item.attempts), 10000);
        setTimeout(() => this.queue.push(item), delay);
      } else {
        item.reply.status(503).send({ 
          error: 'Service temporarily unavailable' 
        });
      }
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = RequestQueue;