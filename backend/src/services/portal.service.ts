import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Types, type QueryFilter } from "mongoose";
import User, { type IUser } from "../models/User.js";
import Invitation from "../models/Invitation.js";
import SetupLock from "../models/SetupLock.js";
import RefreshSession from "../models/RefreshSession.js";
import Ticket from "../models/Ticket.js";
import { AppError } from "../utils/AppError.js";
import { hashToken } from "../utils/jwt.js";
import type { UserRole } from "../models/User.js";
import type { z } from "zod";
import type { setupSchema, inviteSchema, userUpdateSchema, peopleQuerySchema } from "../validators/portal.validator.js";
export const safeUserFields = "name email role isActive createdAt";
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export async function setupStatusService() {
    const hasAdmin = Boolean(await User.exists({ role: "Admin" }));
    return { hasAdmin, setupEnabled: !hasAdmin && (process.env.ADMIN_SETUP_KEY?.length ?? 0) >= 32 };
}
export async function setupAdminService(data: z.infer<typeof setupSchema>) {
    const configured = process.env.ADMIN_SETUP_KEY;
    const received = Buffer.from(data.setupKey);
    const expected = Buffer.from(configured || "");
    if (!configured || configured.length < 32 || received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
        throw new AppError("Setup is unavailable or the setup key is incorrect", 403);
    }
    try {
        await SetupLock.create({ _id: "initial-admin" });
    }
    catch (error) {
        if ((error as {
            code?: number;
        }).code === 11000)
            throw new AppError("Admin setup is already complete or in progress", 409);
        throw error;
    }
    let created = false;
    try {
        if (await User.exists({ role: "Admin" }))
            throw new AppError("An administrator already exists. Sign in to the admin portal.", 409);
        const existing = await User.findOne({ email: data.email }).select("+password");
        if (existing) {
            if (!existing.isActive || !await bcrypt.compare(data.password, existing.password)) {
                throw new AppError("This email is already registered. Enter its current password to activate administrator access.", 403);
            }
            const user = await User.findOneAndUpdate(
                { _id: existing._id, password: existing.password, isActive: true, role: { $ne: "Admin" } },
                { $set: { role: "Admin", name: data.name } },
                { new: true, runValidators: true },
            );
            if (!user) throw new AppError("The account changed during setup. Please try again.", 409);
            created = true;
            await RefreshSession.deleteMany({ userId: user._id });
            return { id: user._id, name: user.name, email: user.email, role: user.role };
        }
        const password = await bcrypt.hash(data.password, 12);
        const user = await User.create({ name: data.name, email: data.email, password, role: "Admin" });
        created = true;
        return { id: user._id, name: user.name, email: user.email, role: user.role };
    }
    finally {
        // Retain the lock after success; allow correction of validation/duplicate-email errors.
        if (!created)
            await SetupLock.deleteOne({ _id: "initial-admin" });
    }
}
export async function listPeopleService(query: z.infer<typeof peopleQuerySchema>) {
    const filter: QueryFilter<IUser> = {};
    if (query.role)
        filter.role = query.role;
    if (query.search) {
        const expression = { $regex: escapeRegex(query.search), $options: "i" };
        filter.$or = [{ name: expression }, { email: expression }];
    }
    const [users, total] = await Promise.all([
        User.find(filter).select(safeUserFields).sort({ createdAt: -1, _id: -1 }).skip((query.page - 1) * query.limit).limit(query.limit),
        User.countDocuments(filter),
    ]);
    const totalPages = Math.ceil(total / query.limit);
    return { users, pagination: { page: query.page, limit: query.limit, total, totalPages, hasNextPage: query.page < totalPages, hasPreviousPage: query.page > 1 } };
}
export async function updatePersonService(id: string, data: z.infer<typeof userUpdateSchema>, actorId: string) {
    if (id === actorId)
        throw new AppError("You cannot change your own access", 403);
    // Admin accounts are protected from role/activation changes, avoiding lockout races.
    const user = await User.findOneAndUpdate({ _id: id, role: { $ne: "Admin" } }, data, { new: true, runValidators: true }).select(safeUserFields);
    if (!user)
        throw new AppError("User not found or administrator account is protected", 404);
    await RefreshSession.deleteMany({ userId: user._id });
    return user;
}
export async function createInviteService(data: z.infer<typeof inviteSchema>, actorId: string) {
    if (await User.exists({ email: data.email }))
        throw new AppError("This email already has an account. Manage it in People.", 409);
    const token = crypto.randomBytes(32).toString("hex");
    // Reissuing invalidates the previous invitation, including links still in circulation.
    const invitation = await Invitation.findOneAndUpdate({ email: data.email }, {
        ...data, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 7 * 86400000), createdBy: actorId,
    }, { new: true, upsert: true, runValidators: true }).select("name email role expiresAt createdAt");
    return { invitation, token };
}
export async function acceptInviteService(token: string, password: string) {
    // Atomic consumption prevents accepting the same link twice across server instances.
    const invitation = await Invitation.findOneAndDelete({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } });
    if (!invitation)
        throw new AppError("This invitation is invalid, expired, or already used. Ask your administrator for a new link.", 400);
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ name: invitation.name, email: invitation.email, role: invitation.role, password: hashedPassword });
    return { name: user.name, email: user.email, role: user.role };
}
export async function dashboardService(user: {
    id: string;
    role: UserRole;
}) {
    const access = user.role === "Customer" ? { createdBy: new Types.ObjectId(user.id) } : user.role === "SupportAgent" ? { assignedTo: new Types.ObjectId(user.id) } : {};
    const [groups, recent, unassigned, members] = await Promise.all([
        Ticket.aggregate<{
            _id: string;
            count: number;
        }>([{ $match: access }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
        Ticket.find(access).sort({ updatedAt: -1, _id: -1 }).limit(5).populate("assignedTo", "name email"),
        user.role === "Admin" ? Ticket.countDocuments({ assignedTo: null }) : Promise.resolve(0),
        user.role === "Admin" ? User.countDocuments({ role: "SupportAgent", isActive: true }) : Promise.resolve(0),
    ]);
    const counts = { Open: 0, "In Progress": 0, Resolved: 0, Closed: 0 };
    for (const group of groups)
        if (group._id in counts)
            counts[group._id as keyof typeof counts] = group.count;
    return { counts, total: Object.values(counts).reduce((sum, n) => sum + n, 0), recent, unassigned, activeAgents: members };
}
