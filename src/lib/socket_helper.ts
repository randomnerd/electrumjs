import { Socket } from 'net'
import { TLSSocket } from 'tls'
import { EventEmitter } from 'events'

const TIMEOUT = 10000

export class TimeoutError implements Error {
  public name = 'TimeoutError'
  errno: string
  code: string
  connect: boolean
  constructor (public message: string) {
    this.errno = ''
    this.code = ''
    this.connect = false
  }
  toString () {
    return this.name + ': ' + this.message
  }
}

const getSocket = (protocol: string, options: any): Socket => {
  switch (protocol) {
    case 'tcp':
      return new Socket()
    case 'tls':
    case 'ssl':
      return new TLSSocket(options)
  }
  throw new Error('unknown protocol')
}

export interface ISocketClient {
  onEnd: (e: Error) => void
  onError: (e: Error) => void
  onRecv: (chunk: string) => void
  onConnect: () => void
  onClose: (e: Error) => void
  subscribe: EventEmitter
  request: (method: string, params: Array<any>) => Promise<any>
}

// temporal workaround
// TODO: fix rpcgen and remove this
export interface ISocketEvent extends ISocketClient {}

export const initSocket = (client: ISocketClient, protocol: string, options: any): Socket => {
  // create connection
  const connection: Socket = getSocket(protocol, options)

  // set options
  connection.setTimeout(TIMEOUT)
  connection.setEncoding('utf8')
  connection.setKeepAlive(true, 0)
  connection.setNoDelay(true)

  // setup event handlers
  connection.on('connect', () => {
    connection.setTimeout(0)
    client.onConnect()
  })
  connection.on('close', (e: Error) => {
    client.onClose(e)
  })
  connection.on('timeout', () => {
    const error: TimeoutError = new TimeoutError('ETIMEDOUT')
    error.errno = 'ETIMEDOUT'
    error.code = 'ETIMEDOUT'
    error.connect = false
    connection.emit('error', error)
  })
  connection.on('data', (chunk: string) => {
    connection.setTimeout(0)
    client.onRecv(chunk)
  })
  connection.on('end', (e) => {
    connection.setTimeout(0)
    client.onEnd(e)
  })
  connection.on('error', (e) => {
    client.onError(e)
  })

  return connection
}

// connects a Socket instance and resolves when the connection is sucessful
export const asyncSocketConnect = (connection: Socket, port: number, host: string): Promise<void> => {
  return new Promise((resolve: () => void, reject: (e: Error) => void) => {
    const errorHandler = (e: Error) => reject(e)
    connection.connect(port, host, () => {
      connection.removeListener('error', errorHandler)
      resolve()
    })
    connection.on('error', errorHandler)
  })
}
