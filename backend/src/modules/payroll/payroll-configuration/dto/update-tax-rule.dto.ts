import { IsOptional, IsString, IsArray, IsNumber, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TaxComponentDto } from './tax-component.dto'; // Make sure to import this

export class UpdateTaxRuleDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaxComponentDto) // THIS IS CRITICAL!
  taxComponents?: TaxComponentDto[]; // Add this field
}