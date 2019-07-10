import assert from 'assert'

export enum PARSE_STATUS {
  DONE,
  SUSPEND,
  ABEND
}

export interface IParseContext {
  code: PARSE_STATUS
  chunk: string
}

interface IParseOptions {
  delimiter: string
  maxDepth: number
}

export type chunkHandler = (data: string, depth: number) => boolean
export type parser = (chunk: string, callback: chunkHandler) => IParseContext

const recursiveParser = (depth: number, chunk: string, callback: chunkHandler, options: IParseOptions): IParseContext => {
  if (chunk.length === 0) return { code: PARSE_STATUS.DONE, chunk: chunk } // if chunk is empty - done
  if (depth >= options.maxDepth) return { code: PARSE_STATUS.SUSPEND, chunk: chunk } // if depth is equal or higher than max depth - suspend

  const chunks: Array<string> = chunk.split(options.delimiter) // split chunk by delimiter
  if (chunks.length === 1) return { code: PARSE_STATUS.DONE, chunk: chunk } // if chunk list only contains one item - done

  assert(chunks.length !== 0) // ensure that the chunk list contains items

  const currentChunk: string = chunks[0] // get current chunk
  const remainingChunks: string = chunks.slice(1).join(options.delimiter) // obtain remaining chunks
  const result: boolean = callback(currentChunk, depth) // run callback and store the result

  if (!result) return { code: PARSE_STATUS.ABEND, chunk } // if the result is falsy - abend

  return recursiveParser(depth + 1, remainingChunks, callback, options) // recursive call
}

export const createRecursiveParser = (delimiter: string, maxDepth: number = 10): parser => {
  assert(maxDepth > 0)
  return (chunk: string, callback: chunkHandler): IParseContext => recursiveParser(0, chunk, callback, { delimiter, maxDepth })
}
