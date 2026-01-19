import { Router } from 'express';
import { acceptInvitation, createBoard, deleteBoard, getAllBoards, getBoard, inviteMember, updateBoard, leaveBoard, toggleBoardClosure, removeFromBoard } from '../../Controllers/Board/board.controller';
import { createList, deleteList, updateList } from '../../Controllers/Board/list.controller';
import { createCard, getCardById, getCards, moveCard, removeCard, updateCard } from '../../Controllers/Board/card.controller';
import { checkJoinRequestStatus, deleteInviteToken, generateInviteToken, joinBoardWithToken, requestToJoinBoard, respondToJoinRequest, verifyInviteToken } from '../../Controllers/Board/join.controller';
const router = Router();

// Board
router.post('/new', createBoard);
router.get('/all', getAllBoards);
router.patch('/:boardId', updateBoard);
router.get('/:boardId', getBoard);
router.delete('/:boardId', deleteBoard);
router.put('/:boardId', toggleBoardClosure)
router.post('/leave/:boardId', leaveBoard);
router.delete('/:boardId/remove-member', removeFromBoard)

// List
router.post('/add-list', createList);
router.patch('/update-list/:listId', updateList);
router.delete('/delete-list/:listId', deleteList);

// Card
router.post('/add-card', createCard);
router.patch('/update-card/:cardId', updateCard);
router.patch('/move-card/:cardId', moveCard);
router.delete('/delete-card/:cardId', removeCard);
router.get('/cards/:boardId', getCards);
router.get('/card/:cardId', getCardById);

router.post('/invite-member/:boardId', inviteMember);
router.post('/accept-invite/:boardId', acceptInvitation);

router.post('/generate-invite-token/:boardId', generateInviteToken);
router.post('/verify-invite-token', verifyInviteToken);
router.post('/join-with-token', joinBoardWithToken);
router.delete('/delete-invite-token/:boardId', deleteInviteToken);
router.post('/request-join', requestToJoinBoard);
router.get('/request-status/:boardId', checkJoinRequestStatus);
router.post('/request-join/:requestId', respondToJoinRequest);

export default router;