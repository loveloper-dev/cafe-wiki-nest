import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class ScrapingService {
  private readonly logger = new Logger(ScrapingService.name);

  getHello(): string {
    return 'web crawling and scraping!';
  }

  @Cron('45 * * * * *') // 27분 45초, 28분 45초...
  handleCron() {
    this.logger.debug('Called when the current second is 45');
  }
}
