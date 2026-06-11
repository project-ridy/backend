import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import type { GraphQLContext } from '../../common/context/graphql-context';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const gqlContext = GqlExecutionContext.create(context).getContext<GraphQLContext>();
    if (!gqlContext.currentUser) {
      throw new UnauthorizedException('인증이 필요합니다');
    }

    return true;
  }
}
