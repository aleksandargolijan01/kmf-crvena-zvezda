import { ArgumentsHost, CallHandler, Catch, ExceptionFilter, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common';
import { Response } from 'express';
import { shopMessages } from './shop-errors';
@Catch()
export class ShopExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = error instanceof HttpException ? error.getStatus() : 503;
    const body = error instanceof HttpException ? error.getResponse() : null;
    const safe = typeof body === 'object' && body && 'code' in body ? body : { code: status === 429 ? 'RATE_LIMITED' : status === 503 ? 'SHOP_NOT_CONFIGURED' : 'INVALID_INPUT', message: status === 429 ? 'Превише покушаја. Сачекајте минут и покушајте поново.' : status === 503 ? shopMessages.SHOP_NOT_CONFIGURED : shopMessages.INVALID_INPUT };
    response.setHeader('Cache-Control', 'no-store');
    response.status(status).json(safe);
  }
}
@Injectable()
export class ShopNoStoreInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) { context.switchToHttp().getResponse<Response>().setHeader('Cache-Control', 'no-store'); return next.handle(); }
}
