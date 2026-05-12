import { Injectable } from '@nestjs/common';
import { AddressesService } from '../addresses/addresses.service';
import { TransactionsService } from '../transactions/transactions.service';
import { AddressRelationshipsService } from '../address-relationships/address-relationships.service';
import { AlertsService } from '../alerts/alerts.service';
import { IngestTransactionDto } from './dto/ingest-transaction.dto';
import { Chain } from '../../shared/enums/chain.enum';

@Injectable()
export class IngestService {
  constructor(
    private readonly addressesService: AddressesService,
    private readonly transactionsService: TransactionsService,
    private readonly addressRelationshipsService: AddressRelationshipsService,
    private readonly alertsService: AlertsService,
  ) { }

  async processTransaction(dto: IngestTransactionDto): Promise<{ success: boolean; message: string }> {
    const existing = await this.transactionsService.findByTxHashAndChain(dto.txHash, dto.chain);
    if (existing) {
      return {
        success: true,
        message: `Transaction ${dto.txHash} already ingested`,
      };
    }

    // 1. Ensure both addresses exist in database
    await this.addressesService.findOrCreate(dto.fromAddress, dto.chain);
    await this.addressesService.findOrCreate(dto.toAddress, dto.chain);

    // 2. Store the transaction
    const transaction = await this.transactionsService.createTransaction({
      txHash: dto.txHash,
      fromAddress: dto.fromAddress,
      toAddress: dto.toAddress,
      amount: parseFloat(dto.amount),
      timestamp: new Date(dto.timestamp),
      chain: dto.chain,
      blockNumber: dto.blockNumber ? parseInt(dto.blockNumber) : undefined,
      gasPrice: dto.gasPrice ? parseFloat(dto.gasPrice) : undefined,
      gasUsed: dto.gasUsed ? parseInt(dto.gasUsed) : undefined,
    });

    // 3. Update address totals
    await this.addressesService.updateAddressTotals(dto.fromAddress, dto.chain, parseFloat(dto.amount), true);
    await this.addressesService.updateAddressTotals(dto.toAddress, dto.chain, parseFloat(dto.amount), false);

    // 4. Increment tx counts
    await this.addressesService.incrementTxCount(dto.fromAddress, dto.chain);
    await this.addressesService.incrementTxCount(dto.toAddress, dto.chain);

    // 5. Create address relationship
    await this.addressRelationshipsService.createRelationship({
      fromAddress: dto.fromAddress,
      toAddress: dto.toAddress,
      txHash: dto.txHash,
      amount: parseFloat(dto.amount),
      hopDistance: 1,
      chain: dto.chain,
    });

    // 6. Check for alerts
    await this.alertsService.checkAndTriggerAlerts({
      fromAddress: dto.fromAddress,
      toAddress: dto.toAddress,
      txHash: dto.txHash,
      amount: dto.amount,
      chain: dto.chain,
      timestamp: dto.timestamp,
    });

    return {
      success: true,
      message: `Transaction ${dto.txHash} ingested successfully`,
    };
  }
}
