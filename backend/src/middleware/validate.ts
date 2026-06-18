import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from '../utils/errors';

type Schemas = { body?: AnyZodObject; query?: AnyZodObject; params?: AnyZodObject };

export const validate =
  (schemas: Schemas) =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query) as any;
      if (schemas.params) req.params = schemas.params.parse(req.params) as any;
      next();
    } catch (e) {
      if (e instanceof ZodError) {
        return next(ApiError.badRequest('Ошибка валидации', e.flatten()));
      }
      next(e);
    }
  };
