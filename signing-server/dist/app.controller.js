"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const app_service_1 = require("./app.service");
const fs_1 = require("fs");
let AppController = class AppController {
    constructor(appService) {
        this.appService = appService;
    }
    async getSignature(address, token_id) {
        const whitelist = JSON.parse((0, fs_1.readFileSync)('./src/whitelist.json', 'utf-8'));
        const foundEntry = whitelist.find((entry) => entry[0] === address && entry[1] === Number(token_id));
        if (!foundEntry) {
            throw new common_1.HttpException('Forbidden', common_1.HttpStatus.FORBIDDEN);
        }
        const allocationQty = foundEntry[2];
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
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(':address'),
    __param(0, (0, common_1.Param)('address')),
    __param(1, (0, common_1.Query)('token_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getSignature", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService])
], AppController);
//# sourceMappingURL=app.controller.js.map