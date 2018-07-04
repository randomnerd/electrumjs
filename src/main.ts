import { Client } from './client'
import { MockClient } from './mock-client'
import * as v1 from './rpc/electrum-protocol-v1'
import * as v2 from './rpc/electrum-protocol-v2'
import * as v3 from './rpc/electrum-protocol-v3'
import * as v4 from './rpc/electrum-protocol-v4'

export {
  Client, // socket client
  MockClient, // mock (fake) client
  v1, v2, v3, v4 } // electrumx protocol implementations
