import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FlaggedAddressesService } from './flagged-addresses.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Chain } from '../../shared/enums/chain.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Flagged Addresses')
@ApiBearerAuth()
@Controller('api/v1/flagged')
export class FlaggedAddressesController {
  constructor(private readonly flaggedAddressesService: FlaggedAddressesService) { }

  @Get(':address')
  @ApiOperation({ summary: 'Check if address is flagged' })
  async check(@Param('address') address: string, @Query('chain') chain: Chain = Chain.ETHEREUM) {
    return this.flaggedAddressesService.checkFlagged(address, chain);
  }

  @Get()
  @ApiOperation({ summary: 'Get all flagged addresses' })
  async getAll(@Query('chain') chain?: Chain) {
    return this.flaggedAddressesService.findAll(chain);
  }

  @Post('import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'investigator')
  @ApiOperation({ summary: 'Import flagged addresses from external sources' })
  async importFlagged(
    @Body()
    body: {
      items: Array<{
        address: string;
        chain: Chain;
        reason: string;
        source?: string;
        hopDistance?: number;
      }>;
    },
  ) {
    return this.flaggedAddressesService.importMany(body?.items ?? []);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync scam database feed into flagged addresses table' })
  async syncFlaggedFeed() {
    return this.flaggedAddressesService.syncPublicFeeds();
  }
}
