import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateSubscriberDto {
  @IsString()
  pipelineId: string;

  @IsString()
  targetUrl: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}