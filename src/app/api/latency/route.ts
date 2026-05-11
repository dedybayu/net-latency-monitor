import { NextResponse } from 'next/server';
import { InfluxDB } from '@influxdata/influxdb-client';

export const dynamic = 'force-dynamic';

const INFLUX_URL = process.env.INFLUX_URL || 'http://localhost:8086';
const INFLUX_TOKEN = process.env.INFLUX_TOKEN;
const INFLUX_ORG = process.env.INFLUX_ORG;
const INFLUX_BUCKET = process.env.INFLUX_BUCKET;

export async function GET(request: Request) {
    if (!INFLUX_TOKEN || !INFLUX_ORG || !INFLUX_BUCKET) {
        return NextResponse.json({ error: 'InfluxDB configuration missing on server' }, { status: 500 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'historical';
    const hostsParam = url.searchParams.get('hosts');
    
    // Build filter for specific hosts if provided
    const hostFilter = hostsParam 
        ? `|> filter(fn: (r) => ${hostsParam.split(',').map(h => `r.host == "${h.trim()}"`).join(' or ')})`
        : '';

    const influxDB = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN });
    const queryApi = influxDB.getQueryApi(INFLUX_ORG);

    let fluxQuery = '';
    if (type === 'realtime') {
        fluxQuery = `
            from(bucket: "${INFLUX_BUCKET}")
            |> range(start: -15m)
            |> filter(fn: (r) => r._measurement == "network_latency" and r._field == "latency")
            ${hostFilter}
            |> aggregateWindow(every: 5s, fn: mean, createEmpty: true)
            |> yield(name: "mean")
        `;
    } else {
        fluxQuery = `
            from(bucket: "${INFLUX_BUCKET}")
            |> range(start: -7d)
            |> filter(fn: (r) => r._measurement == "network_latency" and r._field == "latency")
            ${hostFilter}
            |> aggregateWindow(every: 5m, fn: mean, createEmpty: true)
            |> yield(name: "mean")
        `;
    }

    try {
        const timeMap = new Map<string, any>();

        await new Promise<void>((resolve, reject) => {
            queryApi.queryRows(fluxQuery, {
                next(row, tableMeta) {
                    const o = tableMeta.toObject(row);
                    const time = o._time;
                    const host = o.host;
                    const value = o._value;

                    if (!timeMap.has(time)) {
                        timeMap.set(time, { time });
                    }
                    timeMap.get(time)[host] = value;
                },
                error(error) {
                    console.error('Error parsing row:', error);
                    reject(error);
                },
                complete() {
                    resolve();
                },
            });
        });

        // Convert Map to array and sort by time
        const results = Array.from(timeMap.values()).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

        return NextResponse.json(results);
    } catch (error: any) {
        console.error('Error querying InfluxDB:', error);
        return NextResponse.json({ error: 'Failed to fetch data', details: error.message }, { status: 500 });
    }
}
