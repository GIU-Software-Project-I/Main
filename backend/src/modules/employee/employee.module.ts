import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Candidate, CandidateSchema } from './models/employee/Candidate.Schema';
import { EmployeeProfile, EmployeeProfileSchema } from './models/employee/employee-profile.schema';
import {
  EmployeeSystemRole,
  EmployeeSystemRoleSchema,
} from './models/employee/employee-system-role.schema';
import {
  EmployeeQualification,
  EmployeeQualificationSchema,
} from './models/employee/qualification.schema';
import {
  EmployeeProfileChangeRequest,
  EmployeeProfileChangeRequestSchema
} from "./models/employee/ep-change-request.schema";
import { EmployeeDocument, EmployeeDocumentSchema } from "./models/employee/employee-document.schema";
import { OrganizationStructureModule } from './organization-structure.module';
// COMMENTED OUT FOR TESTING - Using no-auth controller
// import {EmployeeProfileController} from "./controllers/employee-profile.controller";
import { EmployeeProfileNoAuthController } from "./controllers/employee-profile-no-auth.controller";

import { EmployeeProfileService } from "./services/employee-profile.service";
import { EmployeeDocumentService } from "./services/employee-document.service";
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from "../auth/auth-module";


@Module({
  imports: [
    forwardRef(() => AuthModule),
    MongooseModule.forFeature([
      { name: Candidate.name, schema: CandidateSchema },
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
      { name: EmployeeSystemRole.name, schema: EmployeeSystemRoleSchema },
      { name: EmployeeQualification.name, schema: EmployeeQualificationSchema },
      { name: EmployeeProfileChangeRequest.name, schema: EmployeeProfileChangeRequestSchema },
      { name: EmployeeDocument.name, schema: EmployeeDocumentSchema },

    ]),
    OrganizationStructureModule,
    SharedModule,
  ],
  // USING NO-AUTH CONTROLLER FOR TESTING
  // controllers: [EmployeeProfileController],
  controllers: [EmployeeProfileNoAuthController],
  providers: [EmployeeProfileService, EmployeeDocumentService],
  exports: [EmployeeProfileService, EmployeeDocumentService],
})
export class EmployeeModule { }
