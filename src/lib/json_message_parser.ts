import { IParseContext, PARSE_STATUS, chunk_on_complete, createRecursiveParser } from './parser'

const lineParser = createRecursiveParser('\n', 20)

export class JsonMessageParser {
  private chunkBuffer: string
  private callback: chunk_on_complete
  constructor (messageCallback: (obj: Object) => void) {
    this.chunkBuffer = ''
    this.callback = (data: string, depth: number): boolean => {
      try {
        messageCallback(JSON.parse(data))
      } catch (e) {
        return false
      }
      return true
    }
  }
  run (chunk: string): void {
    let chunkBuffer = this.chunkBuffer + chunk
    while (true) {
      const result: IParseContext = lineParser(chunkBuffer, this.callback)
      if (result.code === PARSE_STATUS.DONE) {
        this.chunkBuffer = result.chunk
        break
      } else if (result.code === PARSE_STATUS.ABEND) {
        throw new Error('JSON error: ' + result.chunk)
      }
      chunkBuffer = result.chunk
    }
  }
}
