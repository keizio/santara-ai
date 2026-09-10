import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateAnalysisDto {
  @IsOptional()
  @IsString()
  @Length(2, 12)
  ticker?: string;

  @ValidateIf((dto: CreateAnalysisDto) => !dto.ticker)
  @IsString()
  @Length(3, 500)
  query?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(3)
  @Max(120)
  windowDays?: number;
}

export class PlanQueryDto {
  @IsString()
  @Length(3, 500)
  query!: string;
}

export class ScreenDto {
  @IsOptional()
  @IsString()
  @Length(3, 500)
  query?: string;

  @IsOptional()
  @IsIn(['IDX', 'SGX'])
  exchange?: 'IDX' | 'SGX';

  @IsOptional()
  @IsString()
  subSector?: string;

  @IsOptional()
  @Type(() => Number)
  maxPe?: number;

  @IsOptional()
  @Type(() => Number)
  minForeignNetBuy?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(3)
  @Max(120)
  lookbackDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class ListAnalysesDto {
  @IsOptional()
  @IsString()
  ticker?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ListCompaniesDto {
  @IsOptional()
  @IsIn(['IDX', 'SGX'])
  exchange?: 'IDX' | 'SGX';

  @IsOptional()
  @IsString()
  subSector?: string;
}
