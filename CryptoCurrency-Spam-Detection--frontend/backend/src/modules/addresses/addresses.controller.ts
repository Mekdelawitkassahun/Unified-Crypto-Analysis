import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import { Chain } from '../../shared/enums/chain.enum';
import { MoralisService } from '../../common/services/moralis.service';
import {
  AddressParamDto,
  ChainQueryDto,
  DepthQueryDto,
  PaginationQueryDto,
  RangeQueryDto,
} from './dto/address-query.dto';

@ApiTags('Addresses')
@Controller('api/v1/address')
export class AddressesController {
  constructor(
    private readonly addressesService: AddressesService,
    private readonly moralisService: MoralisService,
  ) { }

  @Get(':address/summary')
  @ApiOperation({ summary: 'Get address summary from indexed data' })
  @ApiQuery({ name: 'chain', enum: Chain, required: false })
  async getSummary(
    @Param() params: AddressParamDto,
    @Query() query: ChainQueryDto,
  ) {
    const address = params.address;
    const chain = query.chain ?? Chain.ETHEREUM;
    const summary = await this.addressesService.getAddressSummary(address, chain);

    const symbols: Record<string, string> = {
      ethereum: 'ETH',
      bitcoin: 'BTC',
      polygon: 'MATIC',
      arbitrum: 'ETH',
      optimism: 'ETH',
      bsc: 'BNB',
      avalanche: 'AVAX',
      solana: 'SOL',
      sepolia: 'ETH',
      fantom: 'FTM',
      base: 'ETH',
      celo: 'CELO',
      gnosis: 'xDAI',
      cronos: 'CRO',
      moonbeam: 'GLMR',
      metis: 'METIS',
      kava: 'KAVA',
    };

    return {
      totalReceived: Number(summary.totalReceived || 0),
      totalSent: Number(summary.totalSent || 0),
      balance: Number(summary.balance || 0),
      transactionCount: Number(summary.txCount || 0),
      unit: symbols[chain] || chain.toUpperCase(),
      entityLabel: summary.entityLabel ?? 'user wallet',
    };
  }

  @Get(':address/transactions')
  @ApiOperation({ summary: 'Get address transactions from indexed data' })
  @ApiQuery({ name: 'chain', enum: Chain, required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getTransactions(
    @Param() params: AddressParamDto,
    @Query() query: PaginationQueryDto,
  ) {
    const address = params.address;
    const chain = query.chain ?? Chain.ETHEREUM;
    const page = query.page ?? 1;
    const limit = query.limit ?? 1000;
    const offset = (page - 1) * limit;
    const result = await this.addressesService.getAddressTransactions(address, chain, limit, offset);

    return {
      items: result.data.map((tx: any) => ({
        hash: tx.txHash,
        from: tx.fromAddress ?? '',
        to: tx.toAddress ?? '',
        amount: Number(tx.amount ?? 0),
        date: tx.timestamp?.toISOString?.() ?? new Date().toISOString(),
        type: tx.type ?? 'transfer',
      })),
      page,
      limit,
      total: result.total,
    };
  }

  @Get(':address/risk')
  @ApiOperation({ summary: 'Get risk score for address' })
  @ApiQuery({ name: 'chain', enum: Chain, required: false })
  async getRisk(
    @Param() params: AddressParamDto,
    @Query() query: ChainQueryDto,
  ) {
    const address = params.address;
    const chain = query.chain ?? Chain.ETHEREUM;
    const risk = await this.addressesService.getRiskScore(address, chain);
    const level = (risk.level ?? 'LOW').toUpperCase();
    const classification = level === 'LOW' ? 'safe' : level === 'MEDIUM' ? 'suspicious' : 'high risk';
    return {
      score: Number(risk.score ?? 0),
      level,
      classification,
      recommendation: risk.recommendation ?? '',
      factors: (risk.factors ?? []).map((factor, index) => {
        // Map internal factor names to human-readable titles that include category keywords
        const titleMap: Record<string, string> = {
          directly_flagged: 'OFAC Sanctions / Flagged Address',
          one_hop_from_flagged: 'Interaction with Flagged Address',
          two_hops_from_flagged: 'Two Hops from Flagged Address',
          mixer_interaction: 'Mixer (Tornado Cash) Interaction',
          darknet_interaction: 'Darknet Market Interaction',
          exchange_deposit: 'Exchange Deposit Activity',
          high_velocity: 'High Transaction Velocity',
          new_address_high_volume: 'New Address with High Volume',
          // Engine detection labels
          tornado_cash: 'Mixer (Tornado Cash) Usage',
          sanctioned: 'OFAC Sanctions Match',
          ransomware: 'Ransomware Address',
          ransomware_related: 'Ransomware-Related Activity',
          phishing: 'Phishing / Scam Activity',
          scam: 'Phishing / Scam Activity',
          stolen_funds: 'Stolen Funds Detected',
          darknet: 'Darknet Market Activity',
          large_transfer: 'Large Transfer Detected',
          approval: 'Token Approval Risk',
          bridge: 'Bridge / Cross-chain Activity',
          dex_swap: 'DEX Swap Activity',
        };
        const rawTitle = factor.factor ?? '';
        const title = titleMap[rawTitle] ?? rawTitle.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        return {
          id: String(index + 1),
          title,
          severity: factor.points >= 30 ? 'High' : factor.points >= 15 ? 'Medium' : 'Low',
          description: factor.description,
        };
      }),
    };
  }

  @Get(':address/sanctions')
  @ApiOperation({ summary: 'Get sanctions/flagged status for address' })
  @ApiQuery({ name: 'chain', enum: Chain, required: false })
  async getSanctions(
    @Param() params: AddressParamDto,
    @Query() query: ChainQueryDto,
  ) {
    const address = params.address;
    const chain = query.chain ?? Chain.ETHEREUM;
    const flagged = await this.addressesService.checkFlagged(address, chain);
    return {
      sanctioned: Boolean(flagged?.isFlagged),
      reasons: flagged?.reasons ?? [],
      complianceScore: flagged?.isFlagged ? 25 : 95,
      message: flagged?.isFlagged
        ? `Address appears in flagged datasets (${(flagged?.reasons ?? []).join(', ') || 'unknown reason'})`
        : 'No sanctions/watchlist match found in current datasets',
    };
  }

  @Get(':address/screening')
  @ApiOperation({ summary: 'Wallet screening with entity labeling' })
  @ApiQuery({ name: 'chain', enum: Chain, required: false })
  async getScreening(
    @Param() params: AddressParamDto,
    @Query() query: ChainQueryDto,
  ) {
    const address = params.address;
    const chain = query.chain ?? Chain.ETHEREUM;

    const [flagged, txs, engineScreen, isSmartContract] = await Promise.all([
      this.addressesService.checkFlagged(address, chain).catch(() => ({ isFlagged: false, reasons: [] })),
      this.addressesService.getAddressTransactions(address, chain, 200, 0).catch(() => ({ data: [], total: 0, page: 1, limit: 20, totalPages: 1 })),
      this.addressesService.getEngineScreening(address, chain),
      this.addressesService.isSmartContractAddress(address, chain),
    ]);

    const reasons = [...(flagged?.reasons ?? [])];
    if (engineScreen?.matches) {
      for (const m of engineScreen.matches) {
        if (!reasons.includes(m.category)) reasons.push(m.category);
      }
    }

    const source = reasons.length > 0 ? (engineScreen?.matches?.length ? 'blockchain_engine' : 'internal_watchlist') : 'none';
    const interactionTargets = new Map<string, number>();
    for (const tx of txs.data) {
      const cp = tx.fromAddress.toLowerCase() === address.toLowerCase() ? tx.toAddress.toLowerCase() : tx.fromAddress.toLowerCase();
      interactionTargets.set(cp, (interactionTargets.get(cp) ?? 0) + 1);
    }

    const uniqueTargets = interactionTargets.size;
    const maxTargetRepeats = Math.max(0, ...Array.from(interactionTargets.values()));
    const txPerHour = txs.data.length / 24;
    let entityLabel: string = normalizeEntityLabel(engineScreen?.entity_label);

    // Fallback heuristic if engine didn't provide a specific label or we want to refine
    if (isSmartContract) {
      entityLabel = 'smart contract';
    } else if (entityLabel === 'user_wallet' || !engineScreen) {
      if (reasons.some((r) => /ransom|extort|locky|wannacry/i.test(r))) entityLabel = 'ransomware';
      else if (reasons.some((r) => /mixer|tornado|launder/i.test(r))) entityLabel = 'mixer';
      else if (txPerHour > 25 || maxTargetRepeats > 20) entityLabel = 'bot';
      else if (uniqueTargets > 120) entityLabel = 'exchange';
      else if (maxTargetRepeats > 50) entityLabel = 'smart contract';
    }

    const categories = {
      scam: reasons.filter((x) => /scam/i.test(x)),
      phishing: reasons.filter((x) => /phish/i.test(x)),
      mixer: reasons.filter((x) => /mixer|tornado|launder/i.test(x)),
      ransomware: reasons.filter((x) => /ransom|extort|locky|wannacry/i.test(x)),
      stolenFunds: reasons.filter((x) => /stolen|hack|exploit/i.test(x)),
      darknet: reasons.filter((x) => /darknet|marketplace/i.test(x)),
    };

    return {
      matched: reasons.length > 0,
      reasons,
      source,
      categories,
      entityLabel,
      confidence: reasons.length > 0 ? 0.9 : entityLabel === 'user_wallet' ? 0.55 : 0.72,
      stats: {
        txCount24h: txs.data.length,
        uniqueCounterparties: uniqueTargets,
        repeatedInteractions: maxTargetRepeats,
      },
    };
  }

  @Get(':address/graph')
  @ApiOperation({ summary: 'Get relationship graph for address' })
  @ApiQuery({ name: 'chain', enum: Chain, required: false })
  @ApiQuery({ name: 'depth', required: false })
  async getGraph(
    @Param() params: AddressParamDto,
    @Query() query: DepthQueryDto,
  ) {
    const address = params.address;
    const chain = query.chain ?? Chain.ETHEREUM;
    const depth = query.depth ?? 2;
    const graph = await this.addressesService.getGraphData(address, chain, depth);
    const minAmount = Number(query.minAmount ?? 0);
    const startDate = query.startDate ? new Date(query.startDate) : null;
    const endDate = query.endDate ? new Date(query.endDate) : null;

    const filteredEdges = (graph.edges ?? []).filter((edge: any) => {
      const amount = Number(edge.amount ?? 0);
      if (amount < minAmount) return false;
      const rawTimestamp = edge.timestamp ?? edge.date ?? null;
      if (!rawTimestamp || (!startDate && !endDate)) return true;
      const ts = new Date(rawTimestamp);
      if (Number.isNaN(ts.getTime())) return true;
      if (startDate && ts < startDate) return false;
      if (endDate && ts > endDate) return false;
      return true;
    });

    const activeNodes = new Set<string>([address]);
    filteredEdges.forEach((edge: any) => {
      activeNodes.add(edge.source);
      activeNodes.add(edge.target);
    });

    const filteredNodes = (graph.nodes ?? []).filter((node) => activeNodes.has(node.id));
    return {
      center: address,
      nodes: filteredNodes.map((node) => ({
        id: node.id,
        address: node.address,
        riskScore: Number(node.riskScore ?? 0),
        flagged: Boolean(node.isFlagged),
      })),
      edges: filteredEdges.map((edge, index) => ({
        id: `${edge.source}-${edge.target}-${index}`,
        source: edge.source,
        target: edge.target,
        amount: Number(edge.amount ?? 0),
      })),
    };
  }

  @Get(':address/timeseries')
  @ApiOperation({ summary: 'Get basic address time-series from indexed transactions' })
  @ApiQuery({ name: 'chain', enum: Chain, required: false })
  @ApiQuery({ name: 'range', required: false })
  async getTimeseries(
    @Param() params: AddressParamDto,
    @Query() query: RangeQueryDto,
  ) {
    const address = params.address;
    const chain = query.chain ?? Chain.ETHEREUM;
    const range = query.range ?? '30d';
    const txs = await this.addressesService.getAddressTransactions(address, chain, 200, 0);
    const byDay = new Map<string, { ts: string; txCount: number; inflow: number; outflow: number; balance: number }>();
    let runningBalance = 0;

    for (const tx of [...txs.data].reverse()) {
      const ts = tx.timestamp?.toISOString?.() ?? new Date().toISOString();
      const day = ts.slice(0, 10);
      const current = byDay.get(day) ?? { ts: new Date(`${day}T00:00:00.000Z`).toISOString(), txCount: 0, inflow: 0, outflow: 0, balance: runningBalance };
      const amount = Number(tx.amount ?? 0);
      const incoming = tx.toAddress.toLowerCase() === address.toLowerCase() ? amount : 0;
      const outgoing = tx.fromAddress.toLowerCase() === address.toLowerCase() ? amount : 0;
      runningBalance += incoming - outgoing;
      current.txCount += 1;
      current.inflow += incoming;
      current.outflow += outgoing;
      current.balance = runningBalance;
      byDay.set(day, current);
    }

    const points = Array.from(byDay.values()).sort((a, b) => a.ts.localeCompare(b.ts));
    const counterpartyVolume = new Map<string, number>();
    for (const tx of txs.data) {
      const cp = tx.fromAddress.toLowerCase() === address.toLowerCase() ? tx.toAddress : tx.fromAddress;
      counterpartyVolume.set(cp, (counterpartyVolume.get(cp) ?? 0) + Number(tx.amount ?? 0));
    }
    const topCounterparties = Array.from(counterpartyVolume.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cp, volume]) => ({ address: cp, volume }));

    return { range, points, topCounterparties };
  }

  @Get(':address/dapps')
  @ApiOperation({ summary: 'Get dapp interactions inferred from transactions' })
  @ApiQuery({ name: 'chain', enum: Chain, required: false })
  async getDapps(
    @Param() params: AddressParamDto,
    @Query() query: ChainQueryDto,
  ) {
    const address = params.address;
    const chain = query.chain ?? Chain.ETHEREUM;
    const defiPositions = await this.moralisService.getDefiPositions(address, chain);
    return {
      protocols: defiPositions.map((p, idx) => ({
        id: `${p.protocol_address ?? p.protocol_name ?? 'proto'}-${idx}`,
        name: p.protocol_name ?? 'Unknown Protocol',
        txCount: 0,
        totalVolume: Number(p.total_usd_value ?? 0),
        firstInteraction: undefined,
        lastInteraction: undefined,
        risk: 'Unknown',
      })),
      flaggedInteractions: [],
      source: 'moralis',
    };
  }

  @Get(':address/approvals')
  @ApiOperation({ summary: 'Get token approval risk hints' })
  @ApiQuery({ name: 'chain', enum: Chain, required: false })
  async getApprovals(
    @Param() params: AddressParamDto,
    @Query() query: ChainQueryDto,
  ) {
    const address = params.address;
    const chain = query.chain ?? Chain.ETHEREUM;
    const approvals = await this.moralisService.getTokenApprovals(address, chain);
    return {
      items: approvals.slice(0, 50).map((a) => ({
        token: a.token_symbol ?? 'UNKNOWN',
        spender: a.spender_address ?? '',
        allowance: a.value ?? '0',
        approvalDate: a.block_timestamp ?? new Date().toISOString(),
        revokeRisk: a.value && a.value.length > 20 ? 'High' : 'Low',
        unlimited: Boolean(a.value && a.value.length > 20),
      })),
      source: 'moralis',
    };
  }

  @Get(':address/anomalies')
  @ApiOperation({ summary: 'Get anomaly signals inferred from address behavior' })
  @ApiQuery({ name: 'chain', enum: Chain, required: false })
  async getAnomalies(
    @Param() params: AddressParamDto,
    @Query() query: ChainQueryDto,
  ) {
    const address = params.address;
    const chain = query.chain ?? Chain.ETHEREUM;

    const [txs, engineRisk] = await Promise.all([
      this.addressesService.getAddressTransactions(address, chain, 200, 0),
      this.addressesService.getEngineRisk(address, chain),
    ]);

    const anomalies: any[] = [];
    if (engineRisk?.detections) {
      for (const d of engineRisk.detections) {
        anomalies.push({
          id: `${d.detector}-${d.label}`,
          title: d.label.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          description: d.details?.description || `Detected ${d.label} behavior via ${d.detector}.`,
          severityScore: d.severity === 'high' ? 85 : d.severity === 'medium' ? 60 : 30,
          confidencePct: Math.round(d.confidence * 100),
          explanation: d.details?.explanation || d.details?.description || `The ${d.detector} identified a pattern matching ${d.label}.`,
        });
      }
    }

    const timeline = txs.data.slice(0, 20).map((tx: any, idx: number) => ({
      id: `t-${idx}`,
      type: 'tx',
      title: `Transfer ${Number(tx.amount ?? 0).toFixed(4)}`,
      ts: tx.timestamp?.toISOString?.() ?? new Date().toISOString(),
    }));

    return { anomalies, timeline, source: 'engine+ledger' };
  }

  @Get(':address/cross-chain')
  @ApiOperation({ summary: 'Get cross-chain profile' })
  async getCrossChain(@Param() params: AddressParamDto) {
    const address = params.address;
    const addresses = await this.addressesService.findAcrossChains(address);
    const balances = addresses.map((a) => ({
      chain: a.chain,
      value: Number(a.balance ?? 0),
    }));

    const allTx = await this.addressesService.getAddressTransactionsAllChains(address, 200);
    const chainBuckets = new Map<string, number>();
    for (const tx of allTx) {
      chainBuckets.set(tx.chain, (chainBuckets.get(tx.chain) ?? 0) + Number(tx.amount ?? 0));
    }
    const chainNames = Array.from(new Set([...balances.map((x) => x.chain), ...Array.from(chainBuckets.keys())]));
    const links = [];
    for (let i = 1; i < chainNames.length; i += 1) {
      links.push({ source: i - 1, target: i, value: Number((chainBuckets.get(chainNames[i]) ?? 0).toFixed(2)) || 1 });
    }

    return {
      balances,
      bridges: links.map((l, idx) => ({
        id: `bridge-${idx + 1}`,
        bridge: 'Inferred Bridge Activity',
        sourceChain: chainNames[l.source],
        destinationChain: chainNames[l.target],
        amount: l.value,
        date: new Date().toISOString(),
      })),
      flows: {
        nodes: chainNames.map((name) => ({ name })),
        links,
      },
      source: 'ledger',
    };
  }

  @Get(':address/clusters')
  @ApiOperation({ summary: 'Heuristic address clusters and related wallets' })
  @ApiQuery({ name: 'chain', enum: Chain, required: false })
  async getClusters(
    @Param() params: AddressParamDto,
    @Query() query: ChainQueryDto,
  ) {
    const address = params.address;
    const chain = query.chain ?? Chain.ETHEREUM;

    const [txs, engineClusters] = await Promise.all([
      this.addressesService.getAddressTransactions(address, chain, 1000, 0),
      this.addressesService.getEngineClusters(address, chain),
    ]);

    const flows = new Map<string, { to: number; from: number; total: number }>();
    for (const tx of txs.data) {
      const fromMe = tx.fromAddress.toLowerCase() === address.toLowerCase();
      const cp = fromMe ? tx.toAddress.toLowerCase() : tx.fromAddress.toLowerCase();
      const current = flows.get(cp) ?? { to: 0, from: 0, total: 0 };
      if (fromMe) current.to += 1;
      else current.from += 1;
      current.total += Number(tx.amount ?? 0);
      flows.set(cp, current);
    }

    const relatedWallets = Array.from(flows.entries())
      .map(([wallet, s]) => ({
        wallet,
        interactions: s.to + s.from,
        direction: s.to > s.from ? 'outgoing-dominant' : s.from > s.to ? 'incoming-dominant' : 'bidirectional',
        volume: Number(s.total.toFixed(6)),
        clusterScore: Math.min(100, (s.to + s.from) * 4 + (s.to > 0 && s.from > 0 ? 25 : 0)),
      }))
      .sort((a, b) => b.clusterScore - a.clusterScore)
      .slice(0, 25);

    const clusterSignals = {
      repeatedFlows: relatedWallets.filter((x) => x.interactions >= 5).length,
      fanOut: relatedWallets.filter((x) => x.direction === 'outgoing-dominant').length,
      bidirectionalLinks: relatedWallets.filter((x) => x.direction === 'bidirectional').length,
    };

    const inferredClusters = (engineClusters || []).map((c: any, idx: number) => ({
      id: `engine-cluster-${idx}`,
      type: c.type,
      size: c.members?.length ?? 0,
      risk: c.type === 'rapid_funding_cluster' ? 'High' : 'Medium',
      reason: c.reason,
    }));

    return {
      root: address,
      chain,
      clusterSignals,
      relatedWallets,
      inferredClusters,
      source: inferredClusters.length ? 'engine+ledger' : 'ledger',
    };
  }

  @Get(':address/mev')
  @ApiOperation({ summary: 'Get MEV exposure' })
  @ApiQuery({ name: 'chain', enum: Chain, required: false })
  async getMev(
    @Param() params: AddressParamDto,
    @Query() query: ChainQueryDto,
  ) {
    const address = params.address;
    const chain = query.chain ?? Chain.ETHEREUM;
    return {
      victim: false,
      totalProfit: '0 ETH',
      items: [],
      source: 'not_available_without_mev_provider',
    };
  }
}

function normalizeEntityLabel(input?: string): string {
  if (!input) return 'user_wallet';
  const raw = input.trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (raw === 'smart contract' || raw === 'contract') return 'smart contract';
  if (raw === 'user wallet' || raw === 'wallet' || raw === 'user') return 'user_wallet';
  return raw;
}
