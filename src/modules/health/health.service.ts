import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

type ServiceStatus = 'up' | 'down';
type OverallStatus = 'ok' | 'degraded';

interface DatabaseHealth {
  status: ServiceStatus;
  latencyMs: number;
}

interface SudachiHealth {
  status: ServiceStatus;
}

export interface HealthCheckResponse {
  status: OverallStatus;
  timestamp: string;
  services: {
    database: DatabaseHealth;
    sudachi: SudachiHealth;
  };
}

@Injectable()
export class HealthService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async check(): Promise<HealthCheckResponse> {
    const [database, sudachi] = await Promise.all([
      this.checkDatabase(),
      this.checkSudachi(),
    ]);

    const status: OverallStatus =
      database.status === 'up' && sudachi.status === 'up' ? 'ok' : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      services: {
        database,
        sudachi,
      },
    };
  }

  private async checkDatabase(): Promise<DatabaseHealth> {
    const start = Date.now();

    try {
      await this.dataSource.query('SELECT 1');

      return {
        status: 'up',
        latencyMs: Date.now() - start,
      };
    } catch {
      return {
        status: 'down',
        latencyMs: Date.now() - start,
      };
    }
  }

  private async checkSudachi(): Promise<SudachiHealth> {
    try {
      await import('../../../sudachi-native');

      return { status: 'up' };
    } catch {
      return { status: 'down' };
    }
  }
}
