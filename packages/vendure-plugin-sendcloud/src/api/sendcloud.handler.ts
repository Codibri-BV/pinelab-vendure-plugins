import { FulfillmentHandler, LanguageCode, Logger } from '@vendure/core';
import { loggerCtx } from './constants';

export const sendcloudHandler = new FulfillmentHandler({
  code: 'sendcloud',
  description: [
    {
      languageCode: LanguageCode.en,
      value: 'Send order to SendCloud',
    },
  ],
  args: {},
  createFulfillment: async (ctx, orders, orderItems, args) => {
    const orderCodes = orders.map((o) => o.code);
    Logger.info(`Fulfilled orders ${orderCodes.join(',')}`, loggerCtx);
    return {
      method: `SendCloud - ${orderCodes.join(',')} `,
    };
  },
});
