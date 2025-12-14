// src/time-management/shift-management/shift-expiry.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { ShiftAssignment, ShiftAssignmentDocument } from '../models/shift-assignment.schema';
import { NotificationLog, NotificationLogDocument } from '../models/notification-log.schema';

/**
 * ShiftExpiryScheduler
 * - runs daily and creates NotificationLog entries for assignments that will expire within the configured window
 * - automatically finds HR/Admin users to notify (no HR_USER_ID required)
 */
@Injectable()
export class ShiftExpiryScheduler {
    private readonly logger = new Logger(ShiftExpiryScheduler.name);

    constructor(
        @InjectModel(ShiftAssignment.name) private readonly shiftAssignmentModel: Model<ShiftAssignmentDocument>,
        @InjectModel(NotificationLog.name) private readonly notificationModel: Model<NotificationLogDocument>,
        @InjectConnection() private readonly connection: Connection,
    ) {}

    /**
     * Runs daily at configured hour.
     * CRON: default '0 8 * * *' (08:00 server time).
     * Automatically finds HR/Admin users to notify - no configuration required!
     */
    // Run daily at 02:00 server time to notify about expiring shift assignments
    @Cron('0 2 * * *')
    async runDaily() {
        try {
            const daysEnv = Number(process.env.SHIFT_EXPIRY_NOTIFICATION_DAYS ?? 7);
            const days = Number.isFinite(daysEnv) && daysEnv > 0 ? daysEnv : 7;

            // compute the threshold window: now -> now + days
            const now = new Date();
            const threshold = new Date();
            threshold.setDate(now.getDate() + days);
            threshold.setHours(23, 59, 59, 999);

            // find assignments with an endDate within next `days` days and with a relevant status
            const assignments = await this.shiftAssignmentModel.find({
                endDate: { $exists: true, $lte: threshold, $gte: now },
                status: { $in: ['PENDING', 'APPROVED'] },
            }).lean();

            if (!assignments?.length) {
                this.logger.debug(`No expiring assignments in next ${days} days`);
                return;
            }

            // Automatically find all HR/Admin users
            const hrUsers = await this.findHRUsers();

            if (!hrUsers || hrUsers.length === 0) {
                this.logger.warn('No HR/Admin users found in the system. Notifications will only be sent to employees.');
            }

            let notificationCount = 0;

            for (const a of assignments) {
                try {
                    // Skip this assignment if any notification for it already exists (prevents duplicates across runs)
                    const anyNotif = await this.notificationModel.findOne({ message: { $regex: a._id.toString() } }).lean();
                    if (anyNotif) {
                        this.logger.debug(`Skipping assignment ${a._id} because notification already exists`);
                        continue;
                    }
                    const expiryDate = a.endDate?.toISOString().slice(0,10);

                    // Create only one notification per assignment: choose primary recipient
                    let primaryRecipient: any = null;
                    let primaryType = 'SHIFT_EXPIRY';
                    if (hrUsers && hrUsers.length > 0 && hrUsers[0].employeeProfileId) {
                        primaryRecipient = hrUsers[0].employeeProfileId;
                        primaryType = 'SHIFT_EXPIRY';
                    } else if (a.employeeId) {
                        primaryRecipient = a.employeeId;
                        primaryType = 'SHIFT_EXPIRY_EMPLOYEE';
                    }

                    if (primaryRecipient) {
                        const msg = `Shift assignment ${a._id} for employee ${a.employeeId} expires on ${expiryDate}. Please review for renewal or reassignment.`;
                        try {
                            await this.notificationModel.create({
                                to: primaryRecipient,
                                type: primaryType,
                                message: msg,
                            } as any);
                            notificationCount++;
                            this.logger.debug(`Created single notification for assignment ${a._id} to recipient ${primaryRecipient}`);
                        } catch (e) {
                            this.logger.warn('Failed to create notification for primary recipient', e);
                        }
                    } else {
                        this.logger.warn(`No recipient found for assignment ${a._id}; skipping notification`);
                    }
                } catch (e) {
                    this.logger.warn('Failed processing an expiring assignment', e);
                }
            }

            this.logger.log(`ShiftExpiryScheduler processed ${assignments.length} assignments, created ${notificationCount} notifications (next ${days} days)`);
        } catch (error) {
            this.logger.error('ShiftExpiryScheduler failed', error);
        }
    }

    /**
     * Automatically find all HR/Admin users in the system
     * No configuration required!
     */
    private async findHRUsers(): Promise<any[]> {
        try {
            if (!this.connection.db) {
                this.logger.warn('Database connection not available');
                return [];
            }

            const hrRoles = await this.connection.db.collection('employeesystemroles').find({
                roles: { $in: ['HR Manager', 'System Admin', 'HR Admin'] },
                isActive: true
            }).toArray();

            if (!hrRoles || hrRoles.length === 0) {
                return [];
            }

            // Get employee details for logging
            const employeeIds = hrRoles.map((r: any) => r.employeeProfileId);
            const employees = await this.connection.db.collection('employeeprofiles').find({
                _id: { $in: employeeIds },
                isActive: true
            }).toArray();

            return hrRoles.map((role: any) => {
                const emp: any = employees.find((e: any) => e._id.equals(role.employeeProfileId));
                return {
                    employeeProfileId: role.employeeProfileId,
                    roles: role.roles,
                    workEmail: emp?.workEmail,
                    isActive: emp?.isActive
                };
            }).filter(u => u.isActive); // Only active employees
        } catch (error) {
            this.logger.error('Failed to find HR users', error);
            return [];
        }
    }
}
