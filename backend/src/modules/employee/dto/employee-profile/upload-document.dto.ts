import { IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';
import { DocumentType } from '../../models/employee/employee-document.schema';

export class UploadDocumentDto {
    @IsNotEmpty()
    @IsString()
    fileName: string;

    @IsEnum(DocumentType)
    documentType: DocumentType;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNotEmpty()
    @IsString()
    fileData: string; // Base64 encoded file

    @IsString()
    mimeType: string;

    @IsOptional()
    @IsDateString()
    expiryDate?: string;
}
