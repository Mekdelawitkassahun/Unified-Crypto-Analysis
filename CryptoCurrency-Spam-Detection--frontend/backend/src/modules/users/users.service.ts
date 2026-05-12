import { Injectable } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  private repository: Repository<User>;

  constructor(private dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(User);
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.repository.findOne({ where: { email } });
    return result ?? null;
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.repository.findOne({ where: { id } });
    return result ?? null;
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.repository.create(data);
    return this.repository.save(user);
  }
}
