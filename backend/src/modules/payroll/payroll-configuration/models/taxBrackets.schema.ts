import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { EmployeeProfile as Employee } from '../../../employee/models/employee/employee-profile.schema';
import { ConfigStatus } from '../enums/payroll-configuration-enums';

export type taxBracketsDocument = HydratedDocument<taxBrackets>;

@Schema({ timestamps: true })
export class taxBrackets {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  localTaxLawReference: string; // Reference to Local Tax Law for BR 5

  @Prop({ required: true, min: 0 })
  minIncome: number;

  @Prop({ required: true, min: 0 })
  maxIncome: number;

  @Prop({ required: true, min: 0, max: 100 })
  taxRate: number; // Tax rate in percentage

  @Prop({ required: true, min: 0 })
  baseAmount: number; // Base tax amount for this bracket

  @Prop({ required: true, type: String, enum: ConfigStatus, default: ConfigStatus.DRAFT })
  status: ConfigStatus;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Employee.name })
  createdBy?: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Employee.name })
  approvedBy?: mongoose.Types.ObjectId;

  @Prop()
  approvedAt?: Date;

  @Prop()
  effectiveDate?: Date;

  @Prop()
  expiryDate?: Date;
}

export const taxBracketsSchema = SchemaFactory.createForClass(taxBrackets);
