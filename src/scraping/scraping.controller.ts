import { Controller, Get } from '@nestjs/common';
import { ScrapingService } from './scraping.service';

@Controller('scraping')
export class ScrapingController {
  constructor(private readonly appService: ScrapingService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
