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
    getMessage (data, kind) {
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
    getRoutingKey (/* data, kind */) {
      return ''
    },
    getData (message) {
      return message.payload.message || null
    },
    getMessageTypes (message) {
      return message.payload.messageType || []
    },
    serialize (payload) {
      return Buffer.from(JSON.stringify(payload), 'utf8')
    },
    deserialize (content) {
      return JSON.parse(content.toString('utf8'))
    }
  }
}

module.exports = MassTransitEnvelope
