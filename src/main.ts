import { JSONRPCSocketClient, IJSONRPCSocketClient } from './json-rpc-socket/client'
import { ElectrumProtocol } from './gen/protocol'
import { EventEmitter } from 'events'

export default class ElectrumClient {
  private _socketClient: IJSONRPCSocketClient
  public methods: ElectrumProtocol
  public events: EventEmitter

  constructor (host: string, port: number, type: string = 'tls') {
    this._socketClient = new JSONRPCSocketClient(host, port, type)

    this.methods = new ElectrumProtocol(this._socketClient)

    this.events = this._socketClient.events
  }

  public async connect () {
    return this._socketClient.connect()
  }
}
