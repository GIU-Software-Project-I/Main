import { IsNotEmpty, IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TaxComponentDto } from './tax-component.dto';

export class CreateTaxRuleDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaxComponentDto)
  taxComponents: TaxComponentDto[];

  @IsNotEmpty()
  @IsString()
  createdByEmployeeId: string;
}
