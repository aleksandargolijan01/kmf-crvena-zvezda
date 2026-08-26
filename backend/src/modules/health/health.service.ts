import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getHealth() {
    return {
      status: 'ok',
      service: 'kmf-crvena-zvezda-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
