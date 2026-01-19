import { Types } from "mongoose";
import { getIO } from "../config/socket";
import Board from "../models/Board/Board";

export function emitToWorkspace(
  workspaceId: string | Types.ObjectId,
  event: string,
  payload: any
): void {
  const io = getIO();
  io.to(`workspace:${workspaceId}`).emit(event, payload);
}

export async function emitToWorkspaceByBoard(
  boardId: string | Types.ObjectId,
  event: string,
  payload: any
): Promise<void> {
  const io = getIO();
  const board = await Board.findById(boardId).select("workspace");
  if (!board?.workspace) return;
  io.to(`workspace:${board.workspace}`).emit(event, payload);
}
