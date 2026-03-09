import { SetMetadata } from '@nestjs/common';

export const SKIP_PROJECT_GUARD_KEY = 'skipProjectGuard';
export const SkipProjectGuard = () => SetMetadata(SKIP_PROJECT_GUARD_KEY, true);
