import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ActionType } from '@prisma/client';

export class CreatePipelineDto {
  @IsString()
  name: string;

  @IsString()
  webhookKey: string;

  @IsEnum(ActionType)
  actionType: ActionType;

  @IsOptional()
  @IsObject()
  actionConfig?: Record<string, any>;

  @IsOptional()
  @IsString()
  secret?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}