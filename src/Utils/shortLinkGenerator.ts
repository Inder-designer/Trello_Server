import { randomBytes } from 'crypto';
import Card from '../models/Board/Card';
import Board from '../models/Board/Board';

export const generateShortLink = async ({ cardId, boardId }: { cardId?: string; boardId?: string }) => {
    // Generate a 10-character alphanumeric string
    const shortLink = randomBytes(6).toString('base64url'); // base64url avoids `/` and `+`

    if (cardId) {
        await Card.findByIdAndUpdate(cardId, { shortLink });
    } else if (boardId) {
        await Board.findByIdAndUpdate(boardId, { shortLink });
    }

    return shortLink;
};
