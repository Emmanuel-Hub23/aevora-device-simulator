const readline = require('readline')

const API = process.env.AEVORA_API || 'http://localhost:8080'
const KEY = process.env.AEVORA_DEVICE_KEY || 'aevora-device-key-change-me'
const SIM_EMAIL = process.env.AEVORA_SIM_EMAIL || 'technician@aevora.local'
const SIM_PASSWORD = process.env.AEVORA_SIM_PASSWORD || 'Technician@12345'
const HEARTBEAT_MS = 10000
const DISCOVER_MS = 30000

// device code -> true while the simulated device is "powered on"
const devices = {}

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

// Finds every device registered on the dashboard and starts sending for new ones.
async function discoverDevices() {
  try {
    const loginRes = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: SIM_EMAIL, password: SIM_PASSWORD }),
    })
    if (!loginRes.ok) {
      console.log(`Could not log in to discover devices (${loginRes.status})`)
      return
    }
    const { token } = await loginRes.json()

    const res = await fetch(`${API}/api/devices`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      console.log(`Could not list devices (${res.status})`)
      return
    }

    const list = await res.json()
    for (const d of list) {
      if (!(d.deviceCode in devices)) {
        devices[d.deviceCode] = true
        console.log(`>> Found device ${d.deviceCode} (${d.name}). Now sending heartbeats.`)
        beat(d.deviceCode)
      }
    }
  } catch (err) {
    console.log(`Device discovery failed: ${err.message}`)
  }
}

function tick() {
  for (const [code, sending] of Object.entries(devices)) {
    if (sending) beat(code)
  }
}

discoverDevices()
setInterval(discoverDevices, DISCOVER_MS)
setInterval(tick, HEARTBEAT_MS)

console.log('\nCommands:  stop CODE  |  start CODE  |  status  |  quit')
console.log('Example:   stop PWR-001')
console.log('New devices registered on the dashboard are picked up automatically.\n')

const rl = readline.createInterface({ input: process.stdin })
rl.on('line', (line) => {
  const match = line.trim().match(/^(\w+)\s*(.*)$/)
  if (!match) return
  const cmd = match[1].toLowerCase()
  const code = match[2].trim().toUpperCase()

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
    console.log('Unknown command or device. Use: stop CODE | start CODE | status | quit')
  }
})