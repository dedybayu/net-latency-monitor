require('dotenv').config();
const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const ping = require('ping');

const INFLUX_URL = process.env.INFLUX_URL || 'http://localhost:8086';
const INFLUX_TOKEN = process.env.INFLUX_TOKEN;
const INFLUX_ORG = process.env.INFLUX_ORG;
const INFLUX_BUCKET = process.env.INFLUX_BUCKET;

if (!INFLUX_TOKEN || !INFLUX_ORG || !INFLUX_BUCKET) {
    console.error('Missing required InfluxDB environment variables. Check .env file.');
    process.exit(1);
}

const influxDB = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN });
// Using 'ms' precision to be consistent with Javascript Date
const writeApi = influxDB.getWriteApi(INFLUX_ORG, INFLUX_BUCKET, 'ms');

const TARGETS = ['192.168.12.1', '172.16.20.1'];
const INTERVAL_MS = 5000;

async function pingAndSave() {
    for (const host of TARGETS) {
        try {
            const res = await ping.promise.probe(host, {
                timeout: 2, // timeout in seconds
            });

            if (res.alive) {
                const latency = parseFloat(res.time);
                if (!isNaN(latency)) {
                    const point = new Point('network_latency')
                        .tag('host', host)
                        .floatField('latency', latency);
                    
                    writeApi.writePoint(point);
                    console.log(`[${new Date().toISOString()}] Ping ${host} successful: ${latency} ms`);
                } else {
                    console.log(`[${new Date().toISOString()}] Ping ${host} alive but time unknown.`);
                }
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
