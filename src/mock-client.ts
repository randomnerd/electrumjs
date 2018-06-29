import { EventEmitter } from 'events'
import { ISocketClient } from './lib/socket-utils'
import { JsonMessageParser } from './lib/json-message-parser'
import { type2, util2 } from 'jsonrpc-spec'

type asyncCallback = (e: null | Error, message?: any) => void

const createPromiseResult = (resolve: (arg) => void, reject: (Error) => void): asyncCallback => {
  return (err, result) => {
    if (err) reject(err)
    else resolve(result)
  }
}

export class MockClient implements ISocketClient {
  private sequence: number
  // private port: number
  // private host: string
  private callbackMessageTable: { [key: string]: asyncCallback }
  private jsonMessageParser: JsonMessageParser
  private status: number
  public subscribe: EventEmitter
  private connection: boolean

  constructor () {
    this.sequence = 0
    // this.port = 3333
    // this.host = 'test.example.com'
    this.callbackMessageTable = {}
    this.subscribe = new EventEmitter()
    this.connection = false
    this.jsonMessageParser = new JsonMessageParser((obj: any): void => {
      const type = util2.autoDetect(obj)
      switch (type) {
        case type2.JSON_TYPE.BATCH:
          this.onMessageBatchResponse(obj as Array<object>)
          break
        case type2.JSON_TYPE.RESPONSE:
          this.onMessageResponse(type2.JSON_TYPE.RESPONSE, obj as type2.IBaseResponse)
          break
        case type2.JSON_TYPE.RESPONSE_ERROR:
          this.onMessageResponse(type2.JSON_TYPE.RESPONSE_ERROR, obj as type2.IBaseResponse)
          break
        case type2.JSON_TYPE.NOTIFICATION:
          this.onMessageNotification(obj)
          break
        default:
          break
      }
    })
    this.status = 0
  }

  connect (): Promise<void> {
    if (this.status) {
      return Promise.resolve()
    }
    this.status = 1
    this.connection = true
    const loop = () => {
      if (this.connection) {
        setTimeout(() => loop(), 1000)
      }
    }
    loop()
    return new Promise((resolve) => resolve())
  }

  close (): void {
    if (!this.status) {
      return
    }
    this.status = 0
    this.connection = false
  }

  injectResponse (msg: string): void {
    this.onRecv(msg)
  }

  request<T1, T2> (method: string, params: T1): Promise<T2> {
    if (!this.status) {
      return Promise.reject(new Error('ESOCKET'))
    }
    return new Promise<T2>((resolve, reject) => {
      const id: number = ++this.sequence
      // const req: type2.IRequest<T1> = util2.makeRequest<T1>(id, method, params)
      // const content: string = [JSON.stringify(req), '\n'].join('')
      this.callbackMessageTable[id] = createPromiseResult(resolve, reject)
      //            this.conn.write(content)
    })
  }

  response (type: type2.JSON_TYPE, obj: type2.IBaseResponse): void {
    if (obj.id === null) {
      return
    }
    const cb: asyncCallback = this.callbackMessageTable[obj.id]
    if (cb) {
      delete this.callbackMessageTable[obj.id]
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

  private onMessageResponse (type: type2.JSON_TYPE, obj: type2.IBaseResponse): void {
    this.response(type, obj)
  }

  private onMessageNotification (obj: any): void {
    const message = util2.resolveNotification<any>(obj)
    this.subscribe.emit(message.method, message.params)
  }
  private onMessageBatchResponse (obj: Array<object>): void {
      // TODO: support for batch responses
  }

  onConnect (): void {
    console.log('connected')
  }

  onClose (): void {
    Object.keys(this.callbackMessageTable).forEach((key) => {
      const cb: asyncCallback = this.callbackMessageTable[key]
      cb(new Error('close connect'))
      delete this.callbackMessageTable[key]
    })
  }

  onRecv (chunk: string): void {
    try {
      this.jsonMessageParser.run(chunk)
    } catch (e) {
      // this.conn.on('error', e)
    }
  }

  onEnd (e: Error): void {
    console.log('connected')
  }

  onError (e: Error): void {
    this.close()
  }
}
