
import { IsNotEmpty, IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTaxBracketDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  localTaxLawReference?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minIncome?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxIncome?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  baseAmount?: number;

  @IsOptional()
  @Type(() => Date)
  effectiveDate?: Date;

  @IsOptional()
  @Type(() => Date)
  expiryDate?: Date;
}