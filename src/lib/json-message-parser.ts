import { IParseContext, PARSE_STATUS, chunkHandler, createRecursiveParser, parser } from './parser'

const lineParser: parser = createRecursiveParser('\n', 20)

export interface IJsonMessageParser {
  run: (chunk: string) => void
}

export class JsonMessageParser implements IJsonMessageParser {
  private _chunkBuffer: string
  private _callback: chunkHandler

  constructor (messageCallback: (obj: Object) => void) {
    this._chunkBuffer = ''
    this._callback = (data: string, depth: number): boolean => {
      try {
        messageCallback(JSON.parse(data))
      } catch (e) {
        return false
      }
      return true
    }
  }

  public run (chunk: string): void {
    let chunkBuffer = this._chunkBuffer + chunk
    while (true) {
      const result: IParseContext = lineParser(chunkBuffer, this._callback)
      if (result.code === PARSE_STATUS.DONE) {
        this._chunkBuffer = result.chunk
        break
      } else if (result.code === PARSE_STATUS.ABEND) {
        throw new Error('JSON error: ' + result.chunk)
      }
      chunkBuffer = result.chunk
    }
  }
}
