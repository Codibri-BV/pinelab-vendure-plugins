import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { PaymentMethodQuote } from '@vendure/common/lib/generated-shop-types';
import {
  Allow,
  Ctx,
  ID,
  OrderService,
  PaymentMethodService,
  Permission,
  ProductService,
  RequestContext,
  UserInputError,
} from '@vendure/core';
import { Request } from 'express';
import {
  QueryPreviewStripeSubscriptionArgs,
  QueryPreviewStripeSubscriptionForProductArgs,
  StripeSubscription,
  StripeSubscriptionIntent,
} from './generated/graphql';
import { StripeSubscriptionService } from './stripe-subscription.service';

export type RequestWithRawBody = Request & { rawBody: any };

@Resolver()
export class ShopResolver {
  constructor(
    private stripeSubscriptionService: StripeSubscriptionService,
    private paymentMethodService: PaymentMethodService
  ) {}

  @Mutation()
  @Allow(Permission.Owner)
  async createStripeSubscriptionIntent(
    @Ctx() ctx: RequestContext
  ): Promise<StripeSubscriptionIntent> {
    return this.stripeSubscriptionService.createIntent(ctx);
  }

  @Query()
  async previewStripeSubscription(
    @Ctx() ctx: RequestContext,
    @Args()
    { productVariantId, customInputs }: QueryPreviewStripeSubscriptionArgs
  ): Promise<StripeSubscription> {
    return this.stripeSubscriptionService.previewSubscription(
      ctx,
      productVariantId,
      customInputs
    );
  }

  @Query()
  async previewStripeSubscriptionForProduct(
    @Ctx() ctx: RequestContext,
    @Args()
    { productId, customInputs }: QueryPreviewStripeSubscriptionForProductArgs
  ): Promise<StripeSubscription[]> {
    return this.stripeSubscriptionService.previewSubscriptionForProduct(
      ctx,
      productId,
      customInputs
    );
  }

  @ResolveField('stripeSubscriptionPublishableKey')
  @Resolver('PaymentMethodQuote')
  async stripeSubscriptionPublishableKey(
    @Ctx() ctx: RequestContext,
    @Parent() paymentMethodQuote: PaymentMethodQuote
  ): Promise<string | undefined> {
    const paymentMethod = await this.paymentMethodService.findOne(
      ctx,
      paymentMethodQuote.id
    );
    if (!paymentMethod) {
      throw new UserInputError(
        `No payment method with id '${paymentMethodQuote.id}' found. Unable to resolve field"stripeSubscriptionPublishableKey"`
      );
    }
    return paymentMethod.handler.args.find((a) => a.name === 'publishableKey')
      ?.value;
  }
}
