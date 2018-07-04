const { Client } = require('./dist/main')
const { ElectrumProtocol } = require('./dist/rpc/electrum-protocol-v1')

/*
const run = async () => {
  const c = new Client('testnet.hsmiths.com', 53012)
  await c.connect()
  console.log(c)
}
*/

const getAllMethods = (obj) => {
  let props = []

  do {
    const l = Object.getOwnPropertyNames(obj)
      .concat(Object.getOwnPropertySymbols(obj).map(s => s.toString()))
      .sort()
      .filter((p, i, arr) =>
        typeof obj[p] === 'function' && // only the methods
               p !== 'constructor' && // not the constructor
               (i === 0 || p !== arr[i - 1]) && // not overriding in this prototype
               props.indexOf(p) === -1 // not overridden in a child
      )
    props = props.concat(l)
  }
  while (
    (obj = Object.getPrototypeOf(obj)) && // walk-up the prototype chain
      Object.getPrototypeOf(obj) // not the the Object prototype methods (hasOwnProperty, etc...)
  )

  return props
}

const run2 = async () => {
  const c = new Client('testnet.hsmiths.com', 53012)
  const e = new ElectrumProtocol(c)
  console.log(e.client._connection)
  c._whenConnectEventLOL = async () => {
    console.log('connected???1')
    console.log(response)
  }
  await e.client.connect()
  const response = await e.server_banner()
  /*
  // console.log(e.client._connection)
  console.log('START')
  console.log(getAllMethods(e))
  console.log('Awaiting response...')
  console.log(response)
  console.log('That was it.')
  */
}

run2()
