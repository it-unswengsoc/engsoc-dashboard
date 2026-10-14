import { Router } from 'express';
import {
  listRequests,
  getRequest,
  submitRequest,
  acceptRequest,
  updateRequestAssignees,
  rejectRequest,
  completeRequest,
  getRequestAttachment,
} from '../functions/requests';
import { verifyAuthToken, type AuthedRequest } from '../middleware/auth';
import { asyncHandler, created, ok, parseId } from '../lib/http';

/* The functions layer throws RequestNotFoundError / ForbiddenRequestError /
   RequestValidationError / RequestStatusConflictError, which the error
   middleware answers with 404 / 403 / 400 / 409. */
const router = Router();

router.use(verifyAuthToken);

/**
 * GET /requests
 * { incoming, mine, handles }: the requests the viewer handles (their
 * port's, for its directors/executives — see functions/request-types.ts),
 * the ones they submitted, and which request types they handle.
 */
router.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    ok(res, await listRequests(req.user.userId));
  }),
);

/**
 * GET /requests/:requestId
 * One request, for its requester, whoever handles its type, or its task's
 * assignees — 404 for anyone else.
 */
router.get(
  '/:requestId',
  asyncHandler(async (req: AuthedRequest, res) => {
    ok(res, await getRequest(req.user.userId, parseId(req.params.requestId, 'request')));
  }),
);

/**
 * POST /requests
 * Body: { requestType, formData, title?, attachments?: [{ fieldName, fileName, dataUri }] }.
 * Any signed-in member can submit; routing is decided by the request type.
 */
router.post(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    created(res, await submitRequest(req.user.userId, req.body ?? {}));
  }),
);

/**
 * POST /requests/:requestId/accept
 * Body: { assigneeIds, notes? }. Moves a pending request to in_progress and
 * creates its task for the assignees (not for a grievance).
 */
router.post(
  '/:requestId/accept',
  asyncHandler(async (req: AuthedRequest, res) => {
    ok(res, await acceptRequest(req.user.userId, parseId(req.params.requestId, 'request'), req.body ?? {}));
  }),
);

/**
 * PUT /requests/:requestId/assignees
 * Body: { assigneeIds }. Replaces who's on an in-progress request's task.
 */
router.put(
  '/:requestId/assignees',
  asyncHandler(async (req: AuthedRequest, res) => {
    ok(res, await updateRequestAssignees(req.user.userId, parseId(req.params.requestId, 'request'), req.body ?? {}));
  }),
);

/**
 * POST /requests/:requestId/reject
 * Body: { reason }. Rejects a pending or in-progress request.
 */
router.post(
  '/:requestId/reject',
  asyncHandler(async (req: AuthedRequest, res) => {
    ok(res, await rejectRequest(req.user.userId, parseId(req.params.requestId, 'request'), req.body ?? {}));
  }),
);

/**
 * POST /requests/:requestId/complete
 * Completes an in-progress request and its task.
 */
router.post(
  '/:requestId/complete',
  asyncHandler(async (req: AuthedRequest, res) => {
    ok(res, await completeRequest(req.user.userId, parseId(req.params.requestId, 'request')));
  }),
);

/**
 * GET /requests/:requestId/attachments/:attachmentId
 * The file itself (a reimbursement's receipt), for anyone who can see the
 * request. Sent as a download so a file never renders on this origin.
 */
router.get(
  '/:requestId/attachments/:attachmentId',
  asyncHandler(async (req: AuthedRequest, res) => {
    const attachment = await getRequestAttachment(
      req.user.userId,
      parseId(req.params.requestId, 'request'),
      parseId(req.params.attachmentId, 'attachment'),
    );
    res.set({
      'Content-Type': attachment.mimeType,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
      'Cache-Control': 'private, no-store',
    });
    res.status(200).send(attachment.data);
  }),
);

export default router;
