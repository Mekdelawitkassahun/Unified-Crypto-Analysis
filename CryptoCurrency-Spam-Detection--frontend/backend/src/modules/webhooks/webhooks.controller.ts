import { Controller, Post, Body, Get, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { RegisterWebhookDto } from './dto/register-webhook.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';

@ApiTags('Webhooks')
@ApiBearerAuth()
@Controller('api/v1/webhook')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new webhook' })
  async registerWebhook(@Body() dto: RegisterWebhookDto) {
    return this.webhooksService.register(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all registered webhooks' })
  async getAllWebhooks() {
    return this.webhooksService.findAll();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a webhook' })
  async deleteWebhook(@Param('id') id: string) {
    return this.webhooksService.delete(id);
  }
}
