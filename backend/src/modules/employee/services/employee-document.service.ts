import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmployeeDocument } from '../models/employee/employee-document.schema';
import { EmployeeProfile, EmployeeProfileDocument as EmployeeProfileDoc } from '../models/employee/employee-profile.schema';
import { UploadDocumentDto } from '../dto/employee-profile/upload-document.dto';

@Injectable()
export class EmployeeDocumentService {
    constructor(
        @InjectModel(EmployeeDocument.name)
        private employeeDocumentModel: Model<EmployeeDocument>,
        @InjectModel(EmployeeProfile.name)
        private employeeProfileModel: Model<EmployeeProfileDoc>,
    ) { }

    private validateObjectId(id: string, fieldName: string): void {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`Invalid ${fieldName} format: ${id}`);
        }
    }

    /**
     * Upload a new document for an employee
     */
    async uploadDocument(userId: string, dto: UploadDocumentDto): Promise<EmployeeDocument> {
        this.validateObjectId(userId, 'userId');

        // Verify employee exists
        const employee = await this.employeeProfileModel.findById(userId);
        if (!employee) {
            throw new NotFoundException('Employee profile not found');
        }

        // Calculate file size from base64
        const base64Data = dto.fileData.split(',')[1] || dto.fileData;
        const fileSize = Math.ceil((base64Data.length * 3) / 4);

        // Limit file size to 10MB
        if (fileSize > 10 * 1024 * 1024) {
            throw new BadRequestException('File size exceeds 10MB limit');
        }

        const document = new this.employeeDocumentModel({
            employeeId: new Types.ObjectId(userId),
            fileName: dto.fileName,
            documentType: dto.documentType,
            description: dto.description,
            fileData: dto.fileData,
            mimeType: dto.mimeType,
            fileSize,
            expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
            uploadedBy: new Types.ObjectId(userId),
            uploadedAt: new Date(),
        });

        return document.save();
    }

    /**
     * Get all documents for an employee
     */
    async getMyDocuments(userId: string): Promise<any[]> {
        this.validateObjectId(userId, 'userId');

        const documents = await this.employeeDocumentModel
            .find({ employeeId: new Types.ObjectId(userId) })
            .select('-fileData') // Don't return file data in list (for performance)
            .sort({ uploadedAt: -1 })
            .lean()
            .exec();

        return documents.map(doc => ({
            ...doc,
            id: doc._id.toString(),
            fileSizeKB: Math.round(doc.fileSize / 1024),
        }));
    }

    /**
     * Get a specific document (full data including file)
     */
    async getDocument(userId: string, documentId: string): Promise<EmployeeDocument> {
        this.validateObjectId(userId, 'userId');
        this.validateObjectId(documentId, 'documentId');

        const document = await this.employeeDocumentModel.findOne({
            _id: new Types.ObjectId(documentId),
            employeeId: new Types.ObjectId(userId),
        });

        if (!document) {
            throw new NotFoundException('Document not found');
        }

        return document;
    }

    /**
     * Delete a document
     */
    async deleteDocument(userId: string, documentId: string): Promise<void> {
        this.validateObjectId(userId, 'userId');
        this.validateObjectId(documentId, 'documentId');

        const result = await this.employeeDocumentModel.deleteOne({
            _id: new Types.ObjectId(documentId),
            employeeId: new Types.ObjectId(userId),
        });

        if (result.deletedCount === 0) {
            throw new NotFoundException('Document not found or already deleted');
        }
    }

    /**
     * Admin: Get all documents for any employee
     */
    async adminGetEmployeeDocuments(employeeId: string): Promise<any[]> {
        this.validateObjectId(employeeId, 'employeeId');

        const documents = await this.employeeDocumentModel
            .find({ employeeId: new Types.ObjectId(employeeId) })
            .select('-fileData')
            .sort({ uploadedAt: -1 })
            .lean()
            .exec();

        return documents.map(doc => ({
            ...doc,
            id: doc._id.toString(),
            fileSizeKB: Math.round(doc.fileSize / 1024),
        }));
    }
}
