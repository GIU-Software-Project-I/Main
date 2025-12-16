import { Prop, Schema, SchemaFactory, } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
// import schemas from employee subsystem
import { EmployeeProfile as Employee } from '../../../employee/models/employee/employee-profile.schema';
// import enums
import { DisputeStatus } from '../enums/payroll-tracking-enum';

export type disputesDocument = HydratedDocument<disputes>



@Schema({ timestamps: true })
export class disputes {
    @Prop({ required: true, unique: true })
    disputeId: string; // for frontend view purposes ex: DISP-0001

    @Prop({ required: true })
    description: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Employee.name, required: true })
    employeeId: mongoose.Types.ObjectId;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Employee.name })
    financeStaffId?: mongoose.Types.ObjectId;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'paySlip' })
    payslipId?: mongoose.Types.ObjectId;

    @Prop({ 
        required: true, 
        type: String, 
        enum: ['pending_review', 'under_review', 'approved', 'approved_by_specialist', 'rejected', 'escalated'],
        default: 'pending_review' 
    })
    status: string;// pending_review, under_review, approved, approved_by_specialist, rejected, escalated

    @Prop()
    rejectionReason?: string;

    @Prop()
    resolutionComment?: string;

    @Prop({ type: String, enum: ['pending', 'processed', 'paid'], default: 'pending' })
    refundStatus?: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'refunds' })
    refundId?: mongoose.Types.ObjectId;
}

export const disputesSchema = SchemaFactory.createForClass(disputes);
