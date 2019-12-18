import $ from 'jquery'
import {
  Keyring,
  supportsETH,
  supportsBTC,
  supportsCosmos,
  supportsDebugLink,
  bip32ToAddressNList,
  Events
} from '@shapeshiftoss/hdwallet-core'

import { isKeepKey } from '@shapeshiftoss/hdwallet-keepkey'
import { isPortis } from '@shapeshiftoss/hdwallet-portis'

import { WebUSBKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-webusb'
import { TCPKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-tcp'
import { TrezorAdapter } from '@shapeshiftoss/hdwallet-trezor-connect'
import { WebUSBLedgerAdapter } from '@shapeshiftoss/hdwallet-ledger-webusb'
import { PortisAdapter } from '@shapeshiftoss/hdwallet-portis'

import { Ecc } from '@fioprotocol/fiojs'
import { fromBase58 } from 'bip32'

const keyring = new Keyring()
const keepkeyAdapter = WebUSBKeepKeyAdapter.useKeyring(keyring)

window['keyring'] = keyring

let wallet
window['wallet'] = wallet

const $keepkey = $('#keepkey')
const $loader = $('#wait-device')

$keepkey.on('click', async (e) => {
  e.preventDefault()
  wallet = await keepkeyAdapter.pairDevice(undefined, /*tryDebugLink=*/true)
  listen(wallet.transport)
  window['wallet'] = wallet

  if (!wallet) {
    return alert('No wallet')
  }

  try {
    $loader.css('display', 'flex')
    const fioPublicKeys = await wallet.getPublicKeys([
      {
        addressNList: [0x80000000 + 44, 0x80000000 + 235, 0x80000000 + 0, 0, 0],
        curve: "secp256k1",
        showDisplay: true
      }
    ])
    $loader.css('display', 'none')
    const { PublicKey } = Ecc
    const bip = fromBase58(fioPublicKeys[0].xpub)
    const pubkey = PublicKey.fromBuffer(bip.publicKey)
    window.open(`https://giveaway.fio.foundation/?referrer=shapeshift&fpk=${pubkey.toString('FIO')}`)
  } catch (e) {
    console.log(e);
    alert('There was an issue creating FIO address, please write to support')
  }
})

(async () => {
  try {
    await keepkeyAdapter.initialize(undefined, /*tryDebugLink=*/true, /*autoConnect=*/false)
  } catch (e) {
    console.error('Could not initialize KeepKeyAdapter', e)
  }
  wallet = keyring.get()
  window['wallet'] = wallet
})()

window['handlePinDigit'] = function (digit) {
  let input = document.getElementById('#pinInput')
  if (digit === "") {
    input.value = input.value.slice(0, -1);
  } else {
    input.value += digit.toString();
  }
}

window['pinOpen'] = function () {
  document.getElementById('#pinModal').className = 'modale opened'
}

window['pinEntered'] = function () {
  let input = document.getElementById('#pinInput')
  wallet.sendPin(input.value);
  document.getElementById('#pinModal').className = 'modale';
}

window['passphraseOpen'] = function () {
  document.getElementById('#passphraseModal').className = 'modale opened'
}

window['passphraseEntered'] = function () {
  let input = document.getElementById('#passphraseInput')
  wallet.sendPassphrase(input.value);
  document.getElementById('#passphraseModal').className = 'modale';
}

function listen(transport) {
  if (!transport)
    return

  transport.on(Events.PIN_REQUEST, e => {
    window['pinOpen']()
  })

  transport.on(Events.PASSPHRASE_REQUEST, e => {
    window['passphraseOpen']()
  })
}

const $yes = $('#yes')
const $no = $('#no')
const $cancel = $('#cancel')

$yes.on('click', async (e) => {
  e.preventDefault()
  if (!wallet)
    return

  if (!supportsDebugLink(wallet))
    return

  await wallet.pressYes()
})

$no.on('click', async (e) => {
  e.preventDefault()
  if (!wallet)
    return

  if (!supportsDebugLink(wallet))
    return

  await wallet.pressNo()
})

$cancel.on('click', async (e) => {
  e.preventDefault()

  if (!wallet)
    return

  await wallet.cancel()
})
