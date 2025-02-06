import net from 'net'
import chalk from 'chalk' // Install with `npm install chalk`

function prettyDateTimeinPacificTimeZone(datetimeString) {
  const dateTimeOptions = {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: true,
    timeZone: "America/Los_Angeles",
    timeZoneName: "short"
  }
  if (!datetimeString) {
    return null
  }
  return new Intl.DateTimeFormat("en-US", dateTimeOptions).format(
    new Date(datetimeString)
  )
}

function getTimestamp() {
  return `[${prettyDateTimeinPacificTimeZone(new Date())}]`
}

function scanPort(target, port) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()
    socket.setTimeout(1000) // Set timeout to 1 second

    socket.on('connect', () => {
      socket.destroy()
      resolve(true) // Port is open
    })

    socket.on('timeout', () => {
      socket.destroy()
      resolve(false) // Port is closed or filtered
    })

    socket.on('error', (err) => {
      socket.destroy()
      resolve(false) // Port is closed or filtered
    })

    socket.connect(port, target)
  })
}

async function scanPorts(target, ports) {
  const results = []
  for (const port of ports) {
    process.stdout.write(`\rscanning port: ${chalk.yellow(port)}`)
    const isOpen = await scanPort(target, port)
    if(isOpen) {
      results.push({ port, isOpen })
    }
  }
  return results
}

// Get command-line arguments
const args = process.argv.slice(2) // remove first two arguments from array
const target = args[0] || '127.0.0.1' // Replace with the target IP or hostname
//const ports = [80, 443, 22, 21, 3306] // Ports to scan
// TCP port range is from 0 to 65535 (2 ^ 16)
const startPort = parseInt(args[1], 10) || 0
const endPort = parseInt(args[2], 10) || (args[2] > startPort ? args[2]: startPort)
const ports = Array.from({ length: endPort - startPort + 1 }, (_, i) => startPort + i)

console.log(chalk.white(`Starting TCP port scan against ${target} at ${chalk.magenta(getTimestamp())}....`))
console.log(chalk.white(`Starting at TCP port: ${startPort} and finishing at TCP port: ${endPort}...`))

scanPorts(target, ports)
  .then(results => {
    const openPorts = results.filter(o => o.isOpen).length;
    const closedPorts = results.filter(o => !o.isOpen).length;

    console.log(`\n=====================\n${chalk.yellow(`Port scan results`)}\n=====================`)
    console.log(`Scanned ${ports.length} ports. ${openPorts} open, ${closedPorts} closed.`)
    results.forEach(result => {
      console.log(`Port ${chalk.yellow(result.port)}: ${result.isOpen ? chalk.green('Open') : chalk.red('Closed')}`)
    })
  })
  .catch(err => console.error('Error:', err))
