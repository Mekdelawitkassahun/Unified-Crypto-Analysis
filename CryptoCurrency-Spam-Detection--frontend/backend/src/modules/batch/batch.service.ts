import { Injectable, BadRequestException } from '@nestjs/common';
import * as Papa from 'papaparse';
import { AddressesService } from '../addresses/addresses.service';
import { BatchCheckDto } from './dto/batch-check.dto';
import { AddressSummaryDto } from '../addresses/dto/address-summary.dto';
import { Chain } from '../../shared/enums/chain.enum';

@Injectable()
export class BatchService {
  constructor(private readonly addressesService: AddressesService) { }

  async checkAddresses(dto: BatchCheckDto): Promise<AddressSummaryDto[]> {
    const results: AddressSummaryDto[] = [];

    // Process in chunks of 10 to avoid overwhelming the system
    const chunkSize = 10;
    for (let i = 0; i < dto.addresses.length; i += chunkSize) {
      const chunk = dto.addresses.slice(i, i + chunkSize);
      const chunkPromises = chunk.map((address) =>
        this.addressesService.getAddressSummary(address, dto.chain).catch((error) => ({
          address,
          chain: dto.chain,
          balance: 0,
          totalReceived: 0,
          totalSent: 0,
          txCount: 0,
          riskScore: 0,
          riskFactors: [`Error: ${error.message}`],
          isFlagged: false,
          firstSeen: undefined,
          lastChecked: new Date(),
        })),
      );

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return results;
  }

  async analyzeCsv(file: Express.Multer.File): Promise<{ results: any[] }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const csvData = file.buffer.toString('utf8');
    const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });

    if (parsed.errors.length > 0) {
      throw new BadRequestException('Failed to parse CSV');
    }

    const addresses = (parsed.data as any[])
      .map((row) => row.address || row.Address)
      .filter((addr) => !!addr)
      .slice(0, 500);

    if (addresses.length === 0) {
      throw new BadRequestException('No addresses found in CSV');
    }

    // Default to Ethereum if not specified in CSV
    const results = await this.checkAddresses({
      addresses,
      chain: Chain.ETHEREUM,
    });

    return {
      results: results.map((r) => ({
        ...r,
        status: r.riskScore > 50 ? 'suspicious' : 'safe',
        transactionCount: r.txCount,
      })),
    };
  }
}
