import { withBotId } from 'botid/next/config';

// BotID (Vercel's invisible bot protection) needs its proxy routes wired in here.
export default withBotId({});
