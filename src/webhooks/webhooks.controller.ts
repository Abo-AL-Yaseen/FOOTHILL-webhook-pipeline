import { Body, Controller, Headers, Param, Post } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
    constructor(private readonly webhooksService: WebhooksService) {}

    @Post(':webhookKey')
    ingestWebhook(@Param('webhookKey') webhookKey: string,@Body() payload: Record<string, any>,@Headers('x-webhook-secret') webhookSecret?: string,) {
        return this.webhooksService.ingestWebhook(
            webhookKey,
            payload,
            webhookSecret,
        );
    }
}