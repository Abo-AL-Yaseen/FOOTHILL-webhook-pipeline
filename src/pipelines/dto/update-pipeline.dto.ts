import { CreatePipelineDto } from './create-pipeline.dto';
import { PartialType } from '@nestjs/mapped-types';


export class UpdatePipelineDto extends PartialType(CreatePipelineDto) {}