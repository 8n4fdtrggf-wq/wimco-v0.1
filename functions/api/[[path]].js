import { handle } from '../../lib/router.js';
import { cloudflarePlatform } from '../_platform.js';

export const onRequest = (context) => handle(context.request, context.env, cloudflarePlatform(context));
