import { Router, Request, Response } from 'express';
import {
  listRequests,
  submitRequest,
  acceptRequest,
  updateRequestAssignees,
  rejectRequest,
  completeRequest,
  getRequestAttachment,
  RequestNotFoundError,
  ForbiddenRequestError,
  RequestValidationError,
  RequestStatusConflictError,
} from '../functions/requests';
import { verifyAuthToken } from './auth';

const router = Router();

/* Every route below maps the same four errors the same way. */
function sendError(res: Response, error: unknown, context: string) {
  if (error instanceof RequestNotFoundError) return res.status(404).json({ status: 'error', message: error.message });
  if (error instanceof ForbiddenRequestError) return res.status(403).json({ status: 'error', message: error.message });
  if (error instanceof RequestValidationError) return res.status(400).json({ status: 'error', message: error.message });
  if (error instanceof RequestStatusConflictError) {
    return res.status(409).json({ status: 'error', message: error.message });
  }
  console.error(`${context} error:`, error);
  return res.status(500).json({ status: 'error', message: 'Internal server error' });
}

function parseId(value: string): number | null {
  const id = parseInt(value, 10);
  return isNaN(id) ? null : id;
}

/**
 * GET /requests
 * { incoming, mine, handles }: the requests the viewer handles (their
 * port's, for its directors/executives — see functions/request-types.ts),
 * the ones they submitted, and which request types they handle.
 */
router.get('/', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    res.status(200).json({ status: 'success', data: await listRequests(user.userId) });
  } catch (error) {
    sendError(res, error, 'List requests');
  }
});

/**
 * POST /requests
 * Body: { requestType, formData, title?, attachments?: [{ fieldName, fileName, dataUri }] }.
 * Any signed-in member can submit; routing is decided by the request type.
 */
router.post('/', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    res.status(201).json({ status: 'success', data: await submitRequest(user.userId, req.body ?? {}) });
  } catch (error) {
    sendError(res, error, 'Submit request');
  }
});

/**
 * POST /requests/:requestId/accept
 * Body: { assigneeIds, notes? }. Moves a pending request to in_progress and
 * creates its task for the assignees (not for a grievance).
 */
router.post('/:requestId/accept', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const requestId = parseId(req.params.requestId);
    if (requestId === null) return res.status(400).json({ status: 'error', message: 'Invalid request ID' });
    res.status(200).json({ status: 'success', data: await acceptRequest(user.userId, requestId, req.body ?? {}) });
  } catch (error) {
    sendError(res, error, 'Accept request');
  }
});

/**
 * PUT /requests/:requestId/assignees
 * Body: { assigneeIds }. Replaces who's on an in-progress request's task.
 */
router.put('/:requestId/assignees', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const requestId = parseId(req.params.requestId);
    if (requestId === null) return res.status(400).json({ status: 'error', message: 'Invalid request ID' });
    res.status(200).json({
      status: 'success',
      data: await updateRequestAssignees(user.userId, requestId, req.body ?? {}),
    });
  } catch (error) {
    sendError(res, error, 'Update request assignees');
  }
});

/**
 * POST /requests/:requestId/reject
 * Body: { reason }. Rejects a pending or in-progress request.
 */
router.post('/:requestId/reject', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const requestId = parseId(req.params.requestId);
    if (requestId === null) return res.status(400).json({ status: 'error', message: 'Invalid request ID' });
    res.status(200).json({ status: 'success', data: await rejectRequest(user.userId, requestId, req.body ?? {}) });
  } catch (error) {
    sendError(res, error, 'Reject request');
  }
});

/**
 * POST /requests/:requestId/complete
 * Completes an in-progress request and its task.
 */
router.post('/:requestId/complete', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const requestId = parseId(req.params.requestId);
    if (requestId === null) return res.status(400).json({ status: 'error', message: 'Invalid request ID' });
    res.status(200).json({ status: 'success', data: await completeRequest(user.userId, requestId) });
  } catch (error) {
    sendError(res, error, 'Complete request');
  }
});

/**
 * GET /requests/:requestId/attachments/:attachmentId
 * The file itself (a reimbursement's receipt), for anyone who can see the
 * request. Sent as a download so a file never renders on this origin.
 */
router.get('/:requestId/attachments/:attachmentId', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const requestId = parseId(req.params.requestId);
    const attachmentId = parseId(req.params.attachmentId);
    if (requestId === null || attachmentId === null) {
      return res.status(400).json({ status: 'error', message: 'Invalid ID' });
    }
    const attachment = await getRequestAttachment(user.userId, requestId, attachmentId);
    res.set({
      'Content-Type': attachment.mimeType,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
      'Cache-Control': 'private, no-store',
    });
    res.status(200).send(attachment.data);
  } catch (error) {
    sendError(res, error, 'Get request attachment');
  }
});

export default router;
