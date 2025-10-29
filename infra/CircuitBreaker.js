class CircuitBreaker {
  constructor() {
    this.state = "CLOSED"; // CLOSED, OPEN, HALF_OPEN
    this.failures = [];
    this.failureThreshold = 3;
    this.windowMs = 30000; // 30 seconds
    this.openTimeout = 10000; // Wait 10s before testing recovery
    this.lastOpenTime = null;
  }

  recordFailure() {
    const now = Date.now();
    this.failures.push(now);

    // Remove failures outside window
    this.failures = this.failures.filter((t) => now - t < this.windowMs);

    if (this.failures.length >= this.failureThreshold) {
      this.state = "OPEN";
      this.lastOpenTime = now;
    }
  }

  recordSuccess() {
    this.failures = [];
    this.state = "CLOSED";
  }

  canAttempt() {
    if (this.state === "CLOSED") return true;
    if (this.state === "HALF_OPEN") return true;

    // Check if we should try half-open
    if (Date.now() - this.lastOpenTime > this.openTimeout) {
      this.state = "HALF_OPEN";
      return true;
    }

    return false;
  }
}

module.exports = CircuitBreaker;
