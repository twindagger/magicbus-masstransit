const subscriberRoutePattern = ({ name, noAck = false, durable = true, autoDelete = false, exclusive = false }) =>
  (topology, serviceDomainName, appName, routeName) => {
    let baseName = serviceDomainName + '.' + appName + '.' + routeName

    return topology.createQueue({
      name,
      noAck: noAck,
      durable,
      autoDelete,
      exclusive
    }).then(() => ({ queueName: baseName }))
  }

module.exports = subscriberRoutePattern
