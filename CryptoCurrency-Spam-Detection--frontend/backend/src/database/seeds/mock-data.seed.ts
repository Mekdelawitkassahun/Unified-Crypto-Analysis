import { DataSource } from 'typeorm';
import { Address } from '../../modules/addresses/entities/address.entity';
import { Transaction } from '../../modules/transactions/entities/transaction.entity';
import { FlaggedAddress } from '../../modules/flagged-addresses/entities/flagged-address.entity';
import { Watchlist } from '../../modules/watchlist/entities/watchlist.entity';
import { Chain } from '../../shared/enums/chain.enum';

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'crypto_intelligence',
    entities: [Address, Transaction, FlaggedAddress, Watchlist],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('Database connected');

  // Seed flagged addresses
  const flaggedRepo = dataSource.getRepository(FlaggedAddress);
  const flaggedAddresses = [
    {
      address: '0x722122df12d4e14e13ac3b6895a86e84145b6967',
      chain: Chain.ETHEREUM,
      reason: 'Tornado Cash mixer contract',
      source: 'OFAC Sanctions List',
      hopDistance: 1,
    },
    {
      address: '0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936',
      chain: Chain.ETHEREUM,
      reason: 'Tornado Cash mixer contract',
      source: 'OFAC Sanctions List',
      hopDistance: 1,
    },
    {
      address: '0xbadactor1234567890abcdef1234567890abcdef12',
      chain: Chain.ETHEREUM,
      reason: 'Known phishing scam address',
      source: 'Community Report',
      hopDistance: 1,
    },
    {
      address: '0xstolenfunds4567890abcdef1234567890abcdef34',
      chain: Chain.ETHEREUM,
      reason: 'Funds from known hack',
      source: 'Chainalysis',
      hopDistance: 1,
    },
  ];

  for (const flagged of flaggedAddresses) {
    const exists = await flaggedRepo.findOne({ where: { address: flagged.address, chain: flagged.chain } });
    if (!exists) {
      await flaggedRepo.save(flaggedRepo.create(flagged));
      console.log(`Seeded flagged address: ${flagged.address}`);
    }
  }

  // Seed sample addresses
  const addressRepo = dataSource.getRepository(Address);
  const sampleAddresses = [
    {
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      chain: Chain.ETHEREUM,
      balance: 150.5,
      totalReceived: 500.25,
      totalSent: 349.75,
      txCount: 42,
      riskScore: 15,
      isFlagged: false,
      firstSeen: new Date('2023-01-15'),
    },
    {
      address: '0x8ba1f109551bD432803012645Hac136c82C3e8C',
      chain: Chain.ETHEREUM,
      balance: 0.05,
      totalReceived: 1000.00,
      totalSent: 999.95,
      txCount: 156,
      riskScore: 75,
      isFlagged: true,
      firstSeen: new Date('2023-06-01'),
    },
    {
      address: '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be',
      chain: Chain.ETHEREUM,
      balance: 50000.00,
      totalReceived: 1000000.00,
      totalSent: 950000.00,
      txCount: 50000,
      riskScore: 10,
      isFlagged: false,
      firstSeen: new Date('2020-01-01'),
    },
  ];

  for (const addr of sampleAddresses) {
    const exists = await addressRepo.findOne({ where: { address: addr.address, chain: addr.chain } });
    if (!exists) {
      await addressRepo.save(addressRepo.create(addr));
      console.log(`Seeded address: ${addr.address}`);
    }
  }

  // Seed sample transactions
  const txRepo = dataSource.getRepository(Transaction);
  const sampleTxs = [
    {
      txHash: '0xabc123def456789012345678901234567890123456789012345678901234abcd',
      fromAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      toAddress: '0x8ba1f109551bD432803012645Hac136c82C3e8C',
      amount: 10.5,
      timestamp: new Date('2024-01-15T10:30:00Z'),
      chain: Chain.ETHEREUM,
      blockNumber: 18500000,
      gasPrice: 25000000000,
      gasUsed: 21000,
    },
    {
      txHash: '0xdef456abc7890123456789012345678901234567890123456789012345678901',
      fromAddress: '0x8ba1f109551bD432803012645Hac136c82C3e8C',
      toAddress: '0x722122df12d4e14e13ac3b6895a86e84145b6967',
      amount: 5.0,
      timestamp: new Date('2024-01-16T14:20:00Z'),
      chain: Chain.ETHEREUM,
      blockNumber: 18500100,
      gasPrice: 30000000000,
      gasUsed: 21000,
    },
    {
      txHash: '0x7890123456789012345678901234567890123456789012345678901234567890',
      fromAddress: '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be',
      toAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      amount: 50.0,
      timestamp: new Date('2024-01-17T09:00:00Z'),
      chain: Chain.ETHEREUM,
      blockNumber: 18500200,
      gasPrice: 20000000000,
      gasUsed: 21000,
    },
  ];

  for (const tx of sampleTxs) {
    const exists = await txRepo.findOne({ where: { txHash: tx.txHash } });
    if (!exists) {
      await txRepo.save(txRepo.create(tx));
      console.log(`Seeded transaction: ${tx.txHash}`);
    }
  }

  // Seed watchlist
  const watchlistRepo = dataSource.getRepository(Watchlist);
  const watchlistItems = [
    {
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      chain: Chain.ETHEREUM,
      alertRules: {
        minAmount: 1,
        flaggedInteraction: true,
        velocityThreshold: 100,
        notifyOnNewTx: true,
      },
    },
  ];

  for (const item of watchlistItems) {
    const exists = await watchlistRepo.findOne({ where: { address: item.address, chain: item.chain } });
    if (!exists) {
      await watchlistRepo.save(watchlistRepo.create(item));
      console.log(`Seeded watchlist: ${item.address}`);
    }
  }

  console.log('Seeding completed!');
  await dataSource.destroy();
}

seed().catch(console.error);
