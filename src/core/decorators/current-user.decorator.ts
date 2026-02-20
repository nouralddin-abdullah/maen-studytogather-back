import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// extract the user payload from the guarded requests
// usage example: -> @CurrentUser() user:UserPayLoadInterface
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // if specific property is requested just return that one only
    return data ? user?.[data] : user;
  },
);
