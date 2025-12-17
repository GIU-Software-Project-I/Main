import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
// import model from another subsystem
import { EmployeeProfile as Employee } from '../../../employee/models/employee/employee-profile.schema';
// import enums
import { ConfigStatus } from '../enums/payroll-configuration-enums';

export enum TaxComponentType {
  INCOME_TAX = 'INCOME_TAX',
  EXEMPTION = 'EXEMPTION',
  SURCHARGE = 'SURCHARGE',
  CESS = 'CESS',
  OTHER_DEDUCTION = 'OTHER_DEDUCTION'
}

@Schema({ timestamps: true })
export class TaxComponent {
  @Prop({ required: true, type: String, enum: TaxComponentType })
  type: TaxComponentType;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, min: 0, max: 100 })
  rate: number; // Rate in percentage

  @Prop({ required: true, min: 0 })
  maxAmount?: number; // Maximum amount limit

  @Prop({ required: true, min: 0 })
  minAmount?: number; // Minimum amount limit

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop()
  formula?: string; // Calculation formula if complex
}

export type taxRulesDocument = HydratedDocument<taxRules>

@Schema({ timestamps: true })
export class taxRules {
    @Prop({ required: true })
    name: string;
    @Prop()
    description?: string;
    
    // BR 6: Support multiple tax components
    @Prop({ type: [TaxComponent], required: true })
    taxComponents: TaxComponent[];

    @Prop({ required: true, type: String, enum: ConfigStatus, default: ConfigStatus.DRAFT })
    status: ConfigStatus;
    
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Employee.name })
    createdBy?: mongoose.Types.ObjectId;
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Employee.name })
    approvedBy?: mongoose.Types.ObjectId;
    @Prop()
    approvedAt?: Date
}

export const taxRulesSchema = SchemaFactory.createForClass(taxRules);
