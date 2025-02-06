import net from 'net'
import chalk from 'chalk' // Install with `npm install chalk`
import ping from 'ping'
import dns from 'dns/promises'
import fs from 'fs'

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
    socket.setTimeout(500) // Set timeout to 1 second

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

async function scanPorts(target, portsToScan) {
  const results = []
  for (const port of portsToScan.sort(p => p.protocol)) {
  //portsToScan.forEach(async port => {
    process.stdout.write(`\rscanning port: ${chalk.yellow(port.port)}`)
    const isOpen = await scanPort(target, port.port)
    results.push({ port, isOpen })
  }
  return results
}

async function scanICMP(target) {
  const ip = await resolveIP(target);
  const displayTarget = ip ? `${target} (${ip})` : target; // Show IP if resolved

  try {
    const res = await ping.promise.probe(ip || target, { timeout: 2 })
    if (res.alive) {
      console.log(chalk.green(`Target (${displayTarget}) is reachable via ICMP.`))
    } else {
      console.log(chalk.red(`Target (${displayTarget}) is NOT reachable via ICMP.`))
    }
  } catch (error) {
    console.error(`${chalk.red('Error scanning ICMP')}:`, error);
  }
}

async function resolveIP(target) {
  try {
    const addresses = await dns.lookup(target);
    return addresses.address; // Returns the resolved IP
  } catch (error) {
    return null; // If resolution fails, return null
  }
}

// Get command-line arguments
const args = process.argv.slice(2) // remove first two arguments from array
const target = args[0] || '127.0.0.1' // Replace with the target IP or hostname
//const ports = [80, 443, 22, 21, 3306] // Ports to scan
// TCP port range is from 0 to 65535 (2 ^ 16)
const startPort = parseInt(args[1], 10) || 0
const endPort = parseInt(args[2], 10) || (args[2] > startPort ? args[2]: startPort)
let portsData = {}

if (args.length < 2) {
  console.log(chalk.yellow("No port range provided, using predefined common ports."));
  portsData = JSON.parse(fs.readFileSync('ports.json', 'utf8'));
} else {
  portsData.commonPorts = Array.from({ length: endPort - startPort + 1 }, (_, i) => ({
    port: startPort + i,
    protocol: "Unknown", // Since we don't have protocol details for ranges
    description: "Scanned Port"
  }));
}
await scanICMP(target)

console.log(chalk.white(`Starting TCP port scan against ${target} at ${chalk.magenta(getTimestamp())}....`))
console.log(chalk.white(`Starting at TCP port: ${startPort} and finishing at TCP port: ${endPort}...`))


/*portsData.commonPorts.forEach(port => {
  console.log(`port #: ${port.port}`)
})*/

scanPorts(target, portsData.commonPorts)
  .then(results => {
    const openPorts = results.filter(o => o.isOpen).length;
    const closedPorts = results.filter(o => !o.isOpen).length;

    console.log(`\n=====================\n${chalk.yellow(`Port scan results`)}\n=====================`)
    console.log(`Scanned ${portsData.commonPorts.length} ports. ${openPorts} open, ${closedPorts} closed.`)
    results.forEach(result => {
      // only display the open ports
      if(result.isOpen) {
        console.log(`Port ${chalk.yellow(result.port.port)} "${result.port.protocol}" ${chalk.green('Open')}`)
      }
    })
  })
  .catch(err => console.error('Error:', err))


//console.log(portsData.ports);