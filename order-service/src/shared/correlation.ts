import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';


export function correlationId(req: Request & { correlationId?: string }, res: Response, next: NextFunction) {
  const incoming = req.header('x-correlation-id');
  const cid = incoming || randomUUID();

  req.correlationId = cid;
  res.setHeader('x-correlation-id', cid);
  next();
}
