const uuid = require('uuid')
const os = require('os')
const pkg = require('./package.json')

const MassTransitEnvelope = (hostAddress) => {
  const contentType = 'application/vnd.masstransit+json'
  const hostInfo = {
    machineName: os.hostname(),
    processName: process.release.name || 'node',
    processId: process.pid,
    assembly: process.env.npm_package_name || 'Unknown',
    assemblyVersion: process.env.npm_package_version || 'Unknown',
    frameworkVersion: `${process.release.name} ${process.version}`,
    massTransitVersion: `${pkg.name}, ${pkg.version}`,
    operatingSystemVersion: process.platform
  }

  return {
    wrap (data, kind) {
      let messageId = uuid()
      return {
        properties: {
          contentType: contentType
        },
        payload: {
          messageId: messageId,
          conversationId: messageId,
          /* sourceAddress: sourceAddress, */
          destinationAddress: `${hostAddress}${kind}`,
          messageType: [
            `urn:message:${kind}`
          ],
          message: data,
          headers: {},
          host: hostInfo
        }
      }
    },
    getPublishOptions: () => ({}),
    getMessageTypes (message) {
      return message.payload.messageType || []
    },
    unwrap: ({ payload = null }) => payload.payload
  }
}

module.exports = MassTransitEnvelope
