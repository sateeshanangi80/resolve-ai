import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.middleware.js";
import { ticketIdSchema } from "../validators/ticket.validator.js";
import { setupSchema, inviteSchema, acceptInviteSchema, peopleQuerySchema, userUpdateSchema } from "../validators/portal.validator.js";
import { setupStatusService, setupAdminService, listPeopleService, updatePersonService, createInviteService, acceptInviteService, dashboardService, safeUserFields } from "../services/portal.service.js";
import User from "../models/User.js";
import Invitation from "../models/Invitation.js";
import { AppError } from "../utils/AppError.js";
import type { z } from "zod";
import { hashToken } from "../utils/jwt.js";
import { rateLimit } from "../middleware/rateLimit.middleware.js";
export const publicPortalRoutes = Router();
publicPortalRoutes.use(rateLimit(30, 15 * 60000));
publicPortalRoutes.get("/setup", async (_req, res) => {
    res.json({ success: true, data: await setupStatusService() });
});
publicPortalRoutes.post("/setup", validateBody(setupSchema), async (req, res) => {
    res.status(201).json({ success: true, data: await setupAdminService(req.body) });
});
publicPortalRoutes.post("/invitations/accept", validateBody(acceptInviteSchema), async (req, res) => {
    res.status(201).json({ success: true, data: await acceptInviteService(req.body.token, req.body.password) });
});
publicPortalRoutes.post("/invitations/preview", validateBody(acceptInviteSchema.omit({ password: true })), async (req, res) => {
    const invitation = await Invitation.findOne({ tokenHash: hashToken(req.body.token), expiresAt: { $gt: new Date() } }).select("name email role expiresAt");
    if (!invitation)
        throw new AppError("This invitation is invalid, expired, or already used. Ask your administrator for a new link.", 400);
    res.json({ success: true, data: invitation });
});
export const workspaceRoutes = Router();
workspaceRoutes.use(authenticate);
workspaceRoutes.get("/dashboard", async (req, res) => {
    res.json({ success: true, data: await dashboardService(req.user!) });
});
workspaceRoutes.use(authorizeRoles("Admin"));
workspaceRoutes.get("/agents", async (_req, res) => {
    res.json({ success: true, data: await User.find({ role: "SupportAgent", isActive: true }).select(safeUserFields).sort({ name: 1 }) });
});
workspaceRoutes.get("/people", validateQuery(peopleQuerySchema), async (_req, res) => {
    const result = await listPeopleService(res.locals.validatedQuery as z.infer<typeof peopleQuerySchema>);
    res.json({ success: true, data: result.users, pagination: result.pagination });
});
workspaceRoutes.patch("/people/:id", validateParams(ticketIdSchema), validateBody(userUpdateSchema), async (req, res) => {
    const { id } = ticketIdSchema.parse(req.params);
    res.json({ success: true, data: await updatePersonService(id, req.body, req.user!.id) });
});
workspaceRoutes.get("/invitations", async (_req, res) => {
    res.json({ success: true, data: await Invitation.find({ expiresAt: { $gt: new Date() } }).select("name email role expiresAt createdAt").sort({ createdAt: -1 }) });
});
workspaceRoutes.post("/invitations", validateBody(inviteSchema), async (req, res) => {
    res.status(201).json({ success: true, data: await createInviteService(req.body, req.user!.id) });
});
workspaceRoutes.delete("/invitations/:id", validateParams(ticketIdSchema), async (req, res) => {
    const { id } = ticketIdSchema.parse(req.params);
    if (!await Invitation.findByIdAndDelete(id))
        throw new AppError("Invitation not found", 404);
    res.json({ success: true, message: "Invitation revoked" });
});
