[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)
[![TypeScript](https://badges.frapsoft.com/typescript/love/typescript-200x44.png?v=101)](https://github.com/ellerbrock/typescript-badges/)

![stability-wip](https://img.shields.io/badge/stability-work_in_progress-lightgrey.svg)

# electrumjs

Electrum Protocol Client for NodeJS

```
npm i electrumjs
```

## IMPORTANT

Note that this is a work in progress and it is not ready for production whatsoever. The package has not even been published to NPM yet. Proceed at your own risk.

## About Electrum

https://electrum.org/

Electrum is widely used lightweight bitcoin wallet service. The project maintains a client and a server.

This library provides a simple interface for a connection with an [ElectrumX server](https://github.com/kyuupichan/electrumx/).

> [Check the Electrum protocol documentation](https://electrumx.readthedocs.io/en/latest/protocol.html)

## Features

* Implements JSON-RPC 2.0 over TCP / TLS
* Supports subscriptions and notifications
* High performance
* Easy to use high level interface

## To do

- [ ] Batch requests
- [ ] Websocket support
- [ ] Complete set of unit and integration tests
- [ ] Split into a JSON-RPC Web/Socket module and the electrumx client module

## Usage

```
const electrumclient = require('electrum-client')
const Client = electrumclient.Client

// version control interface
const ElectrumProtocol = electrumclient.v1.ElectrumProtocol

const proc = async (ecl) => {
    const balance = await ecl.blockchain_address_getBalance("12c6DSiU4Rq3P4ZxziKxzrL5LmMBrzjrJX")
    console.log(balance)
    const unspent = await ecl.blockchain_address_listunspent("12c6DSiU4Rq3P4ZxziKxzrL5LmMBrzjrJX")
    console.log(unspent)

    const tx1 = await ecl.blockchain_transaction_get("f91d0a8a78462bc59398f2c5d7a84fcff491c26ba54c4833478b202796c8aafd")
    console.log(tx1)
}

const main = async () => {
    // autogenerate client name
    const myname = [ElectrumProtocol.libname, ElectrumProtocol.hash].join('-')
    console.log(myname)

    // initialize
    const ecl = new ElectrumProtocol(new Client(995, 'btc.smsys.me', 'tls'))

    // wait a connection
    await ecl.client.connect()

    try{
        // negotiation protocol
        const res = await ecl.server_version(myname)
        console.log(res)
    }catch(e){
        // negotiation error
        await ecl.client.close()
        console.log(e)
        return;
    }

    try{
        await proc(ecl)
    }catch(e){
        console.log(e)
    }
    await ecl.client.close()
}
main().catch(console.log)
```
