
import { Prop, Schema, SchemaFactory, } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import {  EmployeeProfile as Employee} from '../../../employee/models/employee/employee-profile.schema';
import { payrollRuns } from './payrollRuns.schema';
import { BankStatus } from '../enums/payroll-execution-enum';

export type employeePayrollDetailsDocument = HydratedDocument<employeePayrollDetails>

// Nested schema for detailed penalties breakdown
@Schema({ _id: false })
class PenaltiesBreakdown {
    @Prop({ default: 0 })
    misconduct: number;
    @Prop({ type: String })
    misconductReason?: string;
    @Prop({ default: 0 })
    missingWork: number;
    @Prop({ type: String })
    missingWorkReason?: string;
    @Prop({ default: 0 })
    lateness: number;
    @Prop({ type: String })
    latenessReason?: string;
    @Prop({ default: 0 })
    total: number;
}
const PenaltiesBreakdownSchema = SchemaFactory.createForClass(PenaltiesBreakdown);

// Nested schema for detailed deductions breakdown
@Schema({ _id: false })
class DeductionsBreakdown {
    @Prop({ default: 0 })
    tax: number;
    @Prop({ type: String })
    taxReason?: string;
    @Prop({ default: 0 })
    insurance: number;
    @Prop({ type: String })
    insuranceReason?: string;
    @Prop({ default: 0 })
    penalties: number;
    @Prop({ default: 0 })
    unpaidLeave: number;
    @Prop({ type: String })
    unpaidLeaveReason?: string;
    @Prop({ default: 0 })
    total: number;
}
const DeductionsBreakdownSchema = SchemaFactory.createForClass(DeductionsBreakdown);

// Nested schema for overtime details
@Schema({ _id: false })
class OvertimeDetails {
    @Prop({ default: 0 })
    minutes: number;
    @Prop({ default: 0 })
    amount: number;
    @Prop({ type: String })
    reason?: string;
}
const OvertimeDetailsSchema = SchemaFactory.createForClass(OvertimeDetails);

// Nested schema for attendance summary
@Schema({ _id: false })
class AttendanceSummary {
    @Prop({ default: 0 })
    actualWorkMinutes: number;
    @Prop({ default: 0 })
    scheduledWorkMinutes: number;
    @Prop({ default: 0 })
    missingWorkMinutes: number;
    @Prop({ default: 0 })
    overtimeMinutes: number;
    @Prop({ default: 0 })
    latenessMinutes: number;
    @Prop({ default: 0 })
    workingDays: number;
    @Prop({ default: 0 })
    unpaidLeaveDays: number;
}
const AttendanceSummarySchema = SchemaFactory.createForClass(AttendanceSummary);

@Schema({ timestamps: true })
export class employeePayrollDetails {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Employee.name, required: true })
    employeeId: mongoose.Types.ObjectId;
    @Prop({ required: true })
    baseSalary: number;
    @Prop({ required: true })
    allowances: number;
    @Prop({ required: true })
    deductions: number; // Total deductions (tax + insurance) - excluding penalties
    
    // Detailed deductions breakdown
    @Prop({ type: DeductionsBreakdownSchema })
    deductionsBreakdown?: DeductionsBreakdown;
    
    // Penalties breakdown
    @Prop({ type: PenaltiesBreakdownSchema })
    penalties?: PenaltiesBreakdown;
    
    // Overtime details
    @Prop({ type: OvertimeDetailsSchema })
    overtime?: OvertimeDetails;
    
    // Refunds amount
    @Prop({ default: 0 })
    refunds?: number;
    
    // Attendance summary
    @Prop({ type: AttendanceSummarySchema })
    attendance?: AttendanceSummary;
    
    @Prop({ required: true })
    netSalary: number; // Gross - (tax + insurance)
    @Prop({ required: true })
    netPay: number; // netSalary - penalties + overtime + refunds + bonus + benefit = final amount to be paid
    @Prop({ required: true, enum: BankStatus, type: String })
    bankStatus: BankStatus; // valid, missing
    @Prop({ type: String })
    exceptions?: string; // flags if any issues while calculating payroll for this employee or missing bank details
    @Prop({ default: 0 })
    bonus?: number;
    @Prop({ default: 0 })
    benefit?: number;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: payrollRuns.name, required: true })
    payrollRunId: mongoose.Types.ObjectId;

        // Persistent irregularities for this payroll detail
        @Prop({
            type: [
                {
                    _id: false,
                    irregularityId: { type: String, required: true },
                    type: { type: String, required: true },
                    severity: { type: String, enum: ['info', 'low', 'medium', 'high', 'critical'], required: true },
                    status: { type: String, enum: ['pending', 'escalated', 'resolved', 'rejected'], default: 'pending' },
                    description: { type: String },
                    flaggedAt: { type: Date, default: Date.now },
                    escalatedAt: { type: Date },
                    escalationReason: { type: String },
                    escalatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeProfile' },
                    resolution: {
                        action: { type: String },
                        notes: { type: String },
                        resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeProfile' },
                        resolvedAt: { type: Date },
                        adjustedValue: { type: Number },
                    },
                },
            ],
            default: [],
        })
        irregularities?: Array<{
            irregularityId: string;
            type: string;
            severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
            status: 'pending' | 'escalated' | 'resolved' | 'rejected';
            description?: string;
            flaggedAt?: Date;
            escalatedAt?: Date;
            escalationReason?: string;
            escalatedBy?: mongoose.Types.ObjectId;
            resolution?: {
                action: string;
                notes: string;
                resolvedBy: mongoose.Types.ObjectId;
                resolvedAt: Date;
                adjustedValue?: number;
            };
        }>;

}



export const employeePayrollDetailsSchema = SchemaFactory.createForClass(employeePayrollDetails);