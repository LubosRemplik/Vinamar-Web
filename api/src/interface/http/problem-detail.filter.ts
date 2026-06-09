import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '../../domain/errors/domain-error';

@Catch()
export class ProblemDetailFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof DomainError) {
      this.send(res, exception.status, exception.type, exception.name, exception.message);
      return;
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      this.send(res, status, 'about:blank', exception.name, exception.message);
      return;
    }
    this.send(
      res,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'about:blank',
      'InternalServerError',
      'Unexpected error',
    );
  }

  private send(
    res: Response,
    status: number,
    type: string,
    title: string,
    detail: string,
  ): void {
    res
      .status(status)
      .contentType('application/problem+json')
      .json({ type, title, status, detail });
  }
}
