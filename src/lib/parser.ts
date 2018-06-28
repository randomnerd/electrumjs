import * as assert from 'assert'

export enum PARSE_STATUS {
    DONE,
    SUSPEND,
    ABEND
}

export interface IParseContext {
  code: PARSE_STATUS
  chunk: string
}

interface IParseOption {
  delimiter: string
  maxDepth: number
}

export type chunk_on_complete = (data: string, depth: number) => boolean
export type parser = (chunk: string, callback: chunk_on_complete) => IParseContext

const recursiveParser = (depth: number, chunk: string, callback: chunk_on_complete, option: IParseOption): IParseContext => {
  if (chunk.length === 0) {
    return { code: PARSE_STATUS.DONE, chunk: chunk }
  }
  if (depth >= option.maxDepth) {
    return { code: PARSE_STATUS.SUSPEND, chunk: chunk }
  }
  const chunkList: Array<string> = chunk.split(option.delimiter)
  if (chunkList.length === 1) {
    return { code: PARSE_STATUS.DONE, chunk: chunk }
  }
  assert(chunkList.length !== 0)
  const completeData: string = chunkList[0]
  const nextChunkList: string = chunkList.slice(1).join(option.delimiter)
  const result: boolean = callback(completeData, depth)
  if (!result) {
    return { code: PARSE_STATUS.ABEND, chunk: chunk }
  }
  return recursiveParser(depth + 1, nextChunkList, callback, option)
}

export const createRecursiveParser = (delimiter: string, maxDepth: number = 10): parser => {
  assert(maxDepth > 0)
  return (chunk: string, callback: chunk_on_complete): IParseContext => recursiveParser(0, chunk, callback, { delimiter, maxDepth })
}
