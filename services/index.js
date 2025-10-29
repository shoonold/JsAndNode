const fastify = require("fastify")({ logger: true });
const listenMock = require("../mock-server");
const RequestQueue = require("../infra/RequestQueue");
const requestQueue = new RequestQueue();
const Cache = require("../infra/Cache");
const userCache = new Cache(30000); // 1 minute TTL
const eventCache = new Cache(60000); // 1 minute TTL

fastify.get("/getUsers", async (request, reply) => {
  const resp = await fetch("http://event.com/getUsers");
  const data = await resp.json();
  reply.send(data);
});

fastify.post("/addEvent", async (request, reply) => {
  requestQueue.enqueue(request.body, reply);
});

fastify.get("/getEvents", async (request, reply) => {
  const resp = await fetch("http://event.com/getEvents");
  const data = await resp.json();
  reply.send(data);
});

fastify.get("/getEventsByUserId/:id", async (request, reply) => {
  const { id } = request.params;
  const cachedResponse = userCache.get(`user:${id}:events`);
  if (cachedResponse) {
    reply.send(cachedResponse);
    return;
  }

  // Fetch user data
  let userData;
  const cachedUser = userCache.get(`user:${id}`);

  if (cachedUser) {
    userData = cachedUser;
  } else {
    const user = await fetch("http://event.com/getUserById/" + id);
    userData = await user.json();
    userCache.set(`user:${id}`, userData);
  }

  const userEvents = userData.events;
  const eventArray = [];
  const maxBatchSize = 10;

  if (userEvents.length <= maxBatchSize) {
    // Fetch from cache or API
    const events = await Promise.all(
      userEvents.map(async (eventId) => {
        const cached = eventCache.get(`event:${eventId}`);
        if (cached) return cached;

        const event = await fetch("http://event.com/getEventById/" + eventId);
        const eventData = await event.json();
        eventCache.set(`event:${eventId}`, eventData);
        return eventData;
      })
    );

    // Cache the full response
    userCache.set(`user:${id}:events`, events);
    reply.send(events);
    return;
  }

  let startIndex = 0;
  const totalIterations = Math.ceil(userEvents.length / maxBatchSize);

  for (let i = 0; i < totalIterations; i++) {
    const batch = userEvents.slice(startIndex, startIndex + maxBatchSize);

    const events = await Promise.all(
      batch.map(async (eventId) => {
        const cached = eventCache.get(`event:${eventId}`);
        if (cached) return cached;

        const event = await fetch("http://event.com/getEventById/" + eventId);
        const eventData = await event.json();
        eventCache.set(`event:${eventId}`, eventData);
        return eventData;
      })
    );

    eventArray.push(...events);
    startIndex += maxBatchSize;
  }

  // Cache the full response
  userCache.set(`user:${id}:events`, eventArray);
  reply.send(eventArray);
});

fastify.listen({ port: 3000 }, (err) => {
  listenMock();
  if (err) {
    fastify.log.error(err);
    process.exit();
  }
});
