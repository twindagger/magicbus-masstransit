const MassTransitEnvelope = require('./envelope')
const PublisherRoutePattern = require('./publisher-route-pattern')
const url = require('url')
const noOp = () => {}

const MagicBusWrapper = (magicbus) => {
  let envelope

  return {
    createBroker: (serviceDomainName, appName, connectionInfo, configurator) => {
      if (typeof (connectionInfo) === 'string') {
        let parsed = url.parse(connectionInfo)
        connectionInfo = {
          server: parsed.hostname,
          port: parsed.port || '5672',
          protocol: parsed.protocol || 'amqp://',
          user: parsed.auth && parsed.auth.indexOf(':') !== -1 ? unescape(parsed.auth.split(':')[0]) : 'guest',
          pass: parsed.auth && parsed.auth.indexOf(':') !== -1 ? unescape(parsed.auth.split(':')[1]) : 'guest',
          vhost: parsed.path && parsed.path.substring(1)
        }
      }
      let portString = connectionInfo.port ? ':' + connectionInfo.port : ''
      let vhostString = connectionInfo.vhost && connectionInfo.vhost !== '/' && connectionInfo.vhost.toLowerCase() !== '%2f'
        ? connectionInfo.vhost + '/'
        : ''
      let hostAddress = `rabbitmq://${connectionInfo.server}${portString}/${vhostString}`
      envelope = MassTransitEnvelope(hostAddress, serviceDomainName, appName)
      let broker = magicbus.createBroker(serviceDomainName, appName, connectionInfo, configurator)
      return broker
    },
    /* eslint-enable complexity */
    createPublisher: (broker, configurator = noOp) =>
      magicbus.createPublisher(broker, (cfg) => {
        cfg.useEnvelope(envelope)
        cfg.useRoutePattern(PublisherRoutePattern())
        configurator(cfg)
      }),
    createConsumer: (broker, configurator = noOp) =>
      magicbus.createConsumer(broker, (cfg) => {
        cfg.useEnvelope(envelope)
        configurator(cfg)
      }),
    createSubscriber: (broker, configurator = noOp) =>
      magicbus.createSubscriber(broker, (cfg) => {
        cfg.useEnvelope(envelope)
        configurator(cfg)
      }),
    createBinder: (connectionInfo, configurator) =>
      magicbus.createBinder(connectionInfo, configurator),

    on: (event, handler) => magicbus.on(event, handler),
    logSink: magicbus.logSink
  }
}

module.exports = MagicBusWrapper
