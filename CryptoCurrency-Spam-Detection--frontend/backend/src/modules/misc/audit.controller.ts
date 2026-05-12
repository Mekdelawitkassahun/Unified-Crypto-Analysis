import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Audit')
@Controller('api/v1/audit')
export class AuditController {
  @Get()
  @ApiOperation({ summary: 'Get audit log' })
  getAuditLog() {
    return { items: [] };
  }
}