import {
  FIOWallet,
  FIOGetAddress,
  FIOVerifyMessage,
  FIOInputScriptType,
  arrayify,
  Event,
  Coin,
  Events,
  LONG_TIMEOUT,
 } from '@shapeshiftoss/hdwallet-core'

import { KeepKeyTransport } from './transport'

import {
  MessageType,
  Address,
  GetAddress,
  VerifyMessage,
  Success,
} from '@keepkey/device-protocol/lib/messages_pb'

import { InputScriptType } from "@keepkey/device-protocol/lib/types_pb";
import { toUTF8Array } from "./utils";

const supportedCoins = [
  'Fio',
  'Testnet',
]

function translateInputScriptType (scriptType: FIOInputScriptType): any {
  switch (scriptType) {
    case FIOInputScriptType.SpendAddress:
      return InputScriptType.SPENDADDRESS
    case FIOInputScriptType.SpendMultisig:
      return InputScriptType.SPENDMULTISIG
    case FIOInputScriptType.SpendP2SHWitness:
      return InputScriptType.SPENDP2SHWITNESS
    case FIOInputScriptType.SpendWitness:
      return InputScriptType.SPENDWITNESS
  }
  throw new Error('unhandled InputSriptType enum: ' + scriptType)
}

async function ensureCoinSupport(wallet: FIOWallet, coin: Coin): Promise<void> {
  if (!supportedCoins.includes(coin))
    throw new Error(`'${coin}' not yet supported in HDWalletKeepKey`)
}

export async function fioGetAddress (wallet: FIOWallet, transport: KeepKeyTransport, msg: FIOGetAddress): Promise<string> {
  await ensureCoinSupport(wallet, msg.coin)

  const addr = new GetAddress()
  addr.setAddressNList(msg.addressNList)
  addr.setCoinName(msg.coin)
  addr.setShowDisplay(msg.showDisplay || false)
  addr.setScriptType(translateInputScriptType(msg.scriptType || FIOInputScriptType.SpendAddress))

  const response = await transport.call(MessageType.MESSAGETYPE_GETADDRESS, addr, LONG_TIMEOUT) as Event

  if(response.message_type === Events.FAILURE) throw response
  if(response.message_type === Events.CANCEL) throw response

  const fioAddress = response.proto as Address
  return fioAddress.getAddress()
}

export async function fioVerifyMessage (wallet: FIOWallet, transport: KeepKeyTransport, msg: FIOVerifyMessage): Promise<boolean> {
  await ensureCoinSupport(wallet, msg.coin)
  const verify = new VerifyMessage()
  verify.setAddress(msg.address)
  verify.setSignature(arrayify('0x' + msg.signature))
  verify.setMessage(toUTF8Array(msg.message))
  verify.setCoinName(msg.coin)
  let event = await transport.call(MessageType.MESSAGETYPE_VERIFYMESSAGE, verify)
  if (event.message_enum === MessageType.MESSAGETYPE_FAILURE) {
    return false
  }
  const success = event.proto as Success
  return success.getMessage() === "Message verified"
}
