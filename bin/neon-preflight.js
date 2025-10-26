#!/usr/bin/env node
import 'dotenv/config';
import dns from 'node:dns/promises';
import tls from 'node:tls';
import pg from 'pg';

const { Client } = pg;

function assertEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function checkDns(host) {
  const records = await dns.lookup(host, { all: true });
  if (!records.length) {
    throw new Error(`DNS lookup returned no records for ${host}`);
  }
  return records;
}

async function checkTls(host, port = 5432) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host,
        port,
        servername: host,
        rejectUnauthorized: true,
        timeout: 10_000,
      },
      () => {
        const info = {
          protocol: socket.getProtocol(),
          cipher: socket.getCipher(),
          authorized: socket.authorized,
          servername: socket.servername,
        };
        socket.end();
        resolve(info);
      },
    );

    socket.on('error', (err) => {
      socket.destroy();
      reject(err);
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('TLS handshake timed out'));
    });
  });
}

async function checkPg(connectionString) {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: true },
  });

  try {
    await client.connect();
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  const dbUrl = assertEnv('DATABASE_URL');
  const host = dbUrl
    .match(/@([^/'"]+)/)?.[1]
    ?.split(':')?.[0];

  if (!host) {
    throw new Error('Unable to parse host from DATABASE_URL');
  }

  console.log(`Neon host: ${host}`);

  // DNS
  const dnsRecords = await checkDns(host);
  console.log(
    `DNS: OK (${dnsRecords
      .map((r) => `${r.address}${r.family === 6 ? '/AAAA' : '/A'}`)
      .join(', ')})`,
  );

  // TLS
  const tlsInfo = await checkTls(host);
  console.log(
    `TLS: OK (${tlsInfo.protocol} ${tlsInfo.cipher?.name ?? tlsInfo.cipher})`,
  );

  // Postgres connection
  await checkPg(dbUrl);
  console.log('PG connect: OK');
}

main().catch((error) => {
  console.error('Preflight failed:', error.message ?? error);
  process.exitCode = 1;
});
