import { Socket } from 'net'
import { TLSSocket } from 'tls'
import { ISocketClient } from '../client'

// ----------------
// constants

const TIMEOUT = 10000

// ----------------
// helpers

export class TimeoutError implements Error {
  public errno = 'ETIMEDOUT'
  public code = 'ETIMEDOUT'
  public name = 'TimeoutError'
  public connect: boolean // TODO: find out what this is for

  constructor (public message: string) {
    this.connect = false
  }

  toString (): string {
    return `${this.name}: ${this.message}`
  }
}

// ----------------
// socket methods

const getSocket = (protocol: string, options: any): Socket => {
  switch (protocol) {
    case 'tcp':
      return new Socket() // TODO: no options?
    case 'tls':
    case 'ssl':
      return new TLSSocket(options)
    default:
      throw new Error('unknown protocol')
  }
}

/**
 * Initialize a socket client
 *
 * @param client Socket client instance
 * @param protocol Socket protocol (tcp or tls)
 * @param options Socket client options
 */
export const initSocketClient = (client: ISocketClient, protocol: string, options: any): Socket => {
  const conn: Socket = getSocket(protocol, options) // create connection

  // set options
  conn.setTimeout(TIMEOUT)
  conn.setEncoding('utf8')
  conn.setKeepAlive(true, 0)
  conn.setNoDelay(true)

  // event handlers
  conn.on('connect', () => {
    conn.setTimeout(0)
    client._onConnect()
  })

  conn.on('close', (e: Error) => client._onClose(e))

  conn.on('timeout', () => conn.emit('error', new TimeoutError('Connection timed out')))

  conn.on('data', (chunk: string) => {
    conn.setTimeout(0)
    client._onRecv(chunk)
  })

  conn.on('end', (e) => {
    conn.setTimeout(0)
    client._onEnd(e)
  })

  conn.on('error', (e) => client._onError(e))

  // return socket connection
  return conn
}

/**
 * Connects a Socket instance and resolves when the connection is sucessful
 *
 * @param connection Socket connection
 * @param host ElectrumX server IP or URL
 * @param port ElectrumX server port
 */
export const asyncSocketConnect = (connection: Socket, host: string, port: number): Promise<void> => {
  return new Promise((resolve: () => void, reject: (e: Error) => void) => {
    const errorHandler = (e: Error) => reject(e)
    connection.connect(port, host, () => {
      connection.removeListener('error', errorHandler)
      resolve()
    })
    connection.on('error', errorHandler)
  })
}
