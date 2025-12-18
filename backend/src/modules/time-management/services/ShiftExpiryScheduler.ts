// src/time-management/time-management/shift-expiry.scheduler.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { ShiftAssignment, ShiftAssignmentDocument } from '../models/shift-assignment.schema';
import { NotificationLog, NotificationLogDocument } from '../models/notification-log.schema';

/**
 * ShiftExpiryScheduler
 * Uses EXACT same logic as NotificationService.triggerShiftExpiryCheck()
 * - runs on app startup (OnModuleInit) to process any missed notifications
 * - runs daily at configured hour and creates NotificationLog entries for assignments that will expire within the configured window
 * - automatically finds HR/Admin users to notify (no HR_USER_ID required)
 * - notifies ALL HR users + employees
 * - prevents duplicate notifications by checking if notification already exists for an assignment
 */
@Injectable()
export class ShiftExpiryScheduler implements OnModuleInit {
    private readonly logger = new Logger(ShiftExpiryScheduler.name);
    private isRunning = false;
    private hasRunOnStartup = false;

    constructor(
        @InjectModel(ShiftAssignment.name) private readonly shiftAssignmentModel: Model<ShiftAssignmentDocument>,
        @InjectModel(NotificationLog.name) private readonly notificationModel: Model<NotificationLogDocument>,
        @InjectConnection() private readonly connection: Connection,
    ) {}

    /**
     * Run scheduler once when module initializes (on app startup)
     * This ensures notifications are created even if the server wasn't running at the scheduled cron time
     */
    async onModuleInit() {
        this.logger.log('[ShiftExpiryScheduler] Module initialized - running initial startup check');
        try {
            await this.executeShiftExpiryCheck('STARTUP');
            this.hasRunOnStartup = true;
            this.logger.log('[ShiftExpiryScheduler] Initial startup check completed successfully');
        } catch (error) {
            this.logger.error('[ShiftExpiryScheduler] Initial startup check failed', error);
        }
    }

    /**
     * Runs daily at configured hour.
     * CRON: default '0 10 * * *' (10:00 server time).
     * Uses EXACT same logic as NotificationService.triggerShiftExpiryCheck
     */
    @Cron('0 10 * * *')
    public async runDaily() {
        await this.executeShiftExpiryCheck('CRON');
    }

    /**
     * Core execution logic - reusable for both startup and cron jobs
     * Checks for expiring shift assignments and creates notifications
     * Prevents duplicates by checking if notification already exists
     */
    private async executeShiftExpiryCheck(trigger: 'STARTUP' | 'CRON') {
        // Prevent concurrent runs
        if (this.isRunning) {
            this.logger.warn(`[ShiftExpiryScheduler] Already running, skipping ${trigger} execution`);
            return;
        }

        this.isRunning = true;
        try {
            const days = Number(process.env.SHIFT_EXPIRY_NOTIFICATION_DAYS ?? 7);
            this.logger.log(`[ShiftExpiryScheduler][${trigger}] Starting - checking for assignments expiring in next ${days} days`);

            const now = new Date();
            const threshold = new Date();
            threshold.setDate(now.getDate() + days);
            threshold.setHours(23, 59, 59, 999);

            // Find assignments expiring within the specified days
            const assignments = await this.shiftAssignmentModel.find({
                endDate: { $exists: true, $lte: threshold, $gte: now },
                status: { $in: ['PENDING', 'APPROVED'] },
            }).lean();

            this.logger.log(`[ShiftExpiryScheduler][${trigger}] Found ${assignments?.length || 0} expiring assignments`);

            if (!assignments?.length) {
                this.logger.log(`[ShiftExpiryScheduler][${trigger}] No expiring assignments found - exiting`);
                return;
            }

            // Automatically find HR users
            const hrUsers = await this.findHRUsers();
            this.logger.log(`[ShiftExpiryScheduler][${trigger}] Found ${hrUsers?.length || 0} HR users`);

            const notificationsCreated: any[] = [];
            let createdCount = 0;
            let skippedCount = 0;

            for (const a of assignments) {
                try {
                    // IMPORTANT FIX: Check if notification already exists for this assignment (prevent duplicates)
                    const existingNotification = await this.notificationModel.findOne({
                        'metadata.assignmentId': a._id.toString(),
                        type: { $in: ['SHIFT_EXPIRY', 'SHIFT_EXPIRY_EMPLOYEE'] }
                    }).lean();

                    if (existingNotification) {
                        this.logger.debug(`[ShiftExpiryScheduler][${trigger}] Skipping shift expiry notification for assignment ${a._id} - already exists`);
                        skippedCount++;
                        continue;
                    }

                    const msg = `Shift assignment ${a._id} for employee ${a.employeeId} expires on ${a.endDate?.toISOString().slice(0,10)}. Please review for renewal or reassignment.`;

                    // Notify all HR users
                    for (const hrUser of hrUsers) {
                        const hrNotification = await this.notificationModel.create({
                            to: hrUser.employeeProfileId,
                            type: 'SHIFT_EXPIRY',
                            message: msg,
                            metadata: { assignmentId: a._id.toString() } // Track which assignment
                        } as any);
                        notificationsCreated.push(hrNotification);
                        createdCount++;
                        this.logger.log(`[ShiftExpiryScheduler][${trigger}] Created notification for HR user ${hrUser.employeeProfileId} - assignment ${a._id}`);
                    }

                    // Notify employee
                    if (a.employeeId) {
                        try {
                            const empNotification = await this.notificationModel.create({
                                to: a.employeeId,
                                type: 'SHIFT_EXPIRY_EMPLOYEE',
                                message: `Your shift assignment expires on ${a.endDate?.toISOString().slice(0,10)}. Please contact HR if renewal is needed.`,
                                metadata: { assignmentId: a._id.toString() } // Track which assignment
                            } as any);
                            notificationsCreated.push(empNotification);
                            createdCount++;
                            this.logger.log(`[ShiftExpiryScheduler][${trigger}] Created notification for employee ${a.employeeId} - assignment ${a._id}`);
                        } catch (e) {
                            this.logger.warn('Failed to create notification for employee', e);
                        }
                    }
                } catch (e) {
                    this.logger.error('Failed processing assignment', e);
                }
            }

            this.logger.log(`[ShiftExpiryScheduler][${trigger}] COMPLETED - Created: ${createdCount}, Skipped: ${skippedCount}, Total notifications: ${notificationsCreated.length}`);

        } catch (error) {
            this.logger.error(`[ShiftExpiryScheduler][${trigger}] failed`, error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Find ALL HR admins in the system from all possible sources
     * Searches multiple collection names and role storage patterns
     * Returns deduplicated list of all HR admins
     */
    private async findHRUsers(): Promise<any[]> {
        try {
            if (!this.connection.db) {
                this.logger.warn('Database connection not available');
                return [];
            }

            const HR_ROLE_CANDIDATES = [
                'HR Admin', 'HR Manager', 'HR', 'HR_ADMIN', 'HR_MANAGER',
                'HR_ADMINISTRATOR', 'HR Administrator', 'System Admin', 'SYSTEM_ADMIN',
                'Administrator', 'ADMINISTRATOR', 'admin', 'Admin'
            ];

            const allHRUsers: Map<string, any> = new Map(); // Use Map to deduplicate by ID

            // Strategy 1: Try embedded roles in employee profiles
            const profileCollections = ['employee_profiles', 'employeeprofiles', 'employee_profiles_v1'];
            for (const colName of profileCollections) {
                try {
                    this.logger.debug(`[findHRUsers] Searching embedded roles in collection: ${colName}`);
                    const probe = await this.connection.db.collection(colName).findOne({});
                    if (probe && Object.prototype.hasOwnProperty.call(probe, 'roles')) {
                        const directHr = await this.connection.db
                            .collection(colName)
                            .find({
                                roles: { $in: HR_ROLE_CANDIDATES },
                                $or: [
                                    { isActive: true },
                                    { status: 'ACTIVE' },
                                    { status: { $exists: false } }
                                ]
                            })
                            .project({ _id: 1, workEmail: 1, roles: 1, status: 1, isActive: 1 })
                            .toArray();

                        this.logger.debug(`[findHRUsers] Found ${directHr.length} HR users in ${colName}`);
                        directHr.forEach(e => {
                            const key = e._id.toString();
                            if (!allHRUsers.has(key)) {
                                allHRUsers.set(key, {
                                    employeeProfileId: e._id,
                                    roles: e.roles,
                                    workEmail: e.workEmail,
                                    isActive: e.status === 'ACTIVE' || e.isActive === true,
                                    source: 'embedded_roles'
                                });
                            }
                        });
                    }
                } catch (e) {
                    this.logger.debug(`[findHRUsers] Collection ${colName} search failed or doesn't exist`, e.message);
                }
            }

            // Strategy 2: Try external role collections
            const roleCollections = [
                'employee_system_roles', 'employeesystemroles', 'employee_systemroles',
                'employeeSystemRoles', 'system_roles', 'employee_roles', 'roles'
            ];
            for (const rc of roleCollections) {
                try {
                    this.logger.debug(`[findHRUsers] Searching role collection: ${rc}`);
                    const hrRoles = await this.connection.db.collection(rc).find({
                        $and: [
                            {
                                $or: [
                                    { roles: { $in: HR_ROLE_CANDIDATES } },
                                    { role: { $in: HR_ROLE_CANDIDATES } },
                                    { name: { $in: HR_ROLE_CANDIDATES } }
                                ]
                            },
                            {
                                $or: [
                                    { isActive: true },
                                    { active: true },
                                    { status: 'ACTIVE' }
                                ]
                            }
                        ]
                    }).toArray();

                    if (!hrRoles || hrRoles.length === 0) {
                        this.logger.debug(`[findHRUsers] No HR roles found in ${rc}`);
                        continue;
                    }

                    this.logger.debug(`[findHRUsers] Found ${hrRoles.length} HR role records in ${rc}`);

                    const employeeIds = Array.from(new Set(
                        hrRoles
                            .map((r: any) => r.employeeProfileId || r.employeeId || r.userId || r._id)
                            .filter(id => id)
                            .map(id => typeof id === 'string' ? new Types.ObjectId(id) : id)
                    ));

                    if (employeeIds.length === 0) continue;

                    const employees = await this.connection.db
                        .collection('employeeprofiles')
                        .find({
                            _id: { $in: employeeIds },
                            $or: [{ isActive: true }, { status: 'ACTIVE' }, { status: { $exists: false } }]
                        })
                        .project({ _id: 1, workEmail: 1, isActive: 1, status: 1 })
                        .toArray();

                    hrRoles.forEach((role: any) => {
                        const empId = role.employeeProfileId || role.employeeId || role.userId || role._id;
                        const emp = employees.find((e: any) => {
                            if (typeof empId === 'string') {
                                return e._id.toString() === empId;
                            }
                            return e._id.equals(empId);
                        });

                        if (emp) {
                            const key = emp._id.toString();
                            if (!allHRUsers.has(key)) {
                                allHRUsers.set(key, {
                                    employeeProfileId: emp._id,
                                    roles: role.roles || role.role || [role.name],
                                    workEmail: emp.workEmail,
                                    isActive: emp.status === 'ACTIVE' || emp.isActive === true,
                                    source: 'role_collection'
                                });
                            }
                        }
                    });
                } catch (e) {
                    this.logger.debug(`[findHRUsers] Role collection ${rc} search failed`, e.message);
                }
            }

            // Strategy 3: Search by specific role field values directly
            try {
                this.logger.debug('[findHRUsers] Searching by role field regex patterns');
                const profilesByRegex = await this.connection.db
                    .collection('employeeprofiles')
                    .find({
                        $and: [
                            {
                                $or: [
                                    { roles: { $regex: 'HR', $options: 'i' } },
                                    { roles: { $regex: 'Admin', $options: 'i' } },
                                    { role: { $regex: 'HR', $options: 'i' } },
                                    { role: { $regex: 'Admin', $options: 'i' } }
                                ]
                            },
                            {
                                $or: [
                                    { isActive: true },
                                    { status: 'ACTIVE' },
                                    { status: { $exists: false } }
                                ]
                            }
                        ]
                    })
                    .project({ _id: 1, workEmail: 1, roles: 1, role: 1, isActive: 1, status: 1 })
                    .toArray();

                this.logger.debug(`[findHRUsers] Found ${profilesByRegex.length} profiles with HR/Admin keywords`);
                profilesByRegex.forEach((emp: any) => {
                    const key = emp._id.toString();
                    if (!allHRUsers.has(key)) {
                        allHRUsers.set(key, {
                            employeeProfileId: emp._id,
                            roles: emp.roles || [emp.role],
                            workEmail: emp.workEmail,
                            isActive: emp.status === 'ACTIVE' || emp.isActive === true,
                            source: 'regex_search'
                        });
                    }
                });
            } catch (e) {
                this.logger.debug('[findHRUsers] Regex search failed', e.message);
            }

            const result = Array.from(allHRUsers.values()).filter(u => u && u.isActive);
            this.logger.log(`[findHRUsers] TOTAL HR users found across all sources: ${result.length}`);

            if (result.length === 0) {
                this.logger.warn('[findHRUsers] ⚠️ NO HR admins found in system - check database and role assignments');
            }

            return result;
        } catch (error) {
            this.logger.error('[findHRUsers] Failed to find HR users', error);
            return [];
        }
    }
}

