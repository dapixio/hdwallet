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
const $keyring = $('#keyring')

$keepkey.on('click', async (e) => {
  e.preventDefault()
  wallet = await keepkeyAdapter.pairDevice(undefined, /*tryDebugLink=*/true)
  listen(wallet.transport)
  window['wallet'] = wallet
  $('#keyring select').val(wallet.transport.getDeviceID())
})

async function deviceConnected(deviceId) {
  let wallet = keyring.get(deviceId)
  if (!$keyring.find(`option[value="${deviceId}"]`).length) {
    $keyring.append(
      $("<option></option>")
        .attr("value", deviceId)
        .text(deviceId + ' - ' + await wallet.getVendor())
    )
  }
}

(async () => {
  try {
    await keepkeyAdapter.initialize(undefined, /*tryDebugLink=*/true, /*autoConnect=*/false)
  } catch (e) {
    console.error('Could not initialize KeepKeyAdapter', e)
  }

  for (const [deviceID, wallet] of Object.entries(keyring.wallets)) {
    await deviceConnected(deviceID)
  }
  $keyring.change(async (e) => {
    if (wallet) {
      await wallet.disconnect()
    }
    let deviceID = $keyring.find(':selected').val() as string
    wallet = keyring.get(deviceID)
    if (wallet) {
      await wallet.transport.connect()
      if (isKeepKey(wallet)) {
        console.log("try connect debuglink")
        await wallet.transport.tryConnectDebugLink()
      }
      await wallet.initialize()
    }
    window['wallet'] = wallet
  })
  wallet = keyring.get()
  window['wallet'] = wallet
  if (wallet) {
    let deviceID = wallet.getDeviceID()
    $keyring.val(deviceID).change()
  }

  keyring.on(['*', '*', Events.CONNECT], async (deviceId) => {
    await deviceConnected(deviceId)
  })

  keyring.on(['*', '*', Events.DISCONNECT], async (deviceId) => {
    $keyring.find(`option[value="${deviceId}"]`).remove()
  })
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

const $appSymbol = $('#appSymbol')
const $fioAddr = $('#fioAddr')

$fioAddr.on('click', async (e) => {
  e.preventDefault()
  if (!wallet) {
    $appSymbol.val("No wallet?");
    return alert('No wallet')
  }
  const fioPublicKeys = await wallet.getPublicKeys([
    {
      addressNList: [0x80000000 + 44, 0x80000000 + 235, 0x80000000 + 0, 0, 0],
      curve: "secp256k1",
      showDisplay: true
    }
  ])

  const { PublicKey } = Ecc
  const bip = fromBase58(fioPublicKeys[0])
  const pubkey = PublicKey.fromBuffer(bip.publicKey)
  console.log(pubkey.toString('FIO'));
  window.open(`https://giveaway.fio.foundation/?referrer=edge&fpk=${pubkey.toString('FIO')}`)
})
