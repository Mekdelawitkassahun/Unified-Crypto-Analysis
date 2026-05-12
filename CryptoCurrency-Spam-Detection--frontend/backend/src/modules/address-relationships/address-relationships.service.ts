import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GraphDataDto, GraphEdgeDto, GraphNodeDto } from '../addresses/dto/graph-data.dto';
import { Chain } from '../../shared/enums/chain.enum';
import { AddressRelationshipsRepository } from './address-relationships.repository';
import { getBlockchainEngineTimeoutMs } from '../../shared/utils/blockchain-engine-timeout.util';

@Injectable()
export class AddressRelationshipsService {
  private readonly logger = new Logger(AddressRelationshipsService.name);
  private readonly blockchainApiUrl: string;
  private readonly engineTimeoutMs: number;

  constructor(
    private readonly addressRelationshipsRepository: AddressRelationshipsRepository,
    private readonly configService: ConfigService,
  ) {
    this.blockchainApiUrl = this.configService.get<string>('BLOCKCHAIN_API_URL', 'http://127.0.0.1:8055');
    this.engineTimeoutMs = getBlockchainEngineTimeoutMs(this.configService);
  }

  async createRelationship(data: {
    fromAddress: string;
    toAddress: string;
    txHash: string;
    amount: number;
    hopDistance: number;
    chain: Chain;
  }): Promise<void> {
    await this.addressRelationshipsRepository.create(data);
  }

  async getGraphData(address: string, chain: Chain, depth: number): Promise<GraphDataDto> {
    try {
      // Try to get graph data from the blockchain engine
      const response = await axios.get(`${this.blockchainApiUrl}/graph`, {
        params: { address, chain: chain.toLowerCase(), limit: 50 },
        timeout: this.engineTimeoutMs,
      });

      if (response.data && response.data.nodes && response.data.edges) {
        const engineData = response.data;
        return {
          nodes: engineData.nodes.map((n: any) => ({
            id: n.id.toLowerCase(),
            address: n.id,
            riskScore: n.score || 0,
            isFlagged: n.risk === 'high_risk',
            label: n.id === address ? 'Root' : n.risk,
            entityLabel: n.entity_label,
          })),
          edges: engineData.edges.map((e: any) => ({
            source: e.source.toLowerCase(),
            target: e.target.toLowerCase(),
            txHash: e.tx_hash,
            amount: e.value,
            timestamp: new Date(e.timestamp),
          })),
        };
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch graph from blockchain engine: ${(error as Error).message}. Falling back to local DB.`);
    }

    const relationships = await this.addressRelationshipsRepository.findByAddressWithDepth(address, chain, depth);
    const nodesMap = new Map<string, GraphNodeDto>();
    const edges: GraphEdgeDto[] = [];

    nodesMap.set(address.toLowerCase(), {
      id: address.toLowerCase(),
      address,
      riskScore: 0,
      isFlagged: false,
      label: 'Root',
    });

    for (const rel of relationships) {
      const fromLower = rel.fromAddress.toLowerCase();
      const toLower = rel.toAddress.toLowerCase();

      if (!nodesMap.has(fromLower)) {
        nodesMap.set(fromLower, {
          id: fromLower,
          address: rel.fromAddress,
          riskScore: 0,
          isFlagged: false,
          label: `Hop ${rel.hopDistance}`,
        });
      }
      if (!nodesMap.has(toLower)) {
        nodesMap.set(toLower, {
          id: toLower,
          address: rel.toAddress,
          riskScore: 0,
          isFlagged: false,
          label: `Hop ${rel.hopDistance}`,
        });
      }
      edges.push({
        source: fromLower,
        target: toLower,
        txHash: rel.txHash,
        amount: rel.amount,
        timestamp: rel.createdAt,
      });
    }

    return { nodes: Array.from(nodesMap.values()), edges };
  }

  async findNeighbors(address: string, chain: Chain, hopDistance: number): Promise<string[]> {
    const relationships = await this.addressRelationshipsRepository.findByAddressAndHopDistance(address, chain, hopDistance);
    const neighbors = new Set<string>();
    for (const rel of relationships) {
      if (rel.fromAddress.toLowerCase() === address.toLowerCase()) {
        neighbors.add(rel.toAddress);
      } else {
        neighbors.add(rel.fromAddress);
      }
    }
    return Array.from(neighbors);
  }
}
