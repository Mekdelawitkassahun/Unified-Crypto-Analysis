import { Chain } from '../enums/chain.enum';

export class AddressValidator {
  static isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  static isValidBitcoinAddress(address: string): boolean {
    return /^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/.test(address);
  }

  static validateAddress(address: string, chain: Chain): boolean {
    switch (chain) {
      case Chain.ETHEREUM:
      case Chain.POLYGON:
      case Chain.ARBITRUM:
      case Chain.OPTIMISM:
      case Chain.BSC:
      case Chain.AVALANCHE:
      case Chain.GNOSIS:
      case Chain.BASE:
      case Chain.CELO:
      case Chain.SEPOLIA:
        return this.isValidEthereumAddress(address);
      case Chain.BITCOIN:
        return this.isValidBitcoinAddress(address);
      default:
        return this.isValidEthereumAddress(address);
    }
  }
}
