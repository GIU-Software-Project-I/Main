import { IsEnum, IsNotEmpty, IsNumber, Min, Max, IsOptional, IsString } from 'class-validator';
import { TaxComponentType } from '../models/taxRules.schema';

export class TaxComponentDto {
  @IsNotEmpty()
  @IsEnum(TaxComponentType)
  type: TaxComponentType;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  rate: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @IsOptional()
  @IsString()
  formula?: string;
}
