import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLogService } from '../misc/audit-log.service';

@ApiTags('Teams')
@Controller('api/v1/teams')
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all teams' })
  getTeams() {
    return this.teamsService.getTeams();
  }

  @Get(':teamId/activity')
  @ApiOperation({ summary: 'Get team activity' })
  getActivity(@Param('teamId') teamId: string) {
    return this.teamsService.getActivity(teamId);
  }

  @Post(':teamId/invite')
  @ApiOperation({ summary: 'Invite user to team' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'investigator')
  async invite(@Param('teamId') teamId: string, @Body() body: { email: string }, @Req() req: any) {
    const result = await this.teamsService.invite(teamId, body.email);
    await this.auditLogService.log({
      actor: req?.user?.email ?? req?.user?.sub ?? 'system',
      action: 'team.invite',
      resource: `/api/v1/teams/${teamId}/invite`,
      meta: { invited: body.email },
    });
    return result;
  }

  @Get(':teamId/presence')
  @ApiOperation({ summary: 'Get team presence' })
  getPresence(@Param('teamId') teamId: string) {
    return this.teamsService.getPresence(teamId);
  }
}
