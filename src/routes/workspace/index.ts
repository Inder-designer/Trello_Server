import { Router } from 'express';
import { acceptWorkspaceInvitation, createWorkspace, createWorkspaceInvitation, deleteWorkspace, deleteWorkspaceInvitation, getWorkspace, getWorkspaceInvitations, getWorkspaceMembers, leaveWorkspace, removeWorkspaceMember, updateWorkspace, verifyWorkspaceInvitation } from '../../Controllers/Workspace/workspace.controller';
const router = Router();

router.post('/new', createWorkspace)
router.put('/:workspaceId', updateWorkspace)
router.get('/:workspaceId', getWorkspace)
router.delete('/:workspaceId', deleteWorkspace)
router.get('/:workspaceId/members', getWorkspaceMembers)
router.delete('/:workspaceId/leave', leaveWorkspace)
router.delete('/:workspaceId/remove-member', removeWorkspaceMember)

// invite routes to be added here
router.post('/:workspaceId/invitation', createWorkspaceInvitation);
router.get('/:workspaceId/invitation', getWorkspaceInvitations);
router.delete('/:workspaceId/invitation', deleteWorkspaceInvitation);
router.get('/:workspaceId/invitation/:token', verifyWorkspaceInvitation);
router.post('/:workspaceId/invitation/:token', acceptWorkspaceInvitation);

export default router;