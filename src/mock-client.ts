import { EventEmitter } from 'events'
import { ISocketClient } from './client'
import { JsonMessageParser } from './lib/json-message-parser'
import { type2, util2 } from 'jsonrpc-spec'

// ----------------
// type

type IAsyncCallback = (e: null | Error, message?: any) => void

// ----------------
// helpers

const createPromiseResult = (resolve: (arg) => void, reject: (Error) => void): IAsyncCallback => {
  return (err, result) => {
    if (err) reject(err)
    else resolve(result)
  }
}

// ----------------
// mock client

/** Mock (fake) socket client */
export class MockClient implements ISocketClient {
  private _sequence: number
  private _callbackMessageTable: { [key: string]: IAsyncCallback }
  private _connection: boolean
  private _jsonMessageParser: JsonMessageParser
  private _status: number
  public notifications: EventEmitter

  constructor () {
    this._sequence = 0
    this._callbackMessageTable = {}
    this._connection = false
    this._jsonMessageParser = this._getJsonMessageParser()
    this._status = 0
    this.notifications = new EventEmitter()
  }

  // ----------------
  // JSON message parser

  _getJsonMessageParser () {
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

  connect (): Promise<void> {
    if (this._status) {
      return Promise.resolve()
    }
    this._status = 1
    this._connection = true
    const loop = () => {
      if (this._connection) {
        setTimeout(() => loop(), 1000)
      }
    }
    loop()
    return new Promise((resolve) => resolve())
  }

  close (): void {
    if (!this._status) {
      return
    }
    this._status = 0
    this._connection = false
  }

  // ----------------
  // request and response

  private _responseHandler (type: type2.JSON_TYPE, obj: type2.IBaseResponse): void {
    if (obj.id === null) {
      return
    }
    const cb: IAsyncCallback = this._callbackMessageTable[obj.id]
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
        // can't get async_callback
    }
  }

  request<T1, T2> (method: string, params: T1): Promise<T2> {
    if (!this._status) {
      return Promise.reject(new Error('ESOCKET'))
    }
    return new Promise<T2>((resolve, reject) => {
      const id: number = ++this._sequence
      // const req: type2.IRequest<T1> = util2.makeRequest<T1>(id, method, params)
      // const content: string = [JSON.stringify(req), '\n'].join('')
      this._callbackMessageTable[id] = createPromiseResult(resolve, reject)
      //            this.conn.write(content)
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
      // TODO: support for batch responses
  }

  // ----------------
  // socket event handlers

  _onConnect (): void {
    // TODO
  }

  _onClose (): void {
    Object.keys(this._callbackMessageTable).forEach((key) => {
      const cb: IAsyncCallback = this._callbackMessageTable[key]
      cb(new Error('close connect'))
      delete this._callbackMessageTable[key]
    })
  }

  _onRecv (chunk: string): void {
    try {
      this._jsonMessageParser.run(chunk)
    } catch (e) {
      // TODO: this.conn.on('error', e)
    }
  }

  _onEnd (e: Error): void {
    // TODO
  }

  _onError (e: Error): void {
    this.close()
  }

  // ----------------
  // TODO: find out what this one does

  injectResponse (msg: string): void {
    this._onRecv(msg)
  }
}
