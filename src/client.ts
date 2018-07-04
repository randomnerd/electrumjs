import { initSocketClient, asyncSocketConnect } from './lib/socket'
import { JsonMessageParser, IJsonMessageParser } from './lib/json-message-parser'

import { Socket } from 'net'
import { EventEmitter } from 'events'
import { type2, util2 } from 'jsonrpc-spec'

// ----------------
// type

type TAsyncCallback = (e: null | Error, message?: any) => void

// ----------------
// helpers

const createPromiseResult = (resolve: (arg) => void, reject: (Error) => void): TAsyncCallback => {
  return (err, result) => {
    if (err) reject(err)
    else resolve(result)
  }
}

// ----------------
// interfaces

/** Socket client instance */
export interface ISocketClient {
  _onEnd: (e: Error) => void
  _onError: (e: Error) => void
  _onRecv: (chunk: string) => void
  _onConnect: () => void
  _onClose: (e: Error) => void
  request: (method: string, params: Array<any>) => Promise<any>
  notifications: EventEmitter
}

// ----------------
// client

// TODO: document JSON-RPC stuff
export class Client implements ISocketClient {
  private _sequence: number
  private _host: string
  private _port: number
  private _callbackMessageTable: { [key: string]: TAsyncCallback }
  private _connection: Socket
  private _jsonMessageParser: IJsonMessageParser
  private _status: number
  public notifications: EventEmitter

  constructor (host: string, port: number, protocol: string = 'tcp', options: any = void 0) {
    this._sequence = 0
    this._host = host
    this._port = port
    this._callbackMessageTable = {}
    this._jsonMessageParser = this._getJsonMessageParser()
    this._status = 0
    this.notifications = new EventEmitter()

    this._connection = initSocketClient(this, protocol, options)
  }

  // ----------------
  // JSON message parser

  private _getJsonMessageParser (): IJsonMessageParser {
    return new JsonMessageParser((obj: any): void => {
      const type = util2.autoDetect(obj)
      switch (type) {
        case type2.JSON_TYPE.BATCH:
          this._onMessageBatchResponse(obj as Array<object>)
          break
        case type2.JSON_TYPE.RESPONSE:
          this._onMessageResponse(type2.JSON_TYPE.RESPONSE, obj as type2.IBaseResponse)
          break
        case type2.JSON_TYPE.RESPONSE_ERROR:
          this._onMessageResponse(type2.JSON_TYPE.RESPONSE_ERROR, obj as type2.IBaseResponse)
          break
        case type2.JSON_TYPE.NOTIFICATION:
          this._onMessageNotification(obj)
          break
        default:
          break
      }
    })
  }

  // ----------------
  // lifecycle methods

  async connect (): Promise<void> {
    if (this._status) return Promise.resolve()
    this._status = 1

    return asyncSocketConnect(this._connection, this._host, this._port)
  }

  close (): void {
    if (!this._status) {
      return
    }
    this._connection.end()
    this._connection.destroy()
    this._status = 0
  }

  // ----------------
  // request and response

  private _responseHandler (type: type2.JSON_TYPE, obj: type2.IBaseResponse): void {
    if (obj.id === null) {
      return
    }
    const cb: TAsyncCallback = this._callbackMessageTable[obj.id]
    if (cb) {
      delete this._callbackMessageTable[obj.id]
      switch (type) {
        case type2.JSON_TYPE.RESPONSE:
          const r: type2.IResponse<any> = util2.resolveResponse<any>(obj)
          cb(null, r.result)
          break
        case type2.JSON_TYPE.RESPONSE_ERROR:
          const re: type2.IResponseError = util2.resolveResponseError(obj)
          cb(new Error(re.error.code + ': ' + re.error.message))
          break
      }
    } else {
        // TODO: handle unexpected messages
    }
  }

  async request<T1, T2> (method: string, params: T1): Promise<T2> {
    if (!this._status) return Promise.reject(new Error('ESOCKET'))

    return new Promise<T2>((resolve, reject) => {
      const id: number = ++this._sequence
      const req: type2.IRequest<T1> = util2.makeRequest<T1>(id, method, params)
      const content: string = [JSON.stringify(req), '\n'].join('')
      this._callbackMessageTable[id] = createPromiseResult(resolve, reject)
      this._connection.write(content)
    })
  }

  // ----------------
  // message events

  private _onMessageResponse (type: type2.JSON_TYPE, obj: type2.IBaseResponse): void {
    this._responseHandler(type, obj)
  }

  private _onMessageNotification (obj: any): void {
    const message = util2.resolveNotification<any>(obj)
    this.notifications.emit(message.method, message.params)
  }

  private _onMessageBatchResponse (obj: Array<object>): void {
    // TODO: support batch responses
  }

  // ----------------
  // socket event handlers

  _onConnect (): void {
    // TODO
    // get version and check compatibility?
  }

  _onClose (): void {
    Object.keys(this._callbackMessageTable).forEach((key) => {
      const cb: TAsyncCallback = this._callbackMessageTable[key]
      cb(new Error('close connect'))
      delete this._callbackMessageTable[key]
    })
  }

  _onRecv (chunk: string): void {
    try {
      this._jsonMessageParser.run(chunk)
    } catch (e) {
      this._connection.on('error', e)
    }
  }

  _onEnd (e: Error): void {
    // TODO
  }

  _onError (e: Error): void {
    this.close()
  }
}
