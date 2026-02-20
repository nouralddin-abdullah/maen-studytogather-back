import { SetMetadata } from '@nestjs/common';

// decorator to add metadata (public) to make the route public
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
