import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamEntity } from './team.entity';
import { TeamActivityEntity } from './team-activity.entity';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(TeamEntity)
    private teamsRepo: Repository<TeamEntity>,
    @InjectRepository(TeamActivityEntity)
    private activityRepo: Repository<TeamActivityEntity>,
  ) {}

  async getTeams(): Promise<TeamEntity[]> {
    try {
      const teams = await this.teamsRepo.find({ order: { createdAt: 'DESC' } });
      if (teams.length > 0) return teams;
    } catch {
      // Fall through to default demo team when the table is missing/unavailable.
    }

    return [
      {
        id: 'default-team',
        name: 'Default Team',
        description: 'Fallback collaboration workspace',
        role: 'Admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as TeamEntity,
    ];
  }

  async getActivity(teamId: string): Promise<TeamActivityEntity[]> {
    try {
      return await this.activityRepo.find({
        where: { teamId },
        order: { createdAt: 'DESC' },
        take: 50,
      });
    } catch {
      return [];
    }
  }

  async invite(teamId: string, email: string): Promise<void> {
    try {
      const activity = this.activityRepo.create({
        teamId,
        actor: 'System',
        action: `Invited ${email}`,
      });
      await this.activityRepo.save(activity);
    } catch {
      return;
    }
  }

  async getPresence(teamId: string) {
    return { teamId, online: [] };
  }
}
