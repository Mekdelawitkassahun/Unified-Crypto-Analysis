import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';

@ApiTags('Organization')
@Controller('api/v1/organization')
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) { }

  @Get('keys')
  @ApiOperation({ summary: 'List organization API keys' })
  async getKeys(@Query('userId') userId?: string) {
    const [keys, usage, rateLimitWarning] = await Promise.all([
      this.orgService.listKeys(userId),
      this.orgService.getUsageStats(userId),
      this.orgService.getRateLimitWarning(userId),
    ]);
    return {
      keys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        key: k.key.slice(0, 12) + '••••••••••••',
        permissions: k.permissions,
        tier: k.tier,
        isActive: k.isActive,
        expiresAt: k.expiresAt?.toISOString() ?? null,
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        callCount: k.callCount,
        createdAt: k.createdAt.toISOString(),
      })),
      usage,
      rateLimitWarning,
    };
  }

  @Post('keys')
  @ApiOperation({ summary: 'Create a new API key' })
  async createKey(
    @Body()
    body: {
      name: string;
      permissions?: 'read' | 'write' | 'admin';
      tier?: 'free' | 'pro' | 'enterprise';
      expiresAt?: string;
      userId?: string;
    },
  ) {
    const key = await this.orgService.createKey(body);
    return {
      id: key.id,
      name: key.name,
      key: key.key, // Return full key only on creation
      permissions: key.permissions,
      tier: key.tier,
      isActive: key.isActive,
      expiresAt: key.expiresAt?.toISOString() ?? null,
      createdAt: key.createdAt.toISOString(),
    };
  }

  @Delete('keys/:id')
  @ApiOperation({ summary: 'Delete an API key' })
  async deleteKey(@Param('id') id: string) {
    await this.orgService.deleteKey(id);
    return { success: true };
  }

  @Post('keys/:id/revoke')
  @ApiOperation({ summary: 'Revoke an API key' })
  async revokeKey(@Param('id') id: string) {
    await this.orgService.revokeKey(id);
    return { success: true };
  }
}
