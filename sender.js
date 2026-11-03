const readline = require('readline')

const API = process.env.AEVORA_API || 'http://localhost:8080'
const KEY = process.env.AEVORA_DEVICE_KEY || 'aevora-device-key-change-me'
const INTERVAL_MS = 10000

// true = this device is currently sending heartbeats
const devices = {
  'CAM-001': true,
  'CAM-002': true,
  'NVR-001': true,
  'NET-001': true,
  'PWR-001': true,
}

async function beat(code) {
  const time = new Date().toLocaleTimeString()
  try {
    const res = await fetch(`${API}/api/monitoring/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device-Key': KEY },
      body: JSON.stringify({ deviceCode: code }),
    })
    console.log(`${time}  ${code}  ${res.ok ? 'heartbeat sent' : 'FAILED (' + res.status + ')'}`)
  } catch (err) {
    console.log(`${time}  ${code}  cannot reach server: ${err.message}`)
  }
}

function tick() {
  for (const [code, sending] of Object.entries(devices)) {
    if (sending) beat(code)
  }
}

tick()
setInterval(tick, INTERVAL_MS)

console.log('\nCommands:  stop CODE  |  start CODE  |  status  |  quit')
console.log('Example:   stop PWR-001\n')

const rl = readline.createInterface({ input: process.stdin })
rl.on('line', (line) => {
  const [cmd, rawCode] = line.trim().split(/\s+/)
  const code = (rawCode || '').toUpperCase()
  if (cmd === 'stop' && code in devices) {
    devices[code] = false
    console.log(`>> ${code} stopped. It will go Warning, Degraded, then Offline.`)
  } else if (cmd === 'start' && code in devices) {
    devices[code] = true
    console.log(`>> ${code} started.`)
    beat(code)
  } else if (cmd === 'status') {
    console.log(devices)
  } else if (cmd === 'quit') {
    process.exit(0)
  } else {
    console.log('Unknown command. Use: stop CODE | start CODE | status | quit')
  }
})