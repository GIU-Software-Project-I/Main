import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum DocumentType {
    ID_CARD = 'ID_CARD',
    PASSPORT = 'PASSPORT',
    DRIVING_LICENSE = 'DRIVING_LICENSE',
    BIRTH_CERTIFICATE = 'BIRTH_CERTIFICATE',
    EDUCATION_CERTIFICATE = 'EDUCATION_CERTIFICATE',
    PROFESSIONAL_CERTIFICATION = 'PROFESSIONAL_CERTIFICATION',
    CONTRACT = 'CONTRACT',
    OFFER_LETTER = 'OFFER_LETTER',
    MEDICAL_RECORD = 'MEDICAL_RECORD',
    BACKGROUND_CHECK = 'BACKGROUND_CHECK',
    OTHER = 'OTHER',
}

@Schema({ timestamps: true })
export class EmployeeDocument extends Document {
    @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile', required: true })
    employeeId: Types.ObjectId;

    @Prop({ required: true })
    fileName: string;

    @Prop({ enum: DocumentType, required: true })
    documentType: DocumentType;

    @Prop()
    description?: string;

    @Prop({ required: true })
    fileData: string; // Base64 encoded file

    @Prop()
    mimeType: string; // e.g., 'application/pdf', 'image/jpeg'

    @Prop()
    fileSize: number; // in bytes

    @Prop()
    expiryDate?: Date; // For documents that expire (passport, certificates)

    @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile' })
    uploadedBy: Types.ObjectId;

    @Prop({ default: Date.now })
    uploadedAt: Date;
}

export const EmployeeDocumentSchema = SchemaFactory.createForClass(EmployeeDocument);
