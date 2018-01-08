# magicbus-masstransit

This aims to support complete interoperation between magicbus and MassTransit 3.5 or greater. That means

* Automatic creation of exchanges and queues
* Automatic binding for consumers
* Message envelope and serialization
* Send/Consume support
* Publish/Subscribe support
* Request/Reply support
* Routing slip support (as a participant, not as an orchestrator)
* Scheduling support

## Usage

```javascript
const magicbus = require('magicbus-masstransit')(require('magicbus'));

const broker = magicbus.createBroker('MyDomain', 'AppName', 'amqp://guest:guest@localhost:5672/');
```

### Sending
```javascript
// analogous to ISendEndpointProvider.GetSendEndpoint()
const sender = magicbus.createSender(broker, 'other-queue');

let sendPromise = sender.send({ some: 'message' });
```

### Consuming
```javascript
// analogous to ISendEndpointProvider.GetSendEndpoint()
const consumer = magicbus.createConsumer(broker, 'my-queue');

// Creates exchange and queue "my-queue" if they don't exist and binds the exchange to the queue
let consumerStartPromise = consumer.startConsuming((data, types, rawMessage, actions) => {
    return workPromise;
  });
```

### Publishing
```javascript
const publisher = magicbus.createPublisher(broker);

// Creates exchange "MyDomain.AppName:ProcessStarted" if it doesn't exist
let pubPromise = publisher.publish('ProcessStarted', {
  some: 'data'
});
```

### Subscribing to Events
```javascript
const subscriber = magicbus.createSubscriber(broker, 'my-subscriber');

subscriber.on('OtherDomain.Some.Namespace:SomeEvent',
  (eventName, data, rawMessage, actions) => {
    // ... do some work
    return workPromise;
  }
);

// Creates exchange and queue "my-subscriber" if they don't exist and binds the exchange to the queue
// Creates exchange "OtherDomain.Some.Namespace:SomeEvent" if it doesn't exist
// Binds exchange "OtherDomain.Some.Namespace:SomeEvent" to exchange "my-subscriber"
let subscriptionStartPromise = subscriber.startSubscription();
```

### Sending a Request/Reply request
```javascript
const requester = magicbus.createRequester(broker, 'OtherDomain.Some.Namespace:SomeRequest');

// The first request will create a temporary exclusive queue for responses to be directed to.
// Other requests will reuse the same queue
requester.Request({ message: 'PING' })
  .then((response, rawMessage) => {
      // do something with response
    });
```

### Replying to a Request/Reply request
```
const subscriber = magicbus.createSubscriber(broker, 'my-subscriber');

subscriber.on('MyDomain.AppName:SomeRequest',
  (eventName, data, rawMessage, actions) => {
    // ... do some work
    workPromise.then(() => actions.reply({ message: 'PONG' }));
  });
```

### Implementing a Routing Slip Activity
```
const endpoint = magicbus.createActivity(broker, 'my-activity-queue', 'my-compensate-queue'); // compensation queue is optional

let endpointStartPromise = endpoint.startEndpoint(
    (arguments, types, rawMessage, actions) => {
      // ... do some work
      return workPromise;
    },
    // compensation function, required when compensation queue is provided, forbidden otherwise
    (log, types, rawMessage, actions) => {
      // ... do some work
      return workPromise;
    }
  );
```

### Scheduling a message
```
const scheduler = magicbus.createScheduler(broker, 'scheduler-queue');

let later = new Date();
later.setMonth(later.getMonth() + 1);

let scheduledMessagePromise = scheduler.schedulePublish('DoItNow', later, { some: 'data' });
```

### Scheduling a recurring message
```
const scheduler = magicbus.createScheduler(broker, 'scheduler-queue');

const cronExpression = "* * * * *"; // every minute

let scheduledMessagePromise = scheduler.scheduleRecurringSend('my-queue', scheduler.defaultRecurringSchedule(cronExpression), { some: 'data' });
```


## NOT SUPPORTED

The purpose of this package is to enable javascript services to interoperate with services using MassTransit as their message bus,
*not* to have feature parity with MassTransit. The following features will probably never be implemented in this package.

* Routing Slip Orchestration - Build a javascript routing slip orchestrator and let me know about it!
* Sagas - Build a javascript saga orchestrator and let me know about it! magicbus uses `machina` for its connection state machines.
* Turnout - Build a javascript long-running task monitor and let me know about it!
* Circuit Breaker, Retries, or any other message pipeline features from MassTransit or GreenPipes.
  * If you're using `magicbus`, you've already got most of them! See `magicpipes`
