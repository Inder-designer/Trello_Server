import { Router } from 'express';
import { acceptInvitation, createBoard, deleteBoard, getAllBoards, getBoard, inviteMember, updateBoard, generateInviteToken, joinBoardWithToken, deleteInviteToken, verifyInviteToken, requestToJoinBoard, checkJoinRequestStatus } from '../../Controllers/Board/board.controller';
import { createList, deleteList, updateList } from '../../Controllers/Board/list.controller';
import { createCard, getCardById, getCards, moveCard, removeCard, updateCard } from '../../Controllers/Board/card.controller';
const router = Router();

// Board
router.post('/new', createBoard);
router.get('/all', getAllBoards);
router.patch('/:boardId', updateBoard);
router.get('/:boardId', getBoard);
router.delete('/:boardId', deleteBoard);

router.post('/add-list', createList);
router.patch('/update-list/:listId', updateList);
router.delete('/delete-list/:listId', deleteList);

router.post('/add-card', createCard);
router.patch('/update-card/:cardId', updateCard);
router.patch('/move-card/:cardId', moveCard);
router.delete('/delete-card/:cardId', removeCard);
router.get('/cards/:boardId', getCards);
router.get('/card/:cardId', getCardById);

router.post('/invite-member/:boardId', inviteMember);
router.post('/accept-invite/:boardId', acceptInvitation);

router.post('/generate-invite-token/:boardId', generateInviteToken);
router.post('/join-with-token', joinBoardWithToken);
router.delete('/delete-invite-token/:boardId', deleteInviteToken);
router.post('/verify-invite-token', verifyInviteToken);
router.post('/request-join', requestToJoinBoard);
router.get('/request-status/:boardId', checkJoinRequestStatus);

export default router;