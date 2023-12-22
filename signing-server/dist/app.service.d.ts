import { ConfigService } from '@nestjs/config';
type CreateSignatureParams = {
    address: string;
    token_id: number;
    allocationQty: number;
};
export declare class AppService {
    private configService;
    constructor(configService: ConfigService);
    createSignature(params: CreateSignatureParams): Promise<string>;
}
export {};
