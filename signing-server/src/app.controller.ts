import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  signforAddress(address: string): Promise<string> {
    // signs for quest NFT. takes in only the address
    return this.appService.signForAddress(address);
  }
}
