import { IsNotEmpty, IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTaxBracketDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsString()
  localTaxLawReference: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  minIncome: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  maxIncome: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  baseAmount: number;

  @IsOptional()
  @Type(() => Date)
  effectiveDate?: Date;

  @IsOptional()
  @Type(() => Date)
  expiryDate?: Date;

  @IsNotEmpty()
  @IsString()
  createdByEmployeeId: string;
}
