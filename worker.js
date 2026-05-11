require('dotenv').config();
const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const ping = require('ping');
const tcpp = require('tcp-ping');

const INFLUX_URL = process.env.INFLUX_URL || 'http://localhost:8086';
const INFLUX_TOKEN = process.env.INFLUX_TOKEN;
const INFLUX_ORG = process.env.INFLUX_ORG;
const INFLUX_BUCKET = process.env.INFLUX_BUCKET;

const PING_TARGETS = process.env.PING_TARGETS || '192.168.12.1,10.10.168.1';
const TARGETS = PING_TARGETS.split(',').map(t => t.trim()).filter(Boolean);

if (!INFLUX_TOKEN || !INFLUX_ORG || !INFLUX_BUCKET) {
    console.error('Missing required InfluxDB environment variables. Check .env file.');
    process.exit(1);
}

if (TARGETS.length === 0) {
    console.error('No ping targets defined in PING_TARGETS environment variable.');
    process.exit(1);
}

const influxDB = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN });
// Using 'ms' precision to be consistent with Javascript Date
const writeApi = influxDB.getWriteApi(INFLUX_ORG, INFLUX_BUCKET, 'ms');

const INTERVAL_MS = 5000;

async function pingAndSave() {
    for (const host of TARGETS) {
        try {
            let latency = null;
            let alive = false;

            if (host.includes(':')) {
                // TCP Ping for host:port
                const [address, portStr] = host.split(':');
                const port = parseInt(portStr);
                
                if (isNaN(port)) {
                    console.error(`[${new Date().toISOString()}] Invalid port for target: ${host}`);
                    continue;
                }

                const result = await new Promise((resolve) => {
                    tcpp.ping({ address, port, attempts: 1, timeout: 2000 }, (err, data) => {
                        if (err || !data || isNaN(data.avg)) {
                            resolve({ alive: false, latency: null });
                        } else {
                            resolve({ alive: true, latency: data.avg });
                        }
                    });
                });
                
                alive = result.alive;
                latency = result.latency;
            } else {
                // Standard ICMP Ping
                const res = await ping.promise.probe(host, {
                    timeout: 2, // timeout in seconds
                });
                alive = res.alive;
                latency = parseFloat(res.time);
            }

            if (alive && latency !== null && !isNaN(latency)) {
                const point = new Point('network_latency')
                    .tag('host', host)
                    .floatField('latency', latency);
                
                writeApi.writePoint(point);
                console.log(`[${new Date().toISOString()}] Ping ${host} successful: ${latency.toFixed(2)} ms`);
            } else if (alive) {
                console.log(`[${new Date().toISOString()}] Ping ${host} alive but time unknown.`);
            } else {
                console.log(`[${new Date().toISOString()}] Ping ${host} failed.`);
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error pinging ${host}:`, error.message);
        }
    }

    try {
        await writeApi.flush();
    } catch (e) {
        console.error('Error flushing data to InfluxDB:', e);
    }
}

console.log(`Starting network latency monitor worker...`);
console.log(`Targets: ${TARGETS.join(', ')}`);
console.log(`Interval: ${INTERVAL_MS / 1000}s`);

// Run immediately once, then set interval
pingAndSave();
setInterval(pingAndSave, INTERVAL_MS);

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('Closing InfluxDB write API...');
    try {
        await writeApi.close();
        console.log('Closed.');
        process.exit(0);
    } catch (e) {
        console.error('Error closing InfluxDB write API:', e);
        process.exit(1);
    }
});
