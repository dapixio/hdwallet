import { BIP32Path, Coin } from './wallet'

export interface FIOGetAddress {
  addressNList: BIP32Path,
  coin: Coin,
  showDisplay?: boolean,
  scriptType?: FIOInputScriptType,
  /** Optional. Required for showDisplay == true. */
  address?: string,
}

export enum FIOInputScriptType {
  SpendAddress = 'p2pkh',
  SpendMultisig = 'p2sh',
  External = 'external',
  SpendWitness = 'p2wpkh',
  SpendP2SHWitness = 'p2sh-p2wpkh',
}

export enum FIOOutputScriptType {
  PayToAddress = 'p2pkh',
  PayToMultisig = 'p2sh',
  PayToWitness = 'p2wpkh',
  PayToP2SHWitness = 'p2sh-p2wpkh'
}

export interface FIOVerifyMessage {
  address: string,
  message: string,
  signature: string,
  coin: Coin
}

export interface FIOWallet {
  _supportsFIO: boolean

  fioGetAddress (msg: FIOGetAddress): Promise<string>
  fioVerifyMessage (msg: FIOVerifyMessage): Promise<boolean>
}
