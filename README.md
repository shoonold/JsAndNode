
## Task 2 - Improve Performance

1. I initialize a value to hold batch size for requests
2. I check if the response is already cached. If cache hit, return cached data immediately
3. If cache miss, I check to see if the number of events is within the batch size. If so, make all requests in one go, else make requests in batches
4. On success, I cache the response with a TTL (Time To Live) and return the success response
5. Cached data automatically expires after 30 seconds to ensure fresh data

## Task 3 - Improve Resilience

This mimicks queue systems - 

1. I created a class called Circuit Breaker - This holds three states
 - Closed: This signals that the external service is working correctly.
 - Open: This signals that the external service has failed 3+ times in thirty seconds so requests should be held off
 - Half_Open: This signals to try one order after a 10 second wait to check for service recovery

2. I created a class called Request Queue - This queues all the incoming requests with the number of times they have been attempted and the max number of attemps each request is to have. So, this way, when a request fails, I know to retry the request with an exponential backoff as each request holds its state showing how many times it has been tried. If a request fails thrice, then an error response is returned. This ensures that each request gets tried muktiple times even when the service is down similar to kafka
