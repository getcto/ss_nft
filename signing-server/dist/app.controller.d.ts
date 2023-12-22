import { AppService } from './app.service';
type GetSignatureResult = {
    signature: string;
    token_id: number;
    allocationQty: number;
};
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getSignature(address: string, token_id: number): Promise<GetSignatureResult>;
}
export {};
