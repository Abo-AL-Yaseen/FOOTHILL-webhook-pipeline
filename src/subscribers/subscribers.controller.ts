import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { SubscribersService } from './subscribers.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';

@Controller('subscribers')
export class SubscribersController {
  constructor(private readonly subscribersService: SubscribersService) {}

  @Post()
  create(@Body() createSubscriberDto: CreateSubscriberDto) {
    return this.subscribersService.create(createSubscriberDto);
  }

  @Get()
  findAll(
    @Query('pipelineId') pipelineId?: string,
    @Query('active') active?: string,
  ) {
    let parsedActive: boolean | undefined = undefined;

    if (active === 'true') {
      parsedActive = true;
    } else if (active === 'false') {
      parsedActive = false;
    }

    return this.subscribersService.findAll(pipelineId, parsedActive);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subscribersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSubscriberDto: UpdateSubscriberDto,
  ) {
    return this.subscribersService.update(id, updateSubscriberDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.subscribersService.remove(id);
  }
}