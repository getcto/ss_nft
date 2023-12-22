import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { AppService } from './app.service';
import { readFileSync } from 'fs';

type GetSignatureResult = {
  signature: string;
  token_id: number;
  allocationQty: number;
};

type WhitelistEntry = [
  address: string,
  token_id: number,
  allocationQty: number,
];

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get(':address')
  async getSignature(
    @Param('address') address: string,
    @Query('token_id') token_id: number,
  ): Promise<GetSignatureResult> {
    const whitelist = JSON.parse(
      readFileSync('./src/whitelist.json', 'utf-8'),
    ) as Array<WhitelistEntry>;

    // note: you should check against your list of whitelisted addresses and the quantity
    const foundEntry = whitelist.find(
      (entry) => entry[0] === address && entry[1] === Number(token_id),
    );

    if (!foundEntry) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    // note: get this from your list
    const allocationQty = foundEntry[2]; // unhardcode this

    return {
      token_id: token_id,
      allocationQty: allocationQty,
      signature: await this.appService.createSignature({
        address,
        token_id,
        allocationQty,
      }),
    };
  }
}
