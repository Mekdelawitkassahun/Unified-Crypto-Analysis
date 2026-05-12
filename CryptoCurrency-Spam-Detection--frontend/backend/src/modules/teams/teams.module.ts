import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { TeamEntity } from './team.entity';
import { TeamActivityEntity } from './team-activity.entity';
import { MiscModule } from '../misc/misc.module';

@Module({
  imports: [TypeOrmModule.forFeature([TeamEntity, TeamActivityEntity]), MiscModule],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}