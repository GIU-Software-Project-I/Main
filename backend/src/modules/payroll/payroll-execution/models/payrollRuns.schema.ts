import { Prop, Schema, SchemaFactory, } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import {  EmployeeProfile as Employee} from '../../../employee/models/employee/employee-profile.schema';
import { PayRollPaymentStatus, PayRollStatus } from '../enums/payroll-execution-enum';
import { Department } from '../../../employee/models/organization-structure/department.schema';


export type payrollRunsDocument = HydratedDocument<payrollRuns>

@Schema({ timestamps: true })
export class payrollRuns {
  @Prop({ required: true, unique: true })
  runId: string;//for viewing purposes ex: PR-2025-0001
  @Prop({ required: true })
  payrollPeriod: Date; // end of each month like 31-01-2025
  @Prop({ required: true, type: String, enum: PayRollStatus ,default:PayRollStatus.DRAFT})
  status: PayRollStatus;

  @Prop({ required: true })
  entity: string; // name of the company/department

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Department.name })
  entityId?: mongoose.Schema.Types.ObjectId; // department ID for filtering employees

  @Prop({ required: true })
  employees: number;
  @Prop({ required: true })
  exceptions: number;
  @Prop({ required: true })
  totalnetpay: number;

  // Aggregated totals from employee payroll details
  @Prop({ default: 0 })
  totalGrossPay: number;
  @Prop({ default: 0 })
  totalDeductions: number; // Total of all deductions (tax + insurance + penalties)
  @Prop({ default: 0 })
  totalTaxDeductions: number;
  @Prop({ default: 0 })
  totalInsuranceDeductions: number;
  @Prop({ default: 0 })
  totalPenalties: number;
  @Prop({ default: 0 })
  totalAllowances: number;
  @Prop({ default: 0 })
  totalBaseSalary: number;
  @Prop({ default: 0 })
  totalOvertime: number;
  @Prop({ default: 0 })
  totalRefunds: number;
  
  // Aggregated irregularities count and list
  @Prop({ default: 0 })
  irregularitiesCount: number;
  @Prop({ type: [String], default: [] })
  irregularities: string[];

  
  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: Employee.name })
  payrollSpecialistId: mongoose.Schema.Types.ObjectId;// createdBy

  @Prop({ required: true, type: String, enum: PayRollPaymentStatus, default: PayRollPaymentStatus.PENDING })
  paymentStatus: PayRollPaymentStatus;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Employee.name })
  payrollManagerId?: mongoose.Schema.Types.ObjectId;
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Employee.name })
  financeStaffId?: mongoose.Schema.Types.ObjectId;

  @Prop()
  rejectionReason?: string;

  @Prop()
  unlockReason?: string;

  @Prop()
  managerApprovalDate?: Date;

  @Prop()
  financeApprovalDate?: Date;
}

export const payrollRunsSchema = SchemaFactory.createForClass(payrollRuns);